import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { studyProofService } from '../../services/studyProofService';
import { StudyProof } from '../../types';
import {
  ALL_CURRICULUM_SUBJECTS,
  getSubjectsForProgram,
  YKS_SUBJECTS,
} from '../../constants/curriculum';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/EmptyState';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Upload,
  Eye,
  Award,
  Sparkles,
  BookOpen,
  HelpCircle,
  XCircle,
  MessageSquare,
  ArrowRight,
  Filter,
} from 'lucide-react';

const STUDY_TYPES = [
  'Soru Çözümü',
  'Konu Tekrarı',
  'Föy / Deneme',
  'Kitap Okuma',
  'Özet Çıkarma',
];

export const StudentStudyLogsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [proofs, setProofs] = useState<StudyProof[]>([]);
  const [coachId, setCoachId] = useState<string | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const setIsModalOpen = setModalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Curriculum subjects resolution
  const programSubjects = useMemo(() => {
    return getSubjectsForProgram(profile?.target_program);
  }, [profile?.target_program]);

  // Form Fields
  const [subjectId, setSubjectId] = useState<string>('');
  const [studyType, setStudyType] = useState<string>('Soru Çözümü');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [studyNote, setStudyNote] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Inspect Modal (Lightbox)
  const [inspectProof, setInspectProof] = useState<StudyProof | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Student primary / secondary IDs
  const studentPrimaryId = profile?.id || user?.id || '';
  const studentSecondaryId = user?.id !== profile?.id ? user?.id : undefined;

  // Load Data
  const loadData = useCallback(async () => {
    if (!studentPrimaryId) return;
    try {
      setLoading(true);
      const [userProofs, assignedCoach] = await Promise.all([
        studyProofService.getStudentStudyProofs(studentPrimaryId, studentSecondaryId),
        relationshipService.getStudentAssignedCoach(studentPrimaryId).catch(() => null),
      ]);
      setProofs(userProofs || []);
      if (assignedCoach?.id) {
        setCoachId(assignedCoach.id);
      }
    } catch (err) {
      console.error('Failed to load study logs:', err);
    } finally {
      setLoading(false);
    }
  }, [studentPrimaryId, studentSecondaryId]);

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('mahfaza:counts-updated', handleSync);

    let channel: any = null;
    if (studentPrimaryId) {
      channel = supabase
        .channel(`student_proofs_${studentPrimaryId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'study_proofs' },
          () => loadData()
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('mahfaza:counts-updated', handleSync);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData, studentPrimaryId]);

  // Dynamic XP Estimation
  const estimatedXP = useMemo(() => {
    const durationXP = Math.floor(durationMinutes / 15) * 10;
    const questionsXP = Math.floor(questionCount / 10) * 5;
    return Math.min(150, Math.max(15, durationXP + questionsXP));
  }, [durationMinutes, questionCount]);

  // Open modal handler
  const handleOpenModal = () => {
    try {
      const fallbackSubId = programSubjects?.subjects?.[0]?.id || YKS_SUBJECTS?.[0]?.id || 'yks_turkce';
      setSubjectId(fallbackSubId);
    } catch {
      setSubjectId('yks_turkce');
    }
    setStudyType('Soru Çözümü');
    setDurationMinutes(30);
    setQuestionCount(20);
    setStudyNote('');
    setImageFile(null);
    setImagePreview(null);
    setFormError(null);
    setModalOpen(true);
  };

  // Image Selection Handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Lütfen geçerli bir resim dosyası seçin (JPG, PNG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setFormError('Görsel boyutu en fazla 8MB olabilir.');
      return;
    }

    setImageFile(file);
    setFormError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearPhoto = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Resolve Subject Name
  const resolveSubjectName = (id: string): string => {
    const match = ALL_CURRICULUM_SUBJECTS.find((s) => s.id === id);
    return match ? match.name : 'Ders Çalışması';
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!subjectId) {
      setFormError('Lütfen listeden bir ders / branş seçiniz.');
      return;
    }

    if (!imagePreview) {
      setFormError('Koç onayı için çözülen soru föyü veya çalışma notu fotoğrafı zorunludur.');
      return;
    }

    if (durationMinutes <= 0 && questionCount <= 0) {
      setFormError('Lütfen çalışma süresi veya çözülen soru sayısını giriniz.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const subjectName = resolveSubjectName(subjectId);

      // Upload image to Storage or use base64 fallback
      let photoUrl = imagePreview;
      if (imageFile) {
        photoUrl = await studyProofService.uploadProofPhoto(studentPrimaryId, imageFile);
      }

      await studyProofService.submitStudyProof({
        student_id: studentPrimaryId,
        coach_id: coachId,
        subject_id: subjectId,
        subject_name: subjectName,
        study_type: studyType,
        duration_minutes: durationMinutes,
        question_count: questionCount,
        study_note: studyNote.trim() || undefined,
        proof_photo_url: photoUrl,
        calculated_xp: estimatedXP,
      });

      setToastMessage({
        type: 'success',
        text: `Çalışma kaydınız başarıyla kaydedildi! Koç onayladığında +${estimatedXP} XP hesabınıza tanımlanacaktır.`,
      });

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Çalışma kaydı gönderilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const totalMinutes = useMemo(() => {
    return proofs.reduce((sum, p) => sum + (Number(p.duration_minutes) || 0), 0);
  }, [proofs]);

  const totalQuestions = useMemo(() => {
    return proofs.reduce((sum, p) => sum + (Number(p.question_count) || 0), 0);
  }, [proofs]);

  const approvedXP = useMemo(() => {
    return proofs
      .filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + (Number(p.calculated_xp) || 0), 0);
  }, [proofs]);

  const filteredProofs = useMemo(() => {
    if (statusFilter === 'all') return proofs;
    return proofs.filter((p) => p.status === statusFilter);
  }, [proofs, statusFilter]);

  if (loading) {
    return <LoadingState message="Çalışma kayıtlarınız yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-sm animate-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            Öğrenci Çalışma Paneli
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Çalışma Kayıtlarım & Fotoğraflı Kanıtlar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Çözdüğün soru föyleri, konu tekrarları ve etüt fotoğraflarını yükle; koçun onaylayıp XP tanımlasın.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link to="/student/study-focus">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Clock className="w-4 h-4 text-amber-500" />}
              className="text-xs font-semibold"
            >
              Odaklanma (Pomodoro)
            </Button>
          </Link>
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              handleOpenModal();
              setIsModalOpen(true);
            }}
            className="text-xs font-semibold shadow-xs cursor-pointer"
          >
            + Yeni Çalışma Kaydı Ekle
          </Button>
        </div>
      </div>

      {/* Pomodoro Guide Banner */}
      <div className="bg-linear-to-r from-amber-50 via-amber-50/60 to-orange-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Canlı Sayaçla Çalışmak İster misin?
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Pomodoro sayacı, sakinleştirici çan sesleri ve mola döngüleriyle çalışmak için odak sayfasına geçebilirsin.
            </p>
          </div>
        </div>
        <Link
          to="/student/study-focus"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 px-3 py-2 rounded-xl bg-white border border-amber-200 shadow-xs shrink-0 self-start sm:self-auto hover:bg-amber-50/50 transition-colors"
        >
          <span>Pomodoro Sayacına Git</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-slate-200/80 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Toplam Kayıt</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{proofs.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Yüklenen çalışma belgesi</div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Toplam Çalışma</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">{totalMinutes} dk</div>
          <div className="text-[11px] text-slate-400 mt-1">{(totalMinutes / 60).toFixed(1)} saat net çalışma</div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Çözülen Soru</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700">{totalQuestions}</div>
          <div className="text-[11px] text-slate-400 mt-1">Fotoğraflı soru sayısı</div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Kazanılan XP</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">+{approvedXP} XP</div>
          <div className="text-[11px] text-slate-400 mt-1">Koç tarafından onaylandı</div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tümü ({proofs.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'pending'
                ? 'bg-white text-amber-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Onay Bekleyenler ({proofs.filter((p) => p.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'approved'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Onaylananlar ({proofs.filter((p) => p.status === 'approved').length})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'rejected'
                ? 'bg-white text-rose-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reddedilenler ({proofs.filter((p) => p.status === 'rejected').length})
          </button>
        </div>
      </div>

      {/* Proofs Grid / List */}
      {proofs.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-300 bg-white">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Henüz çalışma kaydı bulunmuyor</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Çözdüğün testin veya çalıştığın konunun fotoğrafını yükleyerek ilk kaydını oluşturabilirsin.
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenModal}
            className="text-xs font-semibold shadow-xs cursor-pointer"
          >
            + İlk Çalışma Kaydını Ekle
          </Button>
        </Card>
      ) : filteredProofs.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-slate-300 bg-white">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Bu filtrede kayıt bulunamadı</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Seçtiğiniz filtreleme durumuna ait çalışma kaydı henüz yok.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="text-xs font-semibold cursor-pointer"
          >
            Tüm Kayıtları Göster
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProofs.map((item) => (
            <Card
              key={item.id}
              className="p-4 border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Subject & Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.subject_name}</h4>
                    <span className="text-[11px] font-medium text-slate-500 block">
                      {item.study_type || 'Soru Çözümü'} • {new Date(item.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {item.status === 'pending' && (
                    <Badge variant="warning" className="font-semibold shrink-0 text-xs">
                      Onay Bekliyor
                    </Badge>
                  )}
                  {item.status === 'approved' && (
                    <Badge variant="success" className="font-semibold shrink-0 text-xs">
                      Onaylandı (+{item.calculated_xp} XP)
                    </Badge>
                  )}
                  {item.status === 'rejected' && (
                    <Badge variant="danger" className="font-semibold shrink-0 text-xs">
                      Reddedildi
                    </Badge>
                  )}
                </div>

                {/* Photo Thumbnail */}
                <div
                  onClick={() => setInspectProof(item)}
                  className="relative group cursor-pointer rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 mb-3"
                >
                  <img
                    src={item.proof_photo_url}
                    alt={item.subject_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                    <Eye className="w-4 h-4" />
                    <span>Fotoğrafı Büyüt</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-slate-600">
                      Süre: <strong className="text-slate-900">{item.duration_minutes} dk</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="text-slate-600">
                      Soru: <strong className="text-slate-900">{item.question_count} adet</strong>
                    </span>
                  </div>
                </div>

                {/* Student Note */}
                {item.study_note && (
                  <p className="text-xs text-slate-600 italic bg-amber-50/40 p-2 rounded-lg border border-amber-100 mb-3">
                    "{item.study_note}"
                  </p>
                )}

                {/* Coach Feedback Note */}
                {item.coach_feedback && (
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-start gap-2 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900 block">Koç Geri Bildirimi:</span>
                      <span>{item.coach_feedback}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Değer: {item.calculated_xp} XP
                </span>
                <button
                  onClick={() => setInspectProof(item)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                >
                  Detayı İncele
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Study Proof Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Yeni Çalışma Kaydı Ekle (Fotoğraflı Kanıt)"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          {/* Subject Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Çalışılan Branş / Ders <span className="text-rose-500">*</span>
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="" disabled>
                Lütfen ders seçiniz...
              </option>
              {programSubjects.isGrouped ? (
                <>
                  <optgroup label="YKS / TYT / AYT Branşları">
                    {programSubjects.yks.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="LGS Branşları">
                    {programSubjects.lgs.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </optgroup>
                </>
              ) : (
                programSubjects.subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Study Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Çalışma Türü <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STUDY_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setStudyType(type)}
                  className={`p-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    studyType === type
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Questions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Çalışma Süresi (Dakika)"
                type="number"
                min={5}
                max={480}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-[11px] text-slate-400 block mt-1">Örn: 30, 45, 60 dk</span>
            </div>

            <div>
              <Input
                label="Çözülen Soru Sayısı"
                type="number"
                min={0}
                max={500}
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-[11px] text-slate-400 block mt-1">Soru çözümü yoksa 0 girin</span>
            </div>
          </div>

          {/* Study Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Çalışma Detayı & Notun (İsteğe bağlı)
            </label>
            <textarea
              rows={2}
              value={studyNote}
              onChange={(e) => setStudyNote(e.target.value)}
              placeholder="Hangi konuyu çalıştın? Hangi föyü bitirdin? Yapamadığın sorular oldu mu?"
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Mandatory Photo Proof Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Fotoğraflı Çalışma Kanıtı <span className="text-rose-500">* (Zorunlu)</span>
            </label>

            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-50">
                <img
                  src={imagePreview}
                  alt="Önizleme"
                  className="w-full max-h-56 object-contain bg-slate-900/5"
                />
                <button
                  type="button"
                  onClick={handleClearPhoto}
                  className="absolute top-2 right-2 bg-rose-600 text-white p-1.5 rounded-full shadow hover:bg-rose-700 transition-colors"
                  title="Fotoğrafı Kaldır"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-amber-500 hover:bg-amber-50/30 transition-all text-center group">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  Fotoğraf Yükle veya Kamera ile Çek
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Çözülen test föyü, soru bankası veya defter sayfası (JPG, PNG, max 8MB)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelect}
                  required
                />
              </label>
            )}
          </div>

          {/* XP Preview Banner */}
          <div className="p-3.5 rounded-2xl bg-linear-to-r from-amber-50 to-emerald-50 border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Tahmini Hak Edilen Ödül:
                </span>
                <span className="text-[11px] text-slate-600">
                  Koç inceleyip onayladığında tek seferde yansır.
                </span>
              </div>
            </div>
            <span className="text-base font-black text-emerald-800 bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-2xs">
              +{estimatedXP} XP
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
              className="text-xs font-semibold"
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
              leftIcon={<Upload className="w-4 h-4" />}
              className="text-xs font-semibold"
            >
              {submitting ? 'Yükleniyor...' : 'Koçun Onayına Gönder'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Inspect Lightbox Modal */}
      {inspectProof && (
        <Modal
          isOpen={!!inspectProof}
          onClose={() => setInspectProof(null)}
          title={`Çalışma Kanıtı: ${inspectProof.subject_name}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[60vh]">
              <img
                src={inspectProof.proof_photo_url}
                alt={inspectProof.subject_name}
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Ders</span>
                <strong className="text-slate-900">{inspectProof.subject_name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Tür</span>
                <strong className="text-slate-900">{inspectProof.study_type || 'Soru Çözümü'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Süre & Soru</span>
                <strong className="text-slate-900">
                  {inspectProof.duration_minutes} dk / {inspectProof.question_count} soru
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Durum & XP</span>
                <strong className="text-emerald-700">+{inspectProof.calculated_xp} XP</strong>
              </div>
            </div>

            {inspectProof.study_note && (
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 text-xs text-slate-700">
                <span className="font-semibold block text-slate-900 mb-0.5">Öğrenci Notu:</span>
                <p className="italic">"{inspectProof.study_note}"</p>
              </div>
            )}

            {inspectProof.coach_feedback && (
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700">
                <span className="font-semibold block text-slate-900 mb-0.5">Koç Değerlendirmesi:</span>
                <p>{inspectProof.coach_feedback}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectProof(null)}
                className="text-xs font-semibold"
              >
                Kapat
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
