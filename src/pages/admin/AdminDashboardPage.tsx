import React, { useEffect, useState, useCallback } from 'react';
import { relationshipService } from '../../services/relationshipService';
import { academicService } from '../../services/academicService';
import { rewardService } from '../../services/rewardService';
import { attendanceService } from '../../services/attendanceService';
import { Profile, AcademicClass, RewardRequest } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Users,
  GraduationCap,
  Calendar,
  Gift,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  BookOpen,
  Megaphone,
  CreditCard,
  Briefcase,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const [students, setStudents] = useState<Profile[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [counselors, setCounselors] = useState<Profile[]>([]);
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Approval state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [allUsers, cls, reqs] = await Promise.all([
        relationshipService.getAllUsersAdmin(),
        academicService.getClasses(),
        rewardService.getAllRequestsAdmin(),
      ]);

      setStudents(allUsers.filter((u) => u.role === 'student'));
      setTeachers(allUsers.filter((u) => u.role === 'teacher'));
      setCounselors(allUsers.filter((u) => u.role === 'counselor'));
      setCoaches(allUsers.filter((u) => u.role === 'coach'));
      setParents(allUsers.filter((u) => u.role === 'parent'));
      setClasses(cls);
      setPendingRequests(reqs.filter((r) => r.status === 'pending'));
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleApproveReward = async (requestId: string) => {
    setProcessingId(requestId);
    setActionMessage(null);
    try {
      const res = await rewardService.approveRewardAtomic(requestId, 'Yönetici tarafından onaylandı');
      if (res.success) {
        setActionMessage('Ödül talebi onaylandı ve XP cüzdandan atomik olarak düşüldü.');
        await loadAdminData();
      }
    } catch (err: any) {
      setActionMessage(err.message || 'Onaylama sırasında bir hata oluştu.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReward = async (requestId: string) => {
    setProcessingId(requestId);
    setActionMessage(null);
    try {
      await rewardService.rejectRewardRequest(requestId, 'Yönetici tarafından uygun görülmedi.');
      setActionMessage('Talep reddedildi.');
      await loadAdminData();
    } catch (err: any) {
      setActionMessage(err.message || 'Hata oluştu.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <LoadingState message="Yönetici komuta merkezi yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Yönetim & Denetim</span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Yönetim Masası
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Mahfaza.co akademik kadro, öğrenci nüfusu, sınıflar ve ödül onay mekanizması.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NavLink to="/admin/applications">
            <Button variant="secondary" size="sm" leftIcon={<Briefcase className="w-4 h-4" />}>
              Başvurular
            </Button>
          </NavLink>
          <NavLink to="/admin/content">
            <Button variant="secondary" size="sm" leftIcon={<BookOpen className="w-4 h-4" />}>
              Müfredat
            </Button>
          </NavLink>
          <NavLink to="/admin/announcements">
            <Button variant="secondary" size="sm" leftIcon={<Megaphone className="w-4 h-4" />}>
              Duyurular
            </Button>
          </NavLink>
          <NavLink to="/admin/subscriptions">
            <Button variant="secondary" size="sm" leftIcon={<CreditCard className="w-4 h-4" />}>
              Abonelikler
            </Button>
          </NavLink>
          <NavLink to="/admin/classes">
            <Button variant="secondary" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
              Sınıf & Program
            </Button>
          </NavLink>
          <NavLink to="/admin/rewards">
            <Button variant="primary" size="sm" leftIcon={<Gift className="w-4 h-4" />}>
              Ödüller
            </Button>
          </NavLink>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded bg-zinc-900 border border-zinc-750 text-xs text-amber-400 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Operational Metrics Cards (Section 28) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Öğrenciler</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {students.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Aktif öğrenci</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Öğretmenler</span>
            <GraduationCap className="w-4 h-4 text-zinc-300" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {teachers.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Branş kadrosu</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Danışmanlar</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {counselors.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Rehberlik servisi</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Eğitim Koçları</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {coaches.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Bireysel takip</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Veliler</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {parents.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Kayıtlı veli</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Sınıf Şubeleri</span>
            <Calendar className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {classes.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Akademik yapı</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Onay Bekleyen</span>
            <Gift className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {pendingRequests.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Ödül talebi</span>
        </div>
      </div>

      {/* Pending Reward Approval Section (Section 25 & 26) */}
      <Card
        title="Onay Bekleyen Ödül Talepleri"
        subtitle="Öğrenciler tarafından iletilen ve atomik bakiye kontrolü gerektiren talepler"
      >
        {pendingRequests.length === 0 ? (
          <EmptyState
            title="Bekleyen Talep Yok"
            description="Tüm öğrenci ödül talepleri incelendi ve karara bağlandı."
            icon={<CheckCircle2 className="w-6 h-6 text-zinc-500" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-zinc-500 font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Öğrenci</th>
                  <th className="py-2.5 px-3">Talep Edilen Ödül</th>
                  <th className="py-2.5 px-3">Tarih</th>
                  <th className="py-2.5 px-3 text-right">XP Tutarı</th>
                  <th className="py-2.5 px-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-200">
                        {req.student?.first_name} {req.student?.last_name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {req.student?.email}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-zinc-200">{req.reward?.title}</div>
                      <div className="text-[10px] text-zinc-500">
                        Kategori: {req.reward?.category}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-400 font-mono">
                      {new Date(req.requested_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-400 tabular-nums">
                      {req.reward?.xp_price} XP
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={processingId === req.id}
                          onClick={() => handleRejectReward(req.id)}
                          leftIcon={<X className="w-3.5 h-3.5" />}
                        >
                          Reddet
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={processingId === req.id}
                          onClick={() => handleApproveReward(req.id)}
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                        >
                          Atomik Onayla
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Classes & Branches Overview */}
      <Card
        title="Tanımlı Sınıflar"
        subtitle="Akademik şubeler ve sınıf kademeleri"
      >
        {classes.length === 0 ? (
          <EmptyState
            title="Sınıf Bulunmuyor"
            description="Sistemde henüz aktif bir sınıf tanımlanmamış."
            actionText="Yeni Sınıf Oluştur"
            onAction={() => window.location.href = '/admin/classes'}
            icon={<Calendar className="w-6 h-6 text-zinc-500" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {classes.map((cls) => (
              <div key={cls.id} className="p-3 rounded bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-200">{cls.name}</div>
                  <div className="text-[10px] text-zinc-500">{cls.grade_level}. Sınıf · {cls.academic_year}</div>
                </div>
                <Badge variant="amber">Aktif</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
