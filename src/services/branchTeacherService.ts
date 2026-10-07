import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';
import { BranchTeacherFeedback } from '../types';

export const branchTeacherService = {
  /**
   * Get all branch teacher feedbacks for a specific student from parent_meetings table
   */
  async getFeedbacksForStudent(studentId: string): Promise<BranchTeacherFeedback[]> {
    try {
      const { data: meetings, error } = await supabase
        .from('parent_meetings')
        .select('id, teacher_opinions, meeting_date, coach_id, created_at')
        .eq('student_id', studentId)
        .order('meeting_date', { ascending: false });

      if (error || !meetings) {
        return [];
      }

      const results: BranchTeacherFeedback[] = [];
      for (const m of meetings) {
        if (!m.teacher_opinions) continue;
        try {
          const parsed = JSON.parse(m.teacher_opinions);
          if (Array.isArray(parsed)) {
            results.push(...parsed);
          } else if (parsed && typeof parsed === 'object') {
            results.push(parsed);
          }
        } catch {
          // Plain text format
          results.push({
            id: m.id,
            student_id: studentId,
            coach_id: m.coach_id || null,
            subject: 'Branş Görüşü',
            teacher_name: 'Öğretmen',
            topic: '',
            academic_status: 'İyi',
            opinion: m.teacher_opinions,
            recommendations: '',
            date: m.meeting_date || m.created_at?.slice(0, 10),
            created_at: m.created_at,
          });
        }
      }

      return results;
    } catch {
      return [];
    }
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

    try {
      await supabase
        .from('parent_meetings')
        .insert({
          student_id: payload.student_id,
          coach_id: payload.coach_id || null,
          meeting_date: newFeedback.date,
          meeting_type: 'online',
          status: 'completed',
          teacher_opinions: JSON.stringify([newFeedback]),
          academic_evaluation: `${payload.subject} branş değerlendirmesi eklendi.`,
        });
    } catch {
      // ignore
    }

    // Notify student
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
      await supabase
        .from('parent_meetings')
        .delete()
        .eq('id', feedbackId)
        .eq('student_id', studentId);
    } catch {
      // ignore
    }
  },
};
