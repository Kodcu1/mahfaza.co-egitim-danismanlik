import { supabase } from '../lib/supabase';
import { StudyProof, StudyProofStatus } from '../types';
import { xpService } from './xpService';
import { notificationService } from './notificationService';

const LOCAL_STORAGE_KEY = 'mahfaza_study_proofs_store';

function getLocalProofs(): StudyProof[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalProofs(proofs: StudyProof[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(proofs));
  } catch (e) {
    console.error('Failed to save study proofs to localStorage:', e);
  }
}

export const studyProofService = {
  /**
   * Helper to convert File to base64 string safely
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  },

  /**
   * Upload proof image to Supabase Storage or fallback to base64
   */
  async uploadProofPhoto(studentId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${studentId}/${Date.now()}_proof.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('study_proofs')
        .upload(fileName, file, { upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('study_proofs')
          .getPublicUrl(fileName);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch {
      // Storage bucket not available, proceed to base64 fallback
    }

    return await this.fileToBase64(file);
  },

  /**
   * Submit new study proof from student
   */
  async submitStudyProof(payload: {
    student_id: string;
    coach_id?: string | null;
    subject_id: string;
    subject_name: string;
    study_type?: string;
    duration_minutes: number;
    question_count: number;
    study_note?: string;
    proof_photo_url: string;
    calculated_xp: number;
  }): Promise<StudyProof> {
    const newProofRecord: StudyProof = {
      id: crypto.randomUUID(),
      student_id: payload.student_id,
      coach_id: payload.coach_id || null,
      subject_id: payload.subject_id,
      subject_name: payload.subject_name,
      study_type: payload.study_type || 'Soru Çözümü',
      duration_minutes: Number(payload.duration_minutes) || 0,
      question_count: Number(payload.question_count) || 0,
      study_note: payload.study_note || null,
      proof_photo_url: payload.proof_photo_url,
      calculated_xp: Number(payload.calculated_xp) || 0,
      status: 'pending',
      coach_feedback: null,
      created_at: new Date().toISOString(),
      reviewed_at: null,
    };

    // Try Supabase insert
    try {
      const { data, error } = await supabase
        .from('study_proofs')
        .insert({
          id: newProofRecord.id,
          student_id: newProofRecord.student_id,
          coach_id: newProofRecord.coach_id,
          subject_id: newProofRecord.subject_id,
          subject_name: newProofRecord.subject_name,
          study_type: newProofRecord.study_type,
          duration_minutes: newProofRecord.duration_minutes,
          question_count: newProofRecord.question_count,
          study_note: newProofRecord.study_note,
          proof_photo_url: newProofRecord.proof_photo_url,
          calculated_xp: newProofRecord.calculated_xp,
          status: 'pending',
        })
        .select()
        .single();

      if (!error && data) {
        // Also cache locally
        const current = getLocalProofs();
        saveLocalProofs([data as StudyProof, ...current.filter((p) => p.id !== data.id)]);
        return data as StudyProof;
      }
    } catch {
      // Table doesn't exist yet, proceed with local fallback
    }

    // Fallback store in local cache
    const current = getLocalProofs();
    saveLocalProofs([newProofRecord, ...current.filter((p) => p.id !== newProofRecord.id)]);
    return newProofRecord;
  },

  /**
   * Get all study proofs for a student
   */
  async getStudentStudyProofs(
    studentId: string,
    secondaryStudentId?: string
  ): Promise<StudyProof[]> {
    let remoteProofs: StudyProof[] = [];
    try {
      let query = supabase.from('study_proofs').select('*');
      if (secondaryStudentId && secondaryStudentId !== studentId) {
        query = query.or(`student_id.eq.${studentId},student_id.eq.${secondaryStudentId}`);
      } else {
        query = query.eq('student_id', studentId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        remoteProofs = data as StudyProof[];
      }
    } catch {
      // Ignore remote error
    }

    const local = getLocalProofs().filter(
      (p) =>
        p.student_id === studentId ||
        (secondaryStudentId && p.student_id === secondaryStudentId)
    );
    const combined = [...remoteProofs];
    for (const item of local) {
      if (!combined.some((c) => c.id === item.id)) {
        combined.push(item);
      }
    }

    return combined.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  /**
   * Get all study proofs assigned to a coach or for linked students
   */
  async getCoachStudyProofs(
    coachId: string,
    studentIds: string[] = []
  ): Promise<StudyProof[]> {
    let remoteProofs: StudyProof[] = [];
    try {
      let query = supabase.from('study_proofs').select('*');
      if (studentIds.length > 0) {
        query = query.or(`coach_id.eq.${coachId},student_id.in.(${studentIds.join(',')})`);
      } else {
        query = query.eq('coach_id', coachId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) {
        remoteProofs = data as StudyProof[];
      }
    } catch {
      // Ignore remote error
    }

    const local = getLocalProofs().filter(
      (p) => p.coach_id === coachId || studentIds.includes(p.student_id)
    );

    const combined = [...remoteProofs];
    for (const item of local) {
      if (!combined.some((c) => c.id === item.id)) {
        combined.push(item);
      }
    }

    return combined.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  /**
   * Coach approves or rejects study proof and atomically deposits calculated XP into student's balance
   */
  async reviewStudyProof(
    proofId: string,
    status: 'approved' | 'rejected',
    coachFeedback: string = '',
    coachId: string = '',
    proofRecord?: StudyProof
  ): Promise<{ status: 'approved' | 'rejected'; awardedXP: number; studentId?: string }> {
    const reviewedAt = new Date().toISOString();

    // 1. Find proof from passed object, local storage, or Supabase
    let targetProof: StudyProof | null = proofRecord || null;
    const local = getLocalProofs();
    const localIndex = local.findIndex((p) => p.id === proofId);

    if (!targetProof && localIndex !== -1) {
      targetProof = local[localIndex];
    }

    try {
      const { data } = await supabase
        .from('study_proofs')
        .select('*')
        .eq('id', proofId)
        .maybeSingle();
      if (data) {
        targetProof = { ...(targetProof || {}), ...(data as StudyProof) };
      }
    } catch {
      // Ignore remote fetch error
    }

    // 2. Update status in Supabase study_proofs table
    try {
      const { error: updErr } = await supabase
        .from('study_proofs')
        .update({
          status,
          coach_feedback: coachFeedback.trim() || null,
          reviewed_at: reviewedAt,
          coach_id: coachId || targetProof?.coach_id || null,
        })
        .eq('id', proofId);

      if (updErr) {
        console.warn('Study proof remote status update note:', updErr.message);
      }
    } catch (e) {
      console.warn('Study proof remote update exception:', e);
    }

    // 3. Update Local Storage cache
    if (localIndex !== -1) {
      local[localIndex] = {
        ...local[localIndex],
        status,
        coach_feedback: coachFeedback.trim() || null,
        reviewed_at: reviewedAt,
      };
      saveLocalProofs(local);
    } else if (targetProof) {
      saveLocalProofs([
        {
          ...targetProof,
          status,
          coach_feedback: coachFeedback.trim() || null,
          reviewed_at: reviewedAt,
        },
        ...local,
      ]);
    }

    // 4. If APPROVED, deposit calculated_xp into student's XP balance & xp_transactions
    let awardedXP = 0;
    if (status === 'approved' && targetProof && targetProof.student_id) {
      awardedXP = Math.max(5, Number(targetProof.calculated_xp) || 25);
      const reason = `[Fotoğraflı Kanıt Onayı] ${targetProof.subject_name || 'Çalışma Seansı'} (${targetProof.duration_minutes || 0} dk, ${targetProof.question_count || 0} soru)`;

      const xpRes = await xpService.awardXPAtomic({
        student_id: targetProof.student_id,
        base_amount: awardedXP,
        action_type: 'study_proof_approved',
        description: reason,
        reference_id: targetProof.id,
      });

      awardedXP = xpRes.awarded_xp || awardedXP;

      // ACTION 3: Immediately notify student on photo evidence approval
      try {
        await notificationService.createNotification({
          user_id: targetProof.student_id,
          title: 'Çalışma Kanıtı Onaylandı 🎯',
          message: `Tebrikler! ${targetProof.subject_name || 'Çalışma'} fotoğrafınız koçunuz tarafından onaylandı ve hesabınıza +${awardedXP} XP tanımlandı.`,
          type: 'xp',
          link: '/student/xp',
        });
      } catch (notifErr) {
        console.warn('Proof approval notification warning:', notifErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahfaza:counts-updated'));
      window.dispatchEvent(new CustomEvent('mahfaza:new_notification', { detail: { user_id: targetProof?.student_id } }));
      window.dispatchEvent(
        new CustomEvent('mahfaza:xp-updated', {
          detail: { studentId: targetProof?.student_id, amount: awardedXP },
        })
      );
    }

    return {
      status,
      awardedXP,
      studentId: targetProof?.student_id,
    };
  },

  /**
   * True Deletion of Photo Study Proof (Storage + DB Integration)
   * 1. Verifies coach authorization
   * 2. Deletes physical file from Supabase Storage ('study_proofs' bucket) if applicable
   * 3. Deletes record from Supabase 'study_proofs' table and local cache
   */
  async deleteStudyProof(
    proof: StudyProof,
    coachId: string,
    authorizedStudentIds: string[] = []
  ): Promise<void> {
    if (!coachId) {
      throw new Error('Silme işlemi için koç oturumu doğrulanamadı.');
    }

    // 1. Verify coach permission
    const isAuthorized =
      proof.coach_id === coachId ||
      authorizedStudentIds.includes(proof.student_id);

    if (!isAuthorized) {
      throw new Error('Bu çalışma kanıtını silmek için yetkiniz bulunmamaktadır.');
    }

    // 2. Delete physical file object from Supabase Storage if URL is a storage URL (not base64 data URI)
    const photoUrl = proof.proof_photo_url || '';
    if (photoUrl && !photoUrl.startsWith('data:')) {
      let storagePath: string | null = null;
      const publicMarker = '/storage/v1/object/public/study_proofs/';
      const signedMarker = '/storage/v1/object/sign/study_proofs/';

      if (photoUrl.includes(publicMarker)) {
        storagePath = decodeURIComponent(photoUrl.split(publicMarker)[1]?.split('?')[0] || '');
      } else if (photoUrl.includes(signedMarker)) {
        storagePath = decodeURIComponent(photoUrl.split(signedMarker)[1]?.split('?')[0] || '');
      } else if (!photoUrl.startsWith('http')) {
        storagePath = photoUrl;
      }

      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('study_proofs')
          .remove([storagePath]);

        if (storageError) {
          console.error('Storage file deletion error:', storageError);
          throw new Error(
            `Depolama alanından fotoğraf silinemedi (${storageError.message}). Veritabanı bütünlüğü için kayıt silme işlemi durduruldu.`
          );
        }
      }
    }

    // 3. Delete record from Supabase DB
    try {
      const { error: dbError } = await supabase
        .from('study_proofs')
        .delete()
        .eq('id', proof.id);

      if (dbError) {
        // If table doesn't exist in remote environment, log warning; otherwise throw if permission/constraint error
        const msg = dbError.message || '';
        if (
          !msg.includes('relation') &&
          !msg.includes('does not exist') &&
          !msg.includes('schema cache')
        ) {
          throw new Error(`Veritabanı kaydı silinemedi: ${dbError.message}`);
        }
      }
    } catch (err: any) {
      if (err.message?.startsWith('Veritabanı kaydı silinemedi:')) {
        throw err;
      }
    }

    // 4. Remove from local fallback store so it never resurfaces
    const current = getLocalProofs();
    saveLocalProofs(current.filter((p) => p.id !== proof.id));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahfaza:counts-updated'));
    }
  },
};
