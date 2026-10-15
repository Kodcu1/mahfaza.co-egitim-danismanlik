import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';
import { BranchTeacherFeedback } from '../types';

export interface BranchTopicStatus {
  id: string;
  student_id: string;
  subject: string;
  topic_name: string;
  status: 'tamamlandi' | 'devam_ediyor' | 'eksik';
  updated_at: string;
}

export const branchTeacherService = {
  /**
   * Get all branch teacher feedbacks for a specific student from parent_meetings table
   */
  async getFeedbacksForStudent(studentId: string): Promise<BranchTeacherFeedback[]> {
    try {
      const { data: meetings, error } = await supabase
        .from('parent_meetings')
        .select('id, teacher_opinions, branch_evaluations, meeting_date, coach_id, created_at')
        .eq('student_id', studentId)
        .order('meeting_date', { ascending: false });

      if (error || !meetings) {
        return [];
      }

      const results: BranchTeacherFeedback[] = [];
      for (const m of meetings) {
        // Check branch_evaluations first
        if (Array.isArray(m.branch_evaluations) && m.branch_evaluations.length > 0) {
          results.push(...m.branch_evaluations);
          continue;
        }

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
   * Add a new branch teacher opinion/feedback for a student (syncs with parent meeting report)
   */
  async createFeedback(payload: {
    student_id: string;
    coach_id?: string;
    subject: string;
    teacher_name: string;
    topic?: string;
    academic_status: 'Pekiyi' | 'İyi' | 'Orta' | 'Geliştirilmeli' | 'Kritik';
    opinion: string;
    strengths?: string;
    improvements?: string;
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
      // Find latest parent meeting for this student to attach branch feedback
      const { data: latestMeetings } = await supabase
        .from('parent_meetings')
        .select('*')
        .eq('student_id', payload.student_id)
        .order('meeting_date', { ascending: false })
        .limit(1);

      if (latestMeetings && latestMeetings.length > 0) {
        const meeting = latestMeetings[0];
        const existingEvals: any[] = Array.isArray(meeting.branch_evaluations)
          ? meeting.branch_evaluations
          : [];
        // Replace or add evaluation for this subject
        const updatedEvals = [
          ...existingEvals.filter((e) => e.subject?.toLowerCase() !== payload.subject.toLowerCase()),
          {
            ...newFeedback,
            strengths: payload.strengths?.trim(),
            improvements: payload.improvements?.trim(),
          },
        ];

        await supabase
          .from('parent_meetings')
          .update({
            branch_evaluations: updatedEvals,
            teacher_opinions: JSON.stringify(updatedEvals),
            updated_at: new Date().toISOString(),
          })
          .eq('id', meeting.id);
      } else {
        // Create a new meeting entry with this branch evaluation
        await supabase
          .from('parent_meetings')
          .insert({
            student_id: payload.student_id,
            coach_id: payload.coach_id || null,
            meeting_date: newFeedback.date,
            meeting_type: 'online',
            status: 'completed',
            branch_evaluations: [{
              ...newFeedback,
              strengths: payload.strengths?.trim(),
              improvements: payload.improvements?.trim(),
            }],
            teacher_opinions: JSON.stringify([newFeedback]),
            academic_evaluation: `${payload.subject} branş değerlendirmesi kaydedildi.`,
          });
      }
    } catch (err) {
      console.warn('Branch feedback persistence note:', err);
    }

    // Notify student
    try {
      await notificationService.createNotification({
        user_id: payload.student_id,
        title: `📚 ${payload.subject} Branş Görüşü Eklendi`,
        message: `${payload.teacher_name} öğretmeniniz veli görüşme formuna akademik durum değerlendirmesini ekledi.`,
        type: 'academic',
        link: '/student/learning',
      });
    } catch {
      // ignore
    }

    return newFeedback;
  },

  /**
   * Get topic / achievement completion status for a student in a specific branch
   */
  getTopicStatuses(studentId: string, subject: string): Record<string, 'tamamlandi' | 'devam_ediyor' | 'eksik'> {
    try {
      const key = `mahfaza_topic_status_${studentId}_${subject.toLowerCase()}`;
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  },

  /**
   * Set topic / achievement completion status
   */
  setTopicStatus(
    studentId: string,
    subject: string,
    topicName: string,
    status: 'tamamlandi' | 'devam_ediyor' | 'eksik'
  ): void {
    try {
      const key = `mahfaza_topic_status_${studentId}_${subject.toLowerCase()}`;
      const current = this.getTopicStatuses(studentId, subject);
      current[topicName] = status;
      localStorage.setItem(key, JSON.stringify(current));
    } catch {
      // ignore
    }
  },

  /**
   * Assign a targeted homework / question target to a specific student
   */
  async assignStudentTarget(payload: {
    student_id: string;
    teacher_id: string;
    subject_name: string;
    title: string;
    question_count: number;
    due_date: string;
    xp_reward?: number;
  }): Promise<void> {
    const reward = payload.xp_reward || 50;

    // 1. Insert into coach_tasks / tasks if available
    try {
      await supabase
        .from('coach_tasks')
        .insert({
          coach_id: payload.teacher_id,
          student_id: payload.student_id,
          title: `[${payload.subject_name}] ${payload.title} (${payload.question_count} Soru Hedefi)`,
          description: `${payload.subject_name} branş ödevi: ${payload.question_count} adet soru çözümü ve analizi.`,
          due_date: payload.due_date,
          xp_reward: reward,
          status: 'pending',
        });
    } catch {
      // fallback
    }

    // 2. Notify student
    try {
      await notificationService.createNotification({
        user_id: payload.student_id,
        title: `🎯 Yeni Branş Hedefi: ${payload.subject_name}`,
        message: `${payload.title} (${payload.question_count} Soru) hedefinizi tamamlayarak +${reward} XP kazanın.`,
        type: 'academic',
        link: '/student/learning',
      });
    } catch {
      // ignore
    }
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
