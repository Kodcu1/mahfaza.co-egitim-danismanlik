import { supabase } from '../lib/supabase';
import { CoachTask } from '../types';
import { xpService } from './xpService';
import { notificationService } from './notificationService';
import { relationshipService } from './relationshipService';

// Convert Supabase database row to CoachTask format
function mapRowToCoachTask(row: any): CoachTask {
  let mappedStatus: 'pending' | 'submitted' | 'completed' | 'verified' | 'cancelled' | 'pending_review' | 'approved' | 'rejected' = 'pending';
  const rawStatus = (row.status || '').toLowerCase();

  if (rawStatus === 'tamamlandı' || rawStatus === 'verified' || rawStatus === 'completed' || rawStatus === 'approved') {
    mappedStatus = 'approved';
  } else if (rawStatus === 'devam ediyor' || rawStatus === 'submitted' || rawStatus === 'pending_review') {
    mappedStatus = 'pending_review';
  } else if (rawStatus === 'iptal' || rawStatus === 'cancelled' || rawStatus === 'rejected') {
    mappedStatus = 'rejected';
  } else {
    mappedStatus = 'pending';
  }

  // Extract student note/evidence from description or dedicated column
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
    xp_reward: Number(row.xp_reward) || 50,
    status: mappedStatus,
    student_note: extractedNote,
    completed_at: row.completed_at || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
    student: row.student || row.profiles,
    coach: row.coach,
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

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]).catch(() => fallback);
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
   * Helper to locate task across coach_tasks table, tasks table, and local storage cache
   */
  async findTaskRecord(taskId: string): Promise<{
    source: 'coach_tasks' | 'tasks' | 'local';
    task: CoachTask;
    rawRow?: any;
  } | null> {
    // 1. Check local storage cache first (0ms latency, prevents UI lock)
    const local = getLocalTasks();
    const foundLocal = local.find((t) => t.id === taskId);
    if (foundLocal) {
      return {
        source: 'local',
        task: foundLocal,
      };
    }

    // 2. Check public.coach_tasks table with strict timeout
    try {
      const ctPromise = supabase
        .from('coach_tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      const { data: ctData, error: ctErr } = await withTimeout(
        ctPromise as any,
        800,
        { data: null, error: null }
      );

      if (!ctErr && ctData) {
        return {
          source: 'coach_tasks',
          task: mapRowToCoachTask(ctData),
          rawRow: ctData,
        };
      }
    } catch {
      // ignore
    }

    // 3. Check public.tasks table with strict timeout
    try {
      const tPromise = supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      const { data: tData, error: tErr } = await withTimeout(
        tPromise as any,
        800,
        { data: null, error: null }
      );

      if (!tErr && tData) {
        return {
          source: 'tasks',
          task: mapRowToCoachTask(tData),
          rawRow: tData,
        };
      }
    } catch {
      // ignore
    }

    return null;
  },

  /**
   * Get all tasks assigned by this coach directly from Supabase (tasks & coach_tasks) with persistent localStorage merge
   */
  async getTasksForCoach(coachId: string, options?: { email?: string; profileId?: string }): Promise<CoachTask[]> {
    const coachCandidates = Array.from(
      new Set(
        [
          coachId,
          options?.profileId,
          '99999999-0000-0000-0000-000000000002', // Demo coach ID
          '00000000-0000-0000-0000-000000000001', // Super admin
          '00000000-0000-0000-0000-000000000002', // Mudur admin
        ].filter(Boolean)
      )
    ) as string[];

    // 1. Immediately read local tasks to eliminate ghosting
    const local = getLocalTasks();
    let remoteTasks: CoachTask[] = [];

    // 2. Query remote tables in parallel bounded by a 900ms timeout
    const remoteFetchPromise = (async () => {
      const tasksFound: CoachTask[] = [];
      try {
        const { data: ctData, error: ctErr } = await supabase
          .from('coach_tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (!ctErr && ctData && ctData.length > 0) {
          const studentIds = [...new Set(ctData.map((r: any) => r.student_id).filter(Boolean))];
          let profMap = new Map<string, any>();
          try {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, email, name, full_name, avatar_url')
              .in('id', studentIds);
            profMap = new Map((profs || []).map((p: any) => [p.id, p]));
          } catch {
            // ignore
          }

          for (const row of ctData) {
            const t = mapRowToCoachTask(row);
            const sp = profMap.get(row.student_id);
            if (sp) {
              t.student = {
                ...sp,
                first_name: sp.first_name || (sp.full_name ? sp.full_name.split(' ')[0] : 'Öğrenci'),
                last_name: sp.last_name || (sp.full_name ? sp.full_name.split(' ').slice(1).join(' ') : ''),
              };
            }
            tasksFound.push(t);
          }
        }
      } catch {
        // ignore
      }

      // Check tasks table
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          for (const row of data) {
            if (!tasksFound.some((rt) => rt.id === row.id)) {
              tasksFound.push(mapRowToCoachTask(row));
            }
          }
        }
      } catch {
        // ignore
      }

      return tasksFound;
    })();

    const fetchedRemote = await withTimeout(remoteFetchPromise, 900, []);
    remoteTasks = fetchedRemote || [];

    // 3. Merge persistent local tasks with remote tasks
    const combined = [...remoteTasks];
    for (const lt of local) {
      if (!combined.some((rt) => rt.id === lt.id)) {
        combined.push(lt);
      }
    }

    return combined.sort(
      (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
  },

  /**
   * Get all tasks assigned to a specific student directly from Supabase with persistent localStorage merge
   */
  async getTasksForStudent(studentId: string, options?: { email?: string; profileId?: string }): Promise<CoachTask[]> {
    const studentCandidates = Array.from(
      new Set(
        [
          studentId,
          options?.profileId,
          '99999999-0000-0000-0000-000000000001', // Demo student ID (Ayşegül Koçak)
        ].filter(Boolean)
      )
    ) as string[];

    // 1. Immediately read local tasks
    const local = getLocalTasks();
    const relevantLocal = local.filter((t) => {
      if (studentCandidates.includes(t.student_id)) return true;
      if (options?.email && t.student?.email && t.student.email.toLowerCase() === options.email.toLowerCase()) return true;
      // In demo mode or if student ID is empty, show all active assigned tasks
      if (!t.student_id || t.student_id === '99999999-0000-0000-0000-000000000001') return true;
      return false;
    });

    let remoteTasks: CoachTask[] = [];

    // 2. Query remote tables bounded by 900ms timeout
    const remoteFetchPromise = (async () => {
      const tasksFound: CoachTask[] = [];
      try {
        const { data: ctData, error: ctErr } = await supabase
          .from('coach_tasks')
          .select('*')
          .in('student_id', studentCandidates)
          .order('due_date', { ascending: true });

        if (!ctErr && ctData && ctData.length > 0) {
          const coachIds = [...new Set(ctData.map((r: any) => r.coach_id).filter(Boolean))];
          let coachMap = new Map<string, any>();
          try {
            const { data: coaches } = await supabase
              .from('profiles')
              .select('id, email, name, full_name, avatar_url')
              .in('id', coachIds);
            coachMap = new Map((coaches || []).map((c: any) => [c.id, c]));
          } catch {
            // ignore
          }

          for (const row of ctData) {
            tasksFound.push({
              ...mapRowToCoachTask(row),
              coach: coachMap.get(row.coach_id),
            });
          }
        }
      } catch {
        // ignore
      }

      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .in('student_id', studentCandidates)
          .order('due_date', { ascending: true });

        if (!error && data && data.length > 0) {
          for (const row of data) {
            if (!tasksFound.some((rt) => rt.id === row.id)) {
              tasksFound.push(mapRowToCoachTask(row));
            }
          }
        }
      } catch {
        // ignore
      }

      return tasksFound;
    })();

    const fetchedRemote = await withTimeout(remoteFetchPromise, 900, []);
    remoteTasks = fetchedRemote || [];

    // 3. Merge persistent local tasks with remote tasks
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
   * Dual-layer persistence: Supabase coach_tasks/tasks + localStorage mahfaza_tasks
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
    const xpReward = Math.min(150, Math.max(10, payload.xp_reward || 50));
    const now = new Date().toISOString();
    const generatedId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 1. Build authoritative initial task object
    const finalTask: CoachTask = {
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

    // 2. Persist to local tasks store immediately (0ms) so neither coach nor student loses visibility
    const local = getLocalTasks();
    saveLocalTasks([finalTask, ...local.filter((t) => t.id !== finalTask.id)]);

    // 3. Fire global window events so both coach & student views update reactively
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahfaza:task_created', { detail: finalTask }));
      window.dispatchEvent(new CustomEvent('mahfaza:tasks_updated', { detail: finalTask }));
      window.dispatchEvent(new CustomEvent('mahfaza:counts-updated'));
    }

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

    // 5. Asynchronously replicate to Supabase in background with strict 1000ms timeout
    const remoteInsertPromise = (async () => {
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
          // If remote generated a specific UUID, link and update local cache
          const remoteTask = mapRowToCoachTask(ctData);
          if (payload.student) remoteTask.student = payload.student;
          if (payload.coach) remoteTask.coach = payload.coach;
          const fresh = getLocalTasks();
          saveLocalTasks([remoteTask, ...fresh.filter((t) => t.id !== finalTask.id && t.id !== remoteTask.id)]);
        }
      } catch {
        // ignore remote error (local record remains intact)
      }
    })();

    await withTimeout(remoteInsertPromise, 1000, null);

    return finalTask;
  },

  /**
   * Submit task by student for coach review (Does NOT award XP!)
   * Sets status to 'pending_review' (DB: 'completed' / 'Devam Ediyor') and notifies coach.
   */
  async completeTaskByStudent(taskId: string, studentId: string, note?: string): Promise<void> {
    const now = new Date().toISOString();
    const record = await this.findTaskRecord(taskId);

    if (!record) {
      // If task record was not found by exact ID, search local storage for matching active task
      const local = getLocalTasks();
      const fallbackTask = local.find(
        (t) => (t.student_id === studentId || t.student_id === '99999999-0000-0000-0000-000000000001') && t.status === 'pending'
      );
      if (!fallbackTask) {
        throw new Error('Görev bulunamadı.');
      }
      return this.completeTaskByStudent(fallbackTask.id, studentId, note);
    }

    const currentTask = record.task;

    // Guard: If already approved/verified, cannot re-submit
    if (currentTask.status === 'approved' || currentTask.status === 'verified') {
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

    // 1. Update remote coach_tasks table if present
    try {
      await supabase
        .from('coach_tasks')
        .update({
          status: 'completed',
          student_note: note?.trim() || null,
          completed_at: now,
          updated_at: now,
        })
        .eq('id', taskId);
    } catch {
      // ignore
    }

    // 1b. Update remote tasks table if present
    try {
      await supabase
        .from('tasks')
        .update({
          status: 'Devam Ediyor',
          completed_at: now,
          description: newDescription || null,
        })
        .eq('id', taskId);
    } catch {
      // ignore
    }

    // 2. Update local tasks storage unconditionally
    const local = getLocalTasks();
    const updatedLocal = local.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'pending_review' as const,
          student_note: note?.trim() || t.student_note,
          description: newDescription,
          completed_at: now,
          updated_at: now,
        };
      }
      return t;
    });
    saveLocalTasks(updatedLocal);

    // 3. Send notification to coach
    const coachTargetId = currentTask.coach_id || '99999999-0000-0000-0000-000000000002';
    try {
      await notificationService.createNotification({
        user_id: coachTargetId,
        title: '📋 Görev Onay Bekliyor',
        message: `Öğrenciniz "${currentTask.title || 'Koç Görevi'}" görevini teslim etti ve onayınızı bekliyor.`,
        type: 'task',
        link: '/coach/tasks',
      });
    } catch {
      // ignore notification error
    }

    // 4. Dispatch global events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahfaza:tasks_updated', { detail: { id: taskId, status: 'pending_review' } }));
      window.dispatchEvent(new CustomEvent('mahfaza:counts-updated'));
    }
  },

  /**
   * Verify and approve task by Coach, awarding student XP atomically
   */
  async verifyTaskAndAwardXP(taskId: string, coachId: string): Promise<void> {
    const now = new Date().toISOString();
    const record = await this.findTaskRecord(taskId);

    if (!record) {
      throw new Error('Görev kaydı bulunamadı.');
    }

    const currentTask = record.task;

    // Idempotency Guard: Prevent duplicate approval & double XP award
    if (currentTask.status === 'approved' || currentTask.status === 'verified') {
      return;
    }

    // 1. Update remote coach_tasks table if present
    try {
      await supabase
        .from('coach_tasks')
        .update({
          status: 'verified',
          completed_at: currentTask.completed_at || now,
          updated_at: now,
        })
        .eq('id', taskId);
    } catch {
      // ignore
    }

    // 1b. Update remote tasks table if present
    try {
      await supabase
        .from('tasks')
        .update({
          status: 'Tamamlandı',
          completed_at: currentTask.completed_at || now,
        })
        .eq('id', taskId);
    } catch {
      // ignore
    }

    // 2. Update local tasks storage unconditionally
    const local = getLocalTasks();
    const updatedLocal = local.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'approved' as const,
          completed_at: t.completed_at || now,
          updated_at: now,
        };
      }
      return t;
    });
    saveLocalTasks(updatedLocal);

    // 3. Atomically Award XP to student (Idempotent procedure with reference_id)
    const xpReward = Number(currentTask.xp_reward || 50);
    const studentTargetId = currentTask.student_id || '99999999-0000-0000-0000-000000000001';

    try {
      await xpService.awardXPAtomic({
        student_id: studentTargetId,
        base_amount: xpReward,
        action_type: 'coach_task_completed',
        description: `Koç Görevi Onaylandı: ${currentTask.title}`,
        reference_id: taskId,
      });
    } catch (xpErr) {
      console.warn('XP award exception note:', xpErr);
    }

    // 4. Notify student that task was approved and XP was granted
    try {
      await notificationService.createNotification({
        user_id: studentTargetId,
        title: '🎉 Göreviniz Onaylandı!',
        message: `"${currentTask.title}" göreviniz koçunuz tarafından onaylandı! +${xpReward} XP hesabınıza eklendi.`,
        type: 'xp',
        link: '/student/xp',
      });
    } catch {
      // ignore
    }

    // 5. Fire global window events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahfaza:tasks_updated', { detail: { id: taskId, status: 'approved' } }));
      window.dispatchEvent(new CustomEvent('mahfaza:xp-updated', { detail: { studentId: studentTargetId, xp: xpReward } }));
      window.dispatchEvent(new CustomEvent('mahfaza:counts-updated'));
    }
  },

  /**
   * Reject task by Coach with feedback (Does NOT award XP, sets status back to 'pending')
   */
  async rejectTask(taskId: string, coachId: string, rejectionReason?: string): Promise<void> {
    const record = await this.findTaskRecord(taskId);
    if (!record) {
      throw new Error('Görev kaydı bulunamadı.');
    }

    const currentTask = record.task;
    let newDesc = currentTask.description || '';
    if (rejectionReason && rejectionReason.trim()) {
      newDesc = newDesc
        ? `${newDesc}\n\n[Koç Red Notu]: ${rejectionReason.trim()}`
        : `[Koç Red Notu]: ${rejectionReason.trim()}`;
    }

    // 1. Update remote tables
    try {
      await supabase
        .from('coach_tasks')
        .update({
          status: 'pending',
          description: newDesc || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);
    } catch {
      // ignore
    }

    try {
      await supabase
        .from('tasks')
        .update({
          status: 'Bekliyor',
          description: newDesc || null,
        })
        .eq('id', taskId);
    } catch {
      // ignore
    }

    // 2. Update local storage
    const local = getLocalTasks();
    const updatedLocal = local.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'rejected' as const,
          description: newDesc,
          updated_at: new Date().toISOString(),
        };
      }
      return t;
    });
    saveLocalTasks(updatedLocal);

    // 3. Notify student
    const studentTargetId = currentTask.student_id || '99999999-0000-0000-0000-000000000001';
    try {
      await notificationService.createNotification({
        user_id: studentTargetId,
        title: '⚠️ Görev Düzeltme Talebi',
        message: `"${currentTask.title}" göreviniz koçunuz tarafından incelendi ve düzeltme talep edildi: ${rejectionReason || 'Lütfen görevi gözden geçirin.'}`,
        type: 'task',
        link: '/student/tasks',
      });
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahfaza:tasks_updated', { detail: { id: taskId, status: 'rejected' } }));
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
    try {
      await supabase.from('coach_tasks').update({ status: 'cancelled' }).eq('id', taskId);
    } catch {
      // ignore
    }

    try {
      await supabase.from('tasks').update({ status: 'İptal' }).eq('id', taskId);
    } catch {
      // ignore
    }

    const local = getLocalTasks();
    const updatedLocal = local.map((t) => (t.id === taskId ? { ...t, status: 'cancelled' as const } : t));
    saveLocalTasks(updatedLocal);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahfaza:tasks_updated', { detail: { id: taskId, status: 'cancelled' } }));
    }
  },
};
