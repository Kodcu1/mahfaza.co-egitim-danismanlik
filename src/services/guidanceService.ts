import { supabase } from '../lib/supabase';
import { GuidanceNote } from '../types';

export const guidanceService = {
  async getNotesForStudent(studentId: string): Promise<GuidanceNote[]> {
    const { data, error } = await supabase
      .from('guidance_notes')
      .select(`
        id, student_id, counselor_id, category, private_note, created_at, updated_at,
        counselor:counselor_id(first_name, last_name, email),
        student:student_id(first_name, last_name, email)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      counselor_id: row.counselor_id,
      category: row.category,
      private_note: row.private_note,
      created_at: row.created_at,
      updated_at: row.updated_at,
      counselor: row.counselor,
      student: row.student,
    }));
  },

  async getAllCounselorNotes(): Promise<GuidanceNote[]> {
    const { data, error } = await supabase
      .from('guidance_notes')
      .select(`
        id, student_id, counselor_id, category, private_note, created_at, updated_at,
        counselor:counselor_id(first_name, last_name, email),
        student:student_id(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      counselor_id: row.counselor_id,
      category: row.category,
      private_note: row.private_note,
      created_at: row.created_at,
      updated_at: row.updated_at,
      counselor: row.counselor,
      student: row.student,
    }));
  },

  async createNote(studentId: string, counselorId: string, category: string, privateNote: string): Promise<GuidanceNote> {
    const { data, error } = await supabase
      .from('guidance_notes')
      .insert({
        student_id: studentId,
        counselor_id: counselorId,
        category,
        private_note: privateNote,
      })
      .select('id, student_id, counselor_id, category, private_note, created_at, updated_at')
      .single();

    if (error) throw new Error(error.message);
    return data as GuidanceNote;
  },

  async deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('guidance_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw new Error(error.message);
  },
};
