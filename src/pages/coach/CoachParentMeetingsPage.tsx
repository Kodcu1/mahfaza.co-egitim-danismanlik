import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { coachMeetingService } from '../../services/coachMeetingService';
import { CoachParentMeeting, Profile } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { generateParentMeetingPDF } from '../../utils/parentMeetingPdfGenerator';
import {
  Users,
  Calendar,
  Clock,
  Plus,
  Video,
  Phone,
  MapPin,
  CheckCircle2,
  FileText,
  AlertCircle,
  Edit3,
  Search,
  Sparkles,
  ChevronRight,
  UserCheck,
  Download,
} from 'lucide-react';

export const CoachParentMeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<CoachParentMeeting[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create / Edit Modal State
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  // Form Fields
  const [studentId, setStudentId] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState('16:00');
  const [meetingType, setMeetingType] = useState<'online' | 'in_person' | 'phone'>('online');
  const [meetingStatus, setMeetingStatus] = useState<'Planlandı' | 'Tamamlandı' | 'İptal Edildi'>('Planlandı');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [teacherOpinions, setTeacherOpinions] = useState('');
  const [academicEvaluation, setAcademicEvaluation] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [psychologicalStatus, setPsychologicalStatus] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [nextMeetingDate, setNextMeetingDate] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Detail View Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeMeetingDetail, setActiveMeetingDetail] = useState<CoachParentMeeting | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPDF = (m: CoachParentMeeting) => {
    try {
      setDownloadingId(m.id);
      const studentInfo = assignedStudents.find((s) => s.id === m.student_id);
      const coachName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Koç';
      generateParentMeetingPDF({
        meeting: m,
        student: studentInfo,
        coachName,
      });
    } catch (err: any) {
      console.error('PDF download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [studs, mList] = await Promise.all([
        relationshipService.getCoachAssignedStudents(user.id),
        coachMeetingService.getMeetingsForCoach(user.id),
      ]);
      setAssignedStudents(studs);
      setMeetings(mList);
      if (studs.length > 0 && !studentId) {
        setStudentId(studs[0].id);
      }
    } catch (err) {
      console.error('Error loading coach parent meetings:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingMeetingId(null);
    if (assignedStudents.length > 0) {
      setStudentId(assignedStudents[0].id);
    }
    setMeetingDate(new Date().toISOString().split('T')[0]);
    setMeetingTime('16:00');
    setMeetingType('online');
    setMeetingStatus('Planlandı');
    setParentName('');
    setParentPhone('');
    setTeacherOpinions('');
    setAcademicEvaluation('');
    setRawNotes('');
    setPsychologicalStatus('');
    setActionPlan('');
    setNextMeetingDate('');
    setFeedback(null);
    setErrorFeedback(null);
    setMeetingModalOpen(true);
  };

  const handleOpenEditModal = (meeting: CoachParentMeeting) => {
    setEditingMeetingId(meeting.id);
    setStudentId(meeting.student_id);
    setMeetingDate(meeting.meeting_date ? meeting.meeting_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setMeetingTime(meeting.meeting_time || '16:00');
    setMeetingType(meeting.meeting_type || 'online');
    setMeetingStatus(
      meeting.status === 'Tamamlandı' || meeting.status === 'completed'
        ? 'Tamamlandı'
        : meeting.status === 'İptal Edildi' || meeting.status === 'cancelled'
        ? 'İptal Edildi'
        : 'Planlandı'
    );
    setParentName(meeting.parent_name || '');
    setParentPhone(meeting.parent_phone || '');
    setTeacherOpinions(meeting.teacher_opinions || '');
    setAcademicEvaluation(meeting.academic_evaluation || '');
    setRawNotes(meeting.raw_notes || meeting.notes || '');
    setPsychologicalStatus(meeting.psychological_status || '');
    setActionPlan(meeting.action_plan || meeting.action_items || '');
    setNextMeetingDate(meeting.next_meeting_date ? meeting.next_meeting_date.split('T')[0] : '');
    setFeedback(null);
    setErrorFeedback(null);
    setDetailModalOpen(false);
    setMeetingModalOpen(true);
  };

  const handleOpenDetail = (meeting: CoachParentMeeting) => {
    setActiveMeetingDetail(meeting);
    setDetailModalOpen(true);
  };

  const handleSubmitMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !studentId) return;

    setSubmitting(true);
    setFeedback(null);
    setErrorFeedback(null);

    const studentObj = assignedStudents.find((s) => s.id === studentId);
    const studentFullName = studentObj
      ? `${studentObj.first_name || ''} ${studentObj.last_name || ''}`.trim() || studentObj.email
      : 'Öğrenci';

    try {
      if (editingMeetingId) {
        // Update existing meeting
        await coachMeetingService.updateMeeting(editingMeetingId, {
          meeting_date: meetingDate,
          meeting_time: meetingTime,
          meeting_type: meetingType,
          status: meetingStatus,
          parent_name: parentName.trim() || null,
          parent_phone: parentPhone.trim() || null,
          teacher_opinions: teacherOpinions.trim() || null,
          academic_evaluation: academicEvaluation.trim() || null,
          raw_notes: rawNotes.trim() || null,
          psychological_status: psychologicalStatus.trim() || null,
          action_plan: actionPlan.trim() || null,
          next_meeting_date: nextMeetingDate || null,
        });
        setFeedback('Veli görüşmesi ve notları başarıyla güncellendi!');
      } else {
        // Create new meeting
        await coachMeetingService.scheduleMeeting({
          coach_id: user.id,
          student_id: studentId,
          student_name: studentFullName,
          parent_name: parentName.trim() || undefined,
          parent_phone: parentPhone.trim() || undefined,
          meeting_date: meetingDate,
          meeting_time: meetingTime,
          meeting_type: meetingType,
          status: meetingStatus,
          teacher_opinions: teacherOpinions.trim() || undefined,
          academic_evaluation: academicEvaluation.trim() || undefined,
          raw_notes: rawNotes.trim() || undefined,
          psychological_status: psychologicalStatus.trim() || undefined,
          action_plan: actionPlan.trim() || undefined,
          next_meeting_date: nextMeetingDate || undefined,
          student: studentObj,
        });
        setFeedback('Veli görüşmesi başarıyla kaydedildi!');
      }

      await loadData();
      setTimeout(() => {
        setMeetingModalOpen(false);
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      setErrorFeedback(err.message || 'Görüşme kaydedilirken bir hata meydana geldi.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    if (selectedStudentFilter !== 'all' && m.student_id !== selectedStudentFilter) {
      return false;
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'Planlandı' && (m.status === 'Planlandı' || m.status === 'scheduled')) return true;
      if (statusFilter === 'Tamamlandı' && (m.status === 'Tamamlandı' || m.status === 'completed')) return true;
      if (statusFilter === 'İptal Edildi' && (m.status === 'İptal Edildi' || m.status === 'cancelled')) return true;
      return false;
    }
    return true;
  });

  if (loading) {
    return <LoadingState message="Veli görüşmeleri ve geçmiş kayıtlar yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
            Veli İletişim & Danışmanlık Protokolü
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Veli Görüşmeleri & Gelişim Takip Merkezi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Öğretmen görüşleri, akademik değerlendirmeler ve veli geri bildirimlerini yapılandırılmış olarak kayıt altına alın.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          Yeni Görüşme Kaydet
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 uppercase mb-1">
            Öğrenciye Göre Filtrele
          </label>
          <select
            value={selectedStudentFilter}
            onChange={(e) => setSelectedStudentFilter(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">Tüm Öğrenciler ({assignedStudents.length})</option>
            {assignedStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name} ({s.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-400 uppercase mb-1">
            Görüşme Durumu
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">Tüm Durumlar ({meetings.length})</option>
            <option value="Planlandı">Planlandı</option>
            <option value="Tamamlandı">Tamamlandı</option>
            <option value="İptal Edildi">İptal Edildi</option>
          </select>
        </div>
      </div>

      {/* Meeting Cards List */}
      {filteredMeetings.length === 0 ? (
        <EmptyState
          title="Kayıtlı Veli Görüşmesi Bulunmuyor"
          description="Seçili filtrelere uygun bir veli görüşmesi bulunamadı. Yeni bir veli görüşmesi planlamak için yukarıdaki butonu kullanın."
          icon={<Users className="w-8 h-8 text-zinc-500" />}
          actionText="Görüşme Planla"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map((m) => {
            const isCompleted = m.status === 'Tamamlandı' || m.status === 'completed';
            const isCancelled = m.status === 'İptal Edildi' || m.status === 'cancelled';
            const studentInfo = assignedStudents.find((s) => s.id === m.student_id);
            const studentDisplayName = studentInfo
              ? `${studentInfo.first_name || ''} ${studentInfo.last_name || ''}`.trim() || studentInfo.email
              : m.student_name || 'Öğrenci';

            return (
              <div
                key={m.id}
                className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[11px] font-mono text-amber-400 font-semibold uppercase block">
                        {studentDisplayName}
                      </span>
                      <h3 className="text-sm font-bold text-zinc-100 mt-0.5 line-clamp-1">
                        {m.title || `Veli Görüşmesi - ${studentDisplayName}`}
                      </h3>
                    </div>

                    <Badge
                      variant={isCompleted ? 'success' : isCancelled ? 'danger' : 'warning'}
                    >
                      {isCompleted ? 'Tamamlandı' : isCancelled ? 'İptal' : 'Planlandı'}
                    </Badge>
                  </div>

                  {/* Date & Type */}
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      {m.meeting_date ? new Date(m.meeting_date).toLocaleDateString('tr-TR') : 'Tarih Yok'}
                      {m.meeting_time ? ` ${m.meeting_time}` : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      {m.meeting_type === 'online' ? (
                        <>
                          <Video className="w-3 h-3 text-sky-400" /> Online
                        </>
                      ) : m.meeting_type === 'phone' ? (
                        <>
                          <Phone className="w-3 h-3 text-emerald-400" /> Telefon
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3 h-3 text-amber-400" /> Yüz Yüze
                        </>
                      )}
                    </span>
                  </div>

                  {/* Highlights Summary */}
                  <div className="space-y-1.5 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded border border-zinc-800/80 mb-3">
                    {m.academic_evaluation ? (
                      <p className="line-clamp-2">
                        <strong className="text-amber-400/90 font-medium">Akademik: </strong>
                        {m.academic_evaluation}
                      </p>
                    ) : null}
                    {m.teacher_opinions ? (
                      <p className="line-clamp-2">
                        <strong className="text-sky-400/90 font-medium">Öğretmen: </strong>
                        {m.teacher_opinions}
                      </p>
                    ) : null}
                    {m.action_plan ? (
                      <p className="line-clamp-2">
                        <strong className="text-emerald-400/90 font-medium">Kararlar: </strong>
                        {m.action_plan}
                      </p>
                    ) : null}
                    {!m.academic_evaluation && !m.teacher_opinions && !m.action_plan && (
                      <span className="text-zinc-500 italic">Detaylı not henüz girilmemiş.</span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleOpenDetail(m)}
                    >
                      Detayları İncele
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      isLoading={downloadingId === m.id}
                      disabled={!!downloadingId}
                      onClick={() => handleDownloadPDF(m)}
                    >
                      PDF İndir
                    </Button>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenEditModal(m)}
                  >
                    Düzenle
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {meetingModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setMeetingModalOpen(false)}
          title={editingMeetingId ? 'Veli Görüşmesini Düzenle' : 'Yeni Veli Görüşmesi Planla & Kaydet'}
          subtitle="Öğretmen görüşleri, akademik gözlemler ve aksiyon planı"
          maxWidth="xl"
        >
          <form onSubmit={handleSubmitMeeting} className="space-y-4 text-xs">
            {/* Student & Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Öğrenci Seçin <span className="text-rose-400">*</span>
                </label>
                <select
                  value={studentId}
                  disabled={Boolean(editingMeetingId)}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500/50"
                  required
                >
                  {assignedStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Görüşme Tarihi <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Saat</label>
                <Input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                />
              </div>
            </div>

            {/* Type & Status & Parent Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Görüşme Türü</label>
                <select
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="online">Online Görüntülü (Meet/Zoom)</option>
                  <option value="phone">Telefon Görüşmesi</option>
                  <option value="in_person">Yüz Yüze Görüşme</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Görüşme Durumu</label>
                <select
                  value={meetingStatus}
                  onChange={(e) => setMeetingStatus(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="Planlandı">Planlandı</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                  <option value="İptal Edildi">İptal Edildi</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Veli Adı / İletişim</label>
                <Input
                  type="text"
                  placeholder="Örn: Ayşe Hanım (Anne)"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                />
              </div>
            </div>

            {/* 1. ÖĞRETMEN GÖRÜŞLERİ */}
            <div>
              <label className="block text-zinc-300 font-semibold mb-1 flex items-center justify-between">
                <span>1. Öğretmen Görüşleri (Koç Manuel Girişi)</span>
                <span className="text-[10px] text-zinc-500 font-normal">Branş öğretmenlerinden derlenen geri bildirimler</span>
              </label>
              <textarea
                value={teacherOpinions}
                onChange={(e) => setTeacherOpinions(e.target.value)}
                placeholder="Matematik, Türkçe ve Fen öğretmenlerinin dersteki katılım, ödev performansı ve eksik konular hakkındaki değerlendirmeleri..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* 2. AKADEMİK GELİŞİM */}
            <div>
              <label className="block text-zinc-300 font-semibold mb-1 flex items-center justify-between">
                <span>2. Akademik Gelişim & Deneme Performansı</span>
                <span className="text-[10px] text-zinc-500 font-normal">Son deneme netleri, hedef yüzdelik dilim ve çalışma süreleri</span>
              </label>
              <textarea
                value={academicEvaluation}
                onChange={(e) => setAcademicEvaluation(e.target.value)}
                placeholder="Son AYT/TYT deneme sınavlarındaki net artışı, konu analizleri ve haftalık soru hedefi gerçekleşme oranı..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* 3. VELİ GÖRÜŞLERİ */}
            <div>
              <label className="block text-zinc-300 font-semibold mb-1 flex items-center justify-between">
                <span>3. Veli Görüşleri & Evdeki Çalışma Düzeni</span>
                <span className="text-[10px] text-zinc-500 font-normal">Velinin aktardığı ev içi gözlemler ve talepler</span>
              </label>
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="Velinin öğrencinin evdeki çalışma ortamı, uyku-beslenme düzeni ve teknoloji kullanımı ile ilgili paylaşımları..."
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* 4. ÖĞRENCİ DURUMU / GÖZLEMLER */}
            <div>
              <label className="block text-zinc-300 font-semibold mb-1 flex items-center justify-between">
                <span>4. Öğrenci Durumu & Motivasyonel Gözlemler</span>
                <span className="text-[10px] text-zinc-500 font-normal">Sınav kaygısı, odaklanma seviyesi ve moral durumu</span>
              </label>
              <textarea
                value={psychologicalStatus}
                onChange={(e) => setPsychologicalStatus(e.target.value)}
                placeholder="Koçluk seanslarında gözlemlenen motivasyon seviyesi, zaman yönetimi becerisi ve psikolojik dayanıklılık..."
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* 5. KARARLAR VE AKSİYONLAR */}
            <div>
              <label className="block text-zinc-300 font-semibold mb-1 flex items-center justify-between">
                <span>5. Kararlar ve Aksiyonlar</span>
                <span className="text-[10px] text-zinc-500 font-normal">Görüşmede mutabık kalınan haftalık/aylık hedefler</span>
              </label>
              <textarea
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="Örn: 1. Günlük paragraf sorusu 30'a çıkarılacak. 2. Hafta sonu 1 adet TYT genel denemesi çözülecek. 3. Veli ile 2 hafta sonra ara kontrol yapılacak..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* 6. SONRAKİ GÖRÜŞME / TAKİP TARİHİ */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                6. Sonraki Görüşme / Takip Tarihi
              </label>
              <Input
                type="date"
                value={nextMeetingDate}
                onChange={(e) => setNextMeetingDate(e.target.value)}
              />
            </div>

            {/* Feedback messages */}
            {feedback && (
              <div className="p-3 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}
            {errorFeedback && (
              <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorFeedback}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setMeetingModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={submitting}
              >
                {editingMeetingId ? 'Güncellemeleri Kaydet' : 'Görüşmeyi Sisteme Kaydet'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DETAIL MODAL */}
      {detailModalOpen && activeMeetingDetail && (
        <Modal
          isOpen={true}
          onClose={() => setDetailModalOpen(false)}
          title={`Veli Görüşmesi Detayı: ${activeMeetingDetail.student_name || 'Öğrenci'}`}
          subtitle={`Tarih: ${new Date(activeMeetingDetail.meeting_date).toLocaleDateString('tr-TR')} &bull; Durum: ${activeMeetingDetail.status}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-zinc-300">
            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Görüşme Türü</span>
                <span className="capitalize">{activeMeetingDetail.meeting_type || 'Online'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Görüşülen Veli</span>
                <span>{activeMeetingDetail.parent_name || 'Belirtilmedi'}</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
              <h4 className="font-bold text-amber-400">1. Öğretmen Görüşleri</h4>
              <p className="whitespace-pre-wrap text-zinc-300">
                {activeMeetingDetail.teacher_opinions || 'Veri bulunmuyor.'}
              </p>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
              <h4 className="font-bold text-amber-400">2. Akademik Gelişim</h4>
              <p className="whitespace-pre-wrap text-zinc-300">
                {activeMeetingDetail.academic_evaluation || 'Veri bulunmuyor.'}
              </p>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
              <h4 className="font-bold text-amber-400">3. Veli Görüşleri</h4>
              <p className="whitespace-pre-wrap text-zinc-300">
                {activeMeetingDetail.raw_notes || activeMeetingDetail.notes || 'Veri bulunmuyor.'}
              </p>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
              <h4 className="font-bold text-amber-400">4. Öğrenci Durumu / Gözlemler</h4>
              <p className="whitespace-pre-wrap text-zinc-300">
                {activeMeetingDetail.psychological_status || 'Veri bulunmuyor.'}
              </p>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
              <h4 className="font-bold text-emerald-400">5. Kararlar ve Aksiyonlar</h4>
              <p className="whitespace-pre-wrap text-zinc-300 font-medium">
                {activeMeetingDetail.action_plan || activeMeetingDetail.action_items || 'Veri bulunmuyor.'}
              </p>
            </div>

            {activeMeetingDetail.next_meeting_date && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Sonraki Görüşme Tarihi</span>
                <span className="font-mono text-amber-400">
                  {new Date(activeMeetingDetail.next_meeting_date).toLocaleDateString('tr-TR')}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="secondary"
                size="sm"
                className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                isLoading={downloadingId === activeMeetingDetail.id}
                disabled={!!downloadingId}
                onClick={() => handleDownloadPDF(activeMeetingDetail)}
              >
                PDF Olarak İndir
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
              >
                Kapat
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                onClick={() => handleOpenEditModal(activeMeetingDetail)}
              >
                Bu Görüşmeyi Düzenle
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
