import { supabase } from '../lib/supabase';
import { CoachTask } from '../types';
import { xpService } from './xpService';
import { notificationService } from './notificationService';

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

export const coachTaskService = {
  /**
   * Get all tasks assigned by this coach directly from Supabase tasks table
   */
  async getTasksForCoach(coachId: string): Promise<CoachTask[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return [];
      }

      const studentIds = [...new Set(data.map((r: any) => r.student_id).filter(Boolean))];
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, name, full_name, avatar_url')
        .in('id', studentIds);

      const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
      return data.map((row: any) => {
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
    } catch {
      return [];
    }
  },

  /**
   * Get all tasks assigned to a specific student directly from Supabase tasks table
   */
  async getTasksForStudent(studentId: string): Promise<CoachTask[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('student_id', studentId)
        .order('due_date', { ascending: true });

      if (error || !data || data.length === 0) {
        return [];
      }

      const coachIds = [...new Set(data.map((r: any) => r.coach_id).filter(Boolean))];
      const { data: coaches } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, name, full_name, avatar_url')
        .in('id', coachIds);

      const coachMap = new Map((coaches || []).map((c: any) => [c.id, c]));
      return data.map((row: any) => ({
        ...mapRowToCoachTask(row),
        coach: coachMap.get(row.coach_id),
      }));
    } catch {
      return [];
    }
  },

  /**
   * Create a new task and assign to a student in Supabase tasks table
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
  }): Promise<CoachTask> {
    const xpReward = Math.min(150, Math.max(10, payload.xp_reward || 40));

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

    if (error) {
      throw new Error(error.message);
    }

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
      // ignore notification error
    }

    return mapRowToCoachTask(data);
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
    const { data: link } = await supabase
      .from('coach_student_links')
      .select('id')
      .eq('coach_id', coachId)
      .eq('student_id', taskRow.student_id)
      .eq('status', 'active')
      .maybeSingle();

    if (!link && taskRow.coach_id && taskRow.coach_id !== coachId) {
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
