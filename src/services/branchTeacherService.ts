import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';
import { BranchTeacherFeedback } from '../types';

const LOCAL_STORAGE_KEY = 'mahfaza_branch_teacher_feedbacks';

function getStoredFeedbacks(): BranchTeacherFeedback[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredFeedbacks(feedbacks: BranchTeacherFeedback[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(feedbacks));
  } catch {
    // ignore
  }
}

export const branchTeacherService = {
  /**
   * Get all branch teacher feedbacks for a specific student
   */
  async getFeedbacksForStudent(studentId: string): Promise<BranchTeacherFeedback[]> {
    let remoteFeedbacks: BranchTeacherFeedback[] = [];

    try {
      const { data: meetings, error } = await supabase
        .from('parent_meetings')
        .select('id, branch_evaluations')
        .eq('student_id', studentId);

      if (!error && meetings) {
        for (const m of meetings) {
          if (Array.isArray(m.branch_evaluations)) {
            remoteFeedbacks.push(...(m.branch_evaluations as BranchTeacherFeedback[]));
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching remote branch feedbacks:', err);
    }

    // Merge with local persistent storage
    const stored = getStoredFeedbacks().filter((f) => f.student_id === studentId);
    const idMap = new Map<string, BranchTeacherFeedback>();

    for (const item of remoteFeedbacks) {
      if (item && item.id) idMap.set(item.id, item);
    }
    for (const item of stored) {
      if (item && item.id && !idMap.has(item.id)) {
        idMap.set(item.id, item);
      }
    }

    return Array.from(idMap.values()).sort(
      (a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()
    );
  },

  /**
   * Add a new branch teacher opinion/feedback for a student
   */
  async createFeedback(payload: {
    student_id: string;
    coach_id?: string;
    subject: string;
    teacher_name: string;
    topic?: string;
    academic_status: 'Pekiyi' | 'İyi' | 'Orta' | 'Geliştirilmeli' | 'Kritik';
    opinion: string;
    recommendations?: string;
    date?: string;
  }): Promise<BranchTeacherFeedback> {
    const newFeedback: BranchTeacherFeedback = {
      id: 'bf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      student_id: payload.student_id,
      coach_id: payload.coach_id || null,
      subject: payload.subject.trim(),
      teacher_name: payload.teacher_name.trim(),
      topic: payload.topic?.trim() || '',
      academic_status: payload.academic_status,
      opinion: payload.opinion.trim(),
      recommendations: payload.recommendations?.trim() || '',
      date: payload.date || new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };

    // 1. Persist to Supabase parent_meetings record
    try {
      const { data: meetings } = await supabase
        .from('parent_meetings')
        .select('id, branch_evaluations')
        .eq('student_id', payload.student_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (meetings && meetings.length > 0) {
        const targetMeeting = meetings[0];
        const existing = Array.isArray(targetMeeting.branch_evaluations)
          ? targetMeeting.branch_evaluations
          : [];
        const updated = [newFeedback, ...existing];

        await supabase
          .from('parent_meetings')
          .update({ branch_evaluations: updated })
          .eq('id', targetMeeting.id);
      } else {
        // Create an initial parent_meeting entry to house branch evaluations
        await supabase
          .from('parent_meetings')
          .insert({
            student_id: payload.student_id,
            coach_id: payload.coach_id || null,
            meeting_date: newFeedback.date,
            meeting_type: 'online',
            status: 'completed',
            branch_evaluations: [newFeedback],
            academic_evaluation: `${payload.subject} branş değerlendirmesi eklendi.`,
          });
      }
    } catch (dbErr) {
      console.warn('Could not sync branch feedback to parent_meetings table:', dbErr);
    }

    // 2. Persist locally
    const all = getStoredFeedbacks();
    all.unshift(newFeedback);
    saveStoredFeedbacks(all);

    // 3. Notify student
    try {
      await notificationService.createNotification({
        user_id: payload.student_id,
        title: `📚 ${payload.subject} Branş Öğretmeni Görüşü`,
        message: `${payload.teacher_name} öğretmeniniz durum değerlendirmesi ve tavsiyelerini paylaştı.`,
        type: 'academic',
        link: '/student/learning',
      });
    } catch {
      // ignore
    }

    return newFeedback;
  },

  /**
   * Delete a branch teacher feedback
   */
  async deleteFeedback(feedbackId: string, studentId: string): Promise<void> {
    try {
      const { data: meetings } = await supabase
        .from('parent_meetings')
        .select('id, branch_evaluations')
        .eq('student_id', studentId);

      if (meetings) {
        for (const m of meetings) {
          if (Array.isArray(m.branch_evaluations)) {
            const filtered = m.branch_evaluations.filter((f: any) => f.id !== feedbackId);
            await supabase
              .from('parent_meetings')
              .update({ branch_evaluations: filtered })
              .eq('id', m.id);
          }
        }
      }
    } catch {
      // ignore
    }

    const all = getStoredFeedbacks().filter((f) => f.id !== feedbackId);
    saveStoredFeedbacks(all);
  },
};
