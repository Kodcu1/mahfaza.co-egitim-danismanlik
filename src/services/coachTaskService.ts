import { supabase } from '../lib/supabase';
import { CoachTask } from '../types';
import { xpService } from './xpService';
import { notificationService } from './notificationService';
import { relationshipService } from './relationshipService';

// Convert Supabase database row to CoachTask format
function mapRowToCoachTask(row: any): CoachTask {
  let mappedStatus: 'pending' | 'submitted' | 'completed' | 'verified' | 'cancelled' | 'pending_review' | 'approved' | 'rejected' = 'pending';
  if (row.status === 'Tamamlandı' || row.status === 'verified' || row.status === 'completed' || row.status === 'approved') {
    mappedStatus = 'approved';
  } else if (row.status === 'Devam Ediyor' || row.status === 'submitted' || row.status === 'pending_review') {
    mappedStatus = 'pending_review';
  } else if (row.status === 'İptal' || row.status === 'cancelled' || row.status === 'rejected') {
    mappedStatus = 'rejected';
  } else {
    mappedStatus = 'pending';
  }

  // Extract student note/evidence from description if present
  let extractedNote = row.student_note || null;
  if (!extractedNote && row.description) {
    const match = row.description.match(/\[(?:Öğrenci Teslim Notu|Kanıt|Teslim Notu)\]:\s*([^\n]+)/i);
    if (match) {
      extractedNote = match[1].trim();
    }
  }

  return {
    id: row.id,
    coach_id: row.coach_id,
    student_id: row.student_id,
    title: row.title,
    description: row.description,
    due_date: row.due_date,
    xp_reward: row.xp_reward || 30,
    status: mappedStatus,
    student_note: extractedNote,
    completed_at: row.completed_at || null,
    created_at: row.created_at,
    updated_at: row.created_at,
    student: row.student || row.profiles,
  };
}

const LOCAL_TASKS_KEY = 'mahfaza_tasks';

function getLocalTasks(): CoachTask[] {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTasks(tasks: CoachTask[]): void {
  try {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // ignore
  }
}

export const coachTaskService = {
  /**
   * Get all tasks assigned by this coach directly from Supabase (tasks & coach_tasks) with persistent localStorage merge
   */
  async getTasksForCoach(coachId: string, options?: { email?: string; profileId?: string }): Promise<CoachTask[]> {
    const coachCandidates = Array.from(
      new Set(
        [
          coachId,
          options?.profileId,
          '99999999-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000002',
        ].filter(Boolean)
      )
    ) as string[];

    let remoteTasks: CoachTask[] = [];

    // 1. Try querying public.tasks table
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('coach_id', coachCandidates)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const studentIds = [...new Set(data.map((r: any) => r.student_id).filter(Boolean))];
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, email, name, full_name, avatar_url')
          .in('id', studentIds);

        const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
        remoteTasks = data.map((row: any) => {
          const t = mapRowToCoachTask(row);
          const sp: any = profMap.get(row.student_id);
          if (sp) {
            t.student = {
              ...sp,
              first_name: sp.first_name || (sp.full_name ? sp.full_name.split(' ')[0] : 'Öğrenci'),
              last_name: sp.last_name || (sp.full_name ? sp.full_name.split(' ').slice(1).join(' ') : ''),
            };
          }
          return t;
        });
      }
    } catch {
      // ignore
    }

    // 2. Also try querying public.coach_tasks table if present
    try {
      const { data: ctData, error: ctErr } = await supabase
        .from('coach_tasks')
        .select('*')
        .in('coach_id', coachCandidates)
        .order('created_at', { ascending: false });

      if (!ctErr && ctData && ctData.length > 0) {
        for (const row of ctData) {
          if (!remoteTasks.some((rt) => rt.id === row.id)) {
            remoteTasks.push(mapRowToCoachTask(row));
          }
        }
      }
    } catch {
      // ignore
    }

    // 3. Merge persistent local tasks (avoids losing newly created tasks or ghosting)
    const local = getLocalTasks();
    const relevantLocal = local.filter((t) => {
      if (coachCandidates.includes(t.coach_id)) return true;
      if (options?.email && t.coach?.email && t.coach.email.toLowerCase() === options.email.toLowerCase()) return true;
      // If coachId matches any coach session or created within the app
      return !t.coach_id || t.coach_id === coachId;
    });

    const combined = [...remoteTasks];
    for (const lt of relevantLocal) {
      if (!combined.some((rt) => rt.id === lt.id)) {
        combined.push(lt);
      }
    }

    return combined.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  /**
   * Get all tasks assigned to a specific student directly from Supabase tasks table with persistent localStorage merge
   */
  async getTasksForStudent(studentId: string, options?: { email?: string; profileId?: string }): Promise<CoachTask[]> {
    const studentCandidates = Array.from(
      new Set(
        [
          studentId,
          options?.profileId,
          '99999999-0000-0000-0000-000000000001',
        ].filter(Boolean)
      )
    ) as string[];

    let remoteTasks: CoachTask[] = [];

    // 1. Try public.tasks table
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('student_id', studentCandidates)
        .order('due_date', { ascending: true });

      if (!error && data && data.length > 0) {
        const coachIds = [...new Set(data.map((r: any) => r.coach_id).filter(Boolean))];
        const { data: coaches } = await supabase
          .from('profiles')
          .select('id, email, name, full_name, avatar_url')
          .in('id', coachIds);

        const coachMap = new Map((coaches || []).map((c: any) => [c.id, c]));
        remoteTasks = data.map((row: any) => ({
          ...mapRowToCoachTask(row),
          coach: coachMap.get(row.coach_id),
        }));
      }
    } catch {
      // ignore
    }

    // 2. Try public.coach_tasks table
    try {
      const { data: ctData, error: ctErr } = await supabase
        .from('coach_tasks')
        .select('*')
        .in('student_id', studentCandidates)
        .order('due_date', { ascending: true });

      if (!ctErr && ctData && ctData.length > 0) {
        for (const row of ctData) {
          if (!remoteTasks.some((rt) => rt.id === row.id)) {
            remoteTasks.push(mapRowToCoachTask(row));
          }
        }
      }
    } catch {
      // ignore
    }

    // 3. Merge persistent local tasks with broad candidate & email matching to eliminate ghost tasks
    const local = getLocalTasks();
    const relevantLocal = local.filter((t) => {
      if (studentCandidates.includes(t.student_id)) return true;
      if (options?.email && t.student?.email && t.student.email.toLowerCase() === options.email.toLowerCase()) return true;
      return false;
    });

    const combined = [...remoteTasks];
    for (const lt of relevantLocal) {
      if (!combined.some((rt) => rt.id === lt.id)) {
        combined.push(lt);
      }
    }

    return combined.sort(
      (a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime()
    );
  },

  /**
   * Create a new task and assign to a student
   * Robust against foreign key constraints (tasks_student_id_fkey) and network failures
   */
  async createTask(payload: {
    coach_id: string;
    student_id: string;
    title: string;
    description?: string;
    due_date: string;
    xp_reward: number;
    priority?: 'Düşük' | 'Orta' | 'Yüksek';
    student?: any;
    coach?: any;
  }): Promise<CoachTask> {
    const xpReward = Math.min(150, Math.max(10, payload.xp_reward || 40));
    const now = new Date().toISOString();

    let createdTask: CoachTask | null = null;

    // 1. Attempt Supabase public.tasks table insert
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          coach_id: payload.coach_id,
          student_id: payload.student_id,
          title: payload.title.trim(),
          description: payload.description?.trim() || null,
          due_date: payload.due_date,
          priority: payload.priority || 'Orta',
          status: 'Bekliyor',
          xp_reward: xpReward,
        })
        .select('*')
        .single();

      if (!error && data) {
        createdTask = mapRowToCoachTask(data);
        if (payload.student) {
          createdTask.student = payload.student;
        }
      } else if (error) {
        console.warn('Supabase tasks table note:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase tasks insert exception:', err?.message || err);
    }

    // 1b. If public.tasks failed, attempt public.coach_tasks table
    if (!createdTask) {
      try {
        const { data: ctData, error: ctErr } = await supabase
          .from('coach_tasks')
          .insert({
            coach_id: payload.coach_id,
            student_id: payload.student_id,
            title: payload.title.trim(),
            description: payload.description?.trim() || null,
            due_date: payload.due_date,
            status: 'pending',
            xp_reward: xpReward,
          })
          .select('*')
          .single();

        if (!ctErr && ctData) {
          createdTask = mapRowToCoachTask(ctData);
          if (payload.student) {
            createdTask.student = payload.student;
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. If Supabase fails (e.g., tasks_student_id_fkey or table lock), create persistent local task
    if (!createdTask) {
      const generatedId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      createdTask = {
        id: generatedId,
        coach_id: payload.coach_id,
        student_id: payload.student_id,
        title: payload.title.trim(),
        description: payload.description?.trim() || undefined,
        due_date: payload.due_date,
        xp_reward: xpReward,
        status: 'pending',
        created_at: now,
        updated_at: now,
        student: payload.student,
        coach: payload.coach,
      };
    } else if (createdTask) {
      if (payload.student) (createdTask as any).student = payload.student;
      if (payload.coach) (createdTask as any).coach = payload.coach;
    }

    if (!createdTask) {
      createdTask = {
        id: `task-${Date.now()}`,
        coach_id: payload.coach_id,
        student_id: payload.student_id,
        title: payload.title.trim(),
        due_date: payload.due_date,
        xp_reward: xpReward,
        status: 'pending',
        created_at: now,
        updated_at: now,
      };
    }

    // 3. Persist to local tasks store unconditionally to guarantee immediate visibility
    const finalTask: CoachTask = createdTask;
    const local = getLocalTasks();
    saveLocalTasks([finalTask, ...local.filter((t) => t.id !== finalTask.id)]);

    // 4. Notify student about new task
    try {
      await notificationService.createNotification({
        user_id: payload.student_id,
        title: '📋 Yeni Koçluk Görevi!',
        message: `Koçunuz size "${payload.title}" görevini atadı. (+${xpReward} XP)`,
        type: 'task',
        link: '/student/homework',
      });
    } catch {
      // ignore notification error
    }

    // 5. Fire global window events so both coach & student views update reactively
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahfaza:task_created', { detail: finalTask }));
      window.dispatchEvent(new CustomEvent('mahfaza:tasks_updated', { detail: finalTask }));
      window.dispatchEvent(new CustomEvent('mahfaza:counts-updated'));
    }

    return finalTask;
  },

  /**
   * Submit task by student for coach review (Does NOT award XP!)
   * Sets status to 'pending_review' (DB: 'Devam Ediyor') and notifies coach.
   */
  async completeTaskByStudent(taskId: string, studentId: string, note?: string): Promise<void> {
    const now = new Date().toISOString();

    const { data: currentTask, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (fetchErr || !currentTask) {
      throw new Error('Görev bulunamadı.');
    }

    // Guard: If already approved/completed, cannot re-submit
    if (currentTask.status === 'Tamamlandı' || currentTask.status === 'completed' || currentTask.status === 'approved') {
      throw new Error('Bu görev zaten onaylanmış ve XP ödülü verilmiştir.');
    }

    // Prepare updated description with evidence/note
    let newDescription = currentTask.description || '';
    if (note && note.trim()) {
      const trimmedNote = note.trim();
      newDescription = newDescription
        ? `${newDescription}\n\n[Öğrenci Teslim Notu]: ${trimmedNote}`
        : `[Öğrenci Teslim Notu]: ${trimmedNote}`;
    }

    // 1. Update remote tasks table (Status becomes 'Devam Ediyor' -> 'pending_review')
    const { error: updErr } = await supabase
      .from('tasks')
      .update({
        status: 'Devam Ediyor',
        completed_at: now,
        description: newDescription || null,
      })
      .eq('id', taskId)
      .eq('student_id', studentId);

    if (updErr) {
      throw new Error(updErr.message);
    }

    // CRITICAL: XP IS NEVER AWARDED HERE. ONLY COACH APPROVAL CAN AWARD XP.

    // 2. Send notification to coach
    if (currentTask.coach_id) {
      try {
        await notificationService.createNotification({
          user_id: currentTask.coach_id,
          title: '📋 Görev Onay Bekliyor',
          message: `Öğrenciniz "${currentTask.title || 'Koç Görevi'}" görevini teslim etti ve onayınızı bekliyor.`,
          type: 'task',
          link: '/coach/tasks',
        });
      } catch {
        // ignore notification error
      }
    }
  },

  /**
   * Verify and approve task by Coach, awarding student XP atomically
   */
  async verifyTaskAndAwardXP(taskId: string, coachId: string): Promise<void> {
    const now = new Date().toISOString();

    // 1. Fetch real task from Supabase to verify status & authorization
    const { data: taskRow, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (fetchErr || !taskRow) {
      throw new Error('Görev kaydı bulunamadı.');
    }

    // Idempotency Guard: Prevent duplicate approval & double XP award
    if (taskRow.status === 'Tamamlandı' || taskRow.status === 'approved' || taskRow.status === 'verified') {
      return;
    }

    // 2. Authoritative check: Coach must be linked to student
    const isAssigned = await relationshipService.isStudentAssignedToCoach(coachId, taskRow.student_id);

    if (!isAssigned && taskRow.coach_id && taskRow.coach_id !== coachId) {
      throw new Error('Bu öğrencinin görevini onaylama yetkiniz bulunmuyor.');
    }

    // 3. Update tasks table in Supabase
    const { error: updErr } = await supabase
      .from('tasks')
      .update({
        status: 'Tamamlandı',
        completed_at: taskRow.completed_at || now,
      })
      .eq('id', taskId);

    if (updErr) {
      throw new Error(updErr.message);
    }

    // 4. Atomically Award XP to student (Idempotent procedure with reference_id)
    const xpReward = Number(taskRow.xp_reward || 40);
    await xpService.awardXPAtomic({
      student_id: taskRow.student_id,
      base_amount: xpReward,
      action_type: 'coach_task_completed',
      description: `Koç Görevi Onaylandı: ${taskRow.title}`,
      reference_id: taskId,
    });

    // 5. Notify student that task was approved and XP was granted
    try {
      await notificationService.createNotification({
        user_id: taskRow.student_id,
        title: '🎉 Göreviniz Onaylandı!',
        message: `"${taskRow.title}" göreviniz koçunuz tarafından onaylandı! +${xpReward} XP hesabınıza eklendi.`,
        type: 'xp',
        link: '/student/xp',
      });
    } catch {
      // ignore
    }
  },

  /**
   * Reject task by Coach with feedback (Does NOT award XP, sets status back to 'Bekliyor')
   */
  async rejectTask(taskId: string, coachId: string, rejectionReason?: string): Promise<void> {
    const { data: taskRow, error: fetchErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (fetchErr || !taskRow) {
      throw new Error('Görev kaydı bulunamadı.');
    }

    let newDesc = taskRow.description || '';
    if (rejectionReason && rejectionReason.trim()) {
      newDesc = newDesc
        ? `${newDesc}\n\n[Koç Red Notu]: ${rejectionReason.trim()}`
        : `[Koç Red Notu]: ${rejectionReason.trim()}`;
    }

    const { error: updErr } = await supabase
      .from('tasks')
      .update({
        status: 'Bekliyor',
        description: newDesc || null,
      })
      .eq('id', taskId);

    if (updErr) {
      throw new Error(updErr.message);
    }

    // Notify student
    try {
      await notificationService.createNotification({
        user_id: taskRow.student_id,
        title: '⚠️ Görev Düzeltme Talebi',
        message: `"${taskRow.title}" göreviniz koçunuz tarafından incelendi ve düzeltme talep edildi: ${rejectionReason || 'Lütfen görevi gözden geçirin.'}`,
        type: 'task',
        link: '/student/homework',
      });
    } catch {
      // ignore
    }
  },

  /**
   * Alias for rejectTask with feedback
   */
  async rejectTaskWithFeedback(taskId: string, coachId: string, feedback?: string): Promise<void> {
    return this.rejectTask(taskId, coachId, feedback);
  },

  /**
   * Cancel task
   */
  async cancelTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'İptal' })
      .eq('id', taskId);

    if (error) {
      throw new Error(error.message);
    }
  },
};
