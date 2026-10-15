export interface CurriculumSubject {
  id: string;
  name: string;
}

export const LGS_SUBJECTS: CurriculumSubject[] = [
  { id: 'lgs_turkce', name: 'Türkçe' },
  { id: 'lgs_matematik', name: 'Matematik' },
  { id: 'lgs_fen', name: 'Fen Bilimleri' },
  { id: 'lgs_inkilap', name: 'T.C. İnkılap Tarihi ve Atatürkçülük' },
  { id: 'lgs_din', name: 'Din Kültürü ve Ahlak Bilgisi' },
  { id: 'lgs_ingilizce', name: 'Yabancı Dil (İngilizce)' },
];

export const YKS_SUBJECTS: CurriculumSubject[] = [
  { id: 'yks_turkce', name: 'TYT Türkçe' },
  { id: 'yks_mat_temel', name: 'TYT Temel Matematik' },
  { id: 'yks_mat_ayt', name: 'AYT İleri Matematik & Geometri' },
  { id: 'yks_fizik', name: 'Fizik (TYT / AYT)' },
  { id: 'yks_kimya', name: 'Kimya (TYT / AYT)' },
  { id: 'yks_biyoloji', name: 'Biyoloji (TYT / AYT)' },
  { id: 'yks_edebiyat', name: 'AYT Türk Dili ve Edebiyatı' },
  { id: 'yks_tarih', name: 'Tarih (TYT / AYT)' },
  { id: 'yks_cografya', name: 'Coğrafya (TYT / AYT)' },
  { id: 'yks_felsefe_din', name: 'Felsefe & Din Kültürü' },
  { id: 'yks_yabanci_dil', name: 'YDT Yabancı Dil' },
];

export const ALL_CURRICULUM_SUBJECTS: CurriculumSubject[] = [
  ...YKS_SUBJECTS,
  ...LGS_SUBJECTS,
];

/**
 * Returns subject options based on user target_program or default combined list.
 */
export function getSubjectsForProgram(targetProgram?: string | null): {
  isGrouped: boolean;
  subjects: CurriculumSubject[];
  lgs: CurriculumSubject[];
  yks: CurriculumSubject[];
} {
  const norm = (targetProgram || '').toUpperCase();
  if (norm.includes('LGS')) {
    return {
      isGrouped: false,
      subjects: LGS_SUBJECTS,
      lgs: LGS_SUBJECTS,
      yks: [],
    };
  }
  if (norm.includes('YKS') || norm.includes('TYT') || norm.includes('AYT')) {
    return {
      isGrouped: false,
      subjects: YKS_SUBJECTS,
      lgs: [],
      yks: YKS_SUBJECTS,
    };
  }
  return {
    isGrouped: true,
    subjects: ALL_CURRICULUM_SUBJECTS,
    lgs: LGS_SUBJECTS,
    yks: YKS_SUBJECTS,
  };
}
