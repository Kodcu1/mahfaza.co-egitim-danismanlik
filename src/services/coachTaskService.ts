import { supabase } from '../lib/supabase';
import { CoachTask } from '../types';
import { xpService } from './xpService';
import { notificationService } from './notificationService';

const LOCAL_TASKS_KEY = 'mahfaza_coach_tasks';

function getStoredTasks(): CoachTask[] {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredTasks(tasks: CoachTask[]) {
  try {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // ignore
  }
}

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
    updated_at: row.updated_at || row.created_at,
    student: row.student || row.profiles,
  };
}

export const coachTaskService = {
  /**
   * Get all tasks assigned by this coach
   */
  async getTasksForCoach(coachId: string): Promise<CoachTask[]> {
    let tasks: CoachTask[] = [];

    try {
      // 1. Try real Supabase tasks table
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const studentIds = [...new Set(data.map((r: any) => r.student_id).filter(Boolean))];
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, name, full_name, avatar_url')
          .in('id', studentIds);

        const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
        tasks = data.map((row: any) => {
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
      } else if (!error && data) {
        tasks = [];
      }
    } catch {
      // Table fallback handled below
    }

    // Merge with local persistent storage
    const stored = getStoredTasks().filter((t) => t.coach_id === coachId);
    const existingIds = new Set(tasks.map((t) => t.id));
    for (const st of stored) {
      if (!existingIds.has(st.id)) {
        tasks.push(st);
      }
    }

    return tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Get all tasks assigned to a specific student (for Student 'Ödevlerim & Görevler' view)
   */
  async getTasksForStudent(studentId: string): Promise<CoachTask[]> {
    let tasks: CoachTask[] = [];

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('student_id', studentId)
        .order('due_date', { ascending: true });

      if (!error && data && data.length > 0) {
        const coachIds = [...new Set(data.map((r: any) => r.coach_id).filter(Boolean))];
        const { data: coaches } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, name, full_name, avatar_url')
          .in('id', coachIds);

        const coachMap = new Map((coaches || []).map((c: any) => [c.id, c]));
        tasks = data.map((row: any) => ({
          ...mapRowToCoachTask(row),
          coach: coachMap.get(row.coach_id),
        }));
      } else if (!error && data) {
        tasks = [];
      }
    } catch {
      // Fallback to local
    }

    // Merge with local persistent storage for this student
    const stored = getStoredTasks().filter((t) => t.student_id === studentId);
    const existingIds = new Set(tasks.map((t) => t.id));
    for (const st of stored) {
      if (!existingIds.has(st.id)) {
        tasks.push(st);
      }
    }

    return tasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  },

  /**
   * Create a new task and assign to a student
   */
  async createTask(payload: {
    coach_id: string;
    student_id: string;
    title: string;
    description?: string;
    due_date: string;
    xp_reward: number;
    student?: any;
    priority?: 'Düşük' | 'Orta' | 'Yüksek';
  }): Promise<CoachTask> {
    const xpReward = Math.min(150, Math.max(10, payload.xp_reward || 40));
    const newTask: CoachTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      coach_id: payload.coach_id,
      student_id: payload.student_id,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      due_date: payload.due_date,
      xp_reward: xpReward,
      status: 'pending',
      student_note: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      student: payload.student,
    };

    // Real Supabase insert into tasks table
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          coach_id: newTask.coach_id,
          student_id: newTask.student_id,
          title: newTask.title,
          description: newTask.description,
          due_date: newTask.due_date,
          priority: payload.priority || 'Orta',
          status: 'Bekliyor',
          xp_reward: newTask.xp_reward,
        })
        .select('*')
        .single();

      if (!error && data) {
        newTask.id = data.id;
      }
    } catch {
      // Fallback persistence handled below
    }

    // Persist in local storage
    const all = getStoredTasks();
    all.unshift(newTask);
    saveStoredTasks(all);

    // Notify student about new task
    try {
      await notificationService.createNotification({
        user_id: payload.student_id,
        title: '📋 Yeni Koçluk Görevi!',
        message: `Koçunuz size "${payload.title}" görevini atadı. (+${xpReward} XP)`,
        type: 'task',
        link: '/student/homework',
      });
    } catch {
      // ignore
    }

    return newTask;
  },

  /**
   * Submit task by student for coach review (Does NOT award XP!)
   * Sets status to 'pending_review' (DB: 'Devam Ediyor') and notifies coach.
   */
  async completeTaskByStudent(taskId: string, studentId: string, note?: string): Promise<void> {
    const now = new Date().toISOString();
    let taskTitle = 'Koç Görevi';
    let coachId: string | null = null;
    let currentTask: any = null;

    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      currentTask = data;
      if (currentTask) {
        // Guard: If already approved/completed, cannot re-submit
        if (currentTask.status === 'Tamamlandı' || currentTask.status === 'completed' || currentTask.status === 'approved') {
          throw new Error('Bu görev zaten onaylanmış ve XP ödülü verilmiştir.');
        }
        taskTitle = currentTask.title || 'Koç Görevi';
        coachId = currentTask.coach_id || null;
      }
    } catch (err: any) {
      if (err.message && err.message.includes('zaten onaylanmış')) throw err;
    }

    // Prepare updated description if student entered evidence/note
    let newDescription = currentTask?.description || null;
    if (note && note.trim()) {
      const trimmedNote = note.trim();
      const existing = (currentTask?.description || '').trim();
      newDescription = existing
        ? `${existing}\n\n[Öğrenci Teslim Notu]: ${trimmedNote}`
        : `[Öğrenci Teslim Notu]: ${trimmedNote}`;
    }

    // 1. Update remote tasks table (Status becomes 'Devam Ediyor' -> 'pending_review' in UI)
    try {
      const updatePayload: any = {
        status: 'Devam Ediyor',
        completed_at: now,
      };
      if (newDescription !== null) {
        updatePayload.description = newDescription;
      }

      await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', taskId)
        .eq('student_id', studentId);
    } catch {
      // ignore
    }

    // 2. Update local state
    const all = getStoredTasks();
    const taskIndex = all.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
      all[taskIndex].status = 'pending_review';
      all[taskIndex].completed_at = now;
      if (note) all[taskIndex].student_note = note.trim();
      if (newDescription) all[taskIndex].description = newDescription;
      saveStoredTasks(all);
    }

    // CRITICAL: XP IS NEVER AWARDED HERE. ONLY COACH APPROVAL CAN AWARD XP.

    // 3. Send notification to coach if assigned
    if (coachId) {
      try {
        await notificationService.createNotification({
          user_id: coachId,
          title: '📋 Görev Onay Bekliyor',
          message: `Öğrenciniz "${taskTitle}" görevini teslim etti ve onayınızı bekliyor.`,
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
    let taskRow: any = null;
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();
      taskRow = data;
    } catch {
      // fallback handled below
    }

    const all = getStoredTasks();
    const localIndex = all.findIndex((t) => t.id === taskId);
    const localTask = localIndex !== -1 ? all[localIndex] : null;

    const studentId = taskRow?.student_id || localTask?.student_id;
    const taskTitle = taskRow?.title || localTask?.title || 'Koç Görevi';
    const xpReward = Number(taskRow?.xp_reward || localTask?.xp_reward || 40);
    const currentStatus = taskRow?.status || localTask?.status;

    if (!studentId) {
      throw new Error('Görev kaydı bulunamadı.');
    }

    // Idempotency Guard: Prevent duplicate approval & double XP award
    if (currentStatus === 'Tamamlandı' || currentStatus === 'approved' || currentStatus === 'verified') {
      console.warn('Görev zaten onaylanmış, mükerrer işlem engellendi.');
      return;
    }

    // 2. Authoritative check: Coach must be linked to student
    try {
      const { data: link } = await supabase
        .from('coach_student_links')
        .select('id')
        .eq('coach_id', coachId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (!link && taskRow?.coach_id && taskRow.coach_id !== coachId) {
        throw new Error('Bu öğrencinin görevini onaylama yetkiniz bulunmuyor.');
      }
    } catch (authErr: any) {
      if (authErr.message && authErr.message.includes('yetkiniz')) throw authErr;
    }

    // 3. Update remote tasks table in Supabase
    try {
      await supabase
        .from('tasks')
        .update({
          status: 'Tamamlandı',
          completed_at: taskRow?.completed_at || now,
        })
        .eq('id', taskId);
    } catch (updErr) {
      console.warn('Remote task update note:', updErr);
    }

    // 4. Update local state
    if (localTask) {
      localTask.status = 'approved';
      localTask.completed_at = localTask.completed_at || now;
      localTask.updated_at = now;
      saveStoredTasks(all);
    }

    // 5. Atomically Award XP to student (Idempotent procedure with reference_id)
    try {
      await xpService.awardXPAtomic({
        student_id: studentId,
        base_amount: xpReward,
        action_type: 'coach_task_completed',
        description: `Koç Görevi Onaylandı: ${taskTitle}`,
        reference_id: taskId,
      });
    } catch (err: any) {
      console.warn('XP award execution note:', err);
    }

    // 6. Notify student that task was approved and XP was granted
    try {
      await notificationService.createNotification({
        user_id: studentId,
        title: '🎉 Göreviniz Onaylandı!',
        message: `"${taskTitle}" göreviniz koçunuz tarafından onaylandı! +${xpReward} XP hesabınıza eklendi.`,
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
    const now = new Date().toISOString();

    let taskRow: any = null;
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();
      taskRow = data;
    } catch {
      // ignore
    }

    const all = getStoredTasks();
    const localIndex = all.findIndex((t) => t.id === taskId);
    const localTask = localIndex !== -1 ? all[localIndex] : null;

    const studentId = taskRow?.student_id || localTask?.student_id;
    const taskTitle = taskRow?.title || localTask?.title || 'Koç Görevi';

    if (!studentId) {
      throw new Error('Görev kaydı bulunamadı.');
    }

    // Prepare description with rejection feedback
    let updatedDesc = taskRow?.description || localTask?.description || '';
    if (rejectionReason && rejectionReason.trim()) {
      updatedDesc = `${updatedDesc}\n\n[Koç Revizyon Talebi]: ${rejectionReason.trim()}`.trim();
    }

    // 1. Update Supabase tasks: status back to 'Bekliyor'
    try {
      await supabase
        .from('tasks')
        .update({
          status: 'Bekliyor',
          description: updatedDesc || undefined,
        })
        .eq('id', taskId);
    } catch (err) {
      console.warn('Reject task update note:', err);
    }

    // 2. Update local state
    if (localTask) {
      localTask.status = 'rejected';
      localTask.description = updatedDesc;
      localTask.updated_at = now;
      saveStoredTasks(all);
    }

    // 3. Notify student about required revision
    try {
      await notificationService.createNotification({
        user_id: studentId,
        title: '⚠️ Görev Revizyonu Gerekli',
        message: `"${taskTitle}" görevi için koçunuz revizyon istedi: ${rejectionReason?.trim() || 'Lütfen görevi düzenleyip tekrar teslim edin.'}`,
        type: 'warning',
        link: '/student/homework',
      });
    } catch {
      // ignore
    }
  },

  /**
   * Cancel task
   */
  async cancelTask(taskId: string): Promise<void> {
    const all = getStoredTasks();
    const task = all.find((t) => t.id === taskId);
    if (task) {
      task.status = 'cancelled';
      task.updated_at = new Date().toISOString();
      saveStoredTasks(all);
    }

    try {
      await supabase
        .from('tasks')
        .update({ status: 'Bekliyor' })
        .eq('id', taskId);
    } catch {
      // ignore
    }
  },
};
