import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  CheckSquare,
  Gift,
  ShieldAlert,
  BookOpen,
  Award,
  GraduationCap,
  Sparkles,
  ClipboardList,
  Target,
  Clock,
  FileText,
  X,
  MessageSquare,
  Megaphone,
  CreditCard,
  Briefcase,
  Scan,
} from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../features/auth/AuthContext';
import { messagingService } from '../services/messagingService';
import { relationshipService } from '../services/relationshipService';
import { studyProofService } from '../services/studyProofService';
import { coachMeetingService } from '../services/coachMeetingService';
import { coachTaskService } from '../services/coachTaskService';
import { supabase } from '../lib/supabase';
import { MahfazaLogo } from '../utils/logoConstants';

interface SidebarProps {
  role: UserRole;
  isOpen: boolean;
  onClose: () => void;
}

interface NavLinkItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, isOpen, onClose }) => {
  const { user } = useAuth();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [scheduledMeetingsCount, setScheduledMeetingsCount] = useState<number>(0);
  const [studentPendingTasksCount, setStudentPendingTasksCount] = useState<number>(0);

  const fetchBadgeCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      // 1. Unread messages for any role (only show when actual unread messages > 0)
      const unreadMsgs = await messagingService.getUnreadMessageCount(user.id).catch(() => 0);
      setUnreadMessagesCount(unreadMsgs > 0 ? unreadMsgs : 0);

      // 2. Coach-specific counts (pending photo study proofs & scheduled parent meetings)
      if (role === 'coach' || role === 'head_coach') {
        const assignedStudents = await relationshipService
          .getCoachAssignedStudents(user.id)
          .catch(() => []);
        const studentIds = assignedStudents.map((s) => s.id);

        const [proofs, meetings] = await Promise.all([
          studyProofService.getCoachStudyProofs(user.id, studentIds).catch(() => []),
          coachMeetingService.getMeetingsForCoach(user.id).catch(() => []),
        ]);

        const pendingProofs = (proofs || []).filter((p) => p.status === 'pending').length;
        setPendingApprovalsCount(pendingProofs > 0 ? pendingProofs : 0);

        const upcomingMeetings = (meetings || []).filter(
          (m) => m.status === 'Planlandı' || m.status === 'scheduled'
        ).length;
        setScheduledMeetingsCount(upcomingMeetings > 0 ? upcomingMeetings : 0);
      }

      // 3. Student-specific counts (pending assigned tasks)
      if (role === 'student') {
        const tasks = await coachTaskService.getTasksForStudent(user.id).catch(() => []);
        const pendingCount = (tasks || []).filter((t) => t.status === 'pending').length;
        setStudentPendingTasksCount(pendingCount > 0 ? pendingCount : 0);
      }
    } catch {
      // Gracefully silent on transient network errors
    }
  }, [user?.id, role]);

  useEffect(() => {
    fetchBadgeCounts();

    // Backup sync every 60 seconds (realtime channel and events handle instant updates)
    const interval = setInterval(fetchBadgeCounts, 60000);

    // Custom application event listener for instant badge updates on read/delete/approve
    const handleSyncEvent = () => {
      fetchBadgeCounts();
    };
    window.addEventListener('mahfaza:counts-updated', handleSyncEvent);

    // Real-time Supabase channel subscription
    let channel: any = null;
    if (user?.id) {
      channel = supabase
        .channel(`sidebar-sync-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          () => fetchBadgeCounts()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'study_proofs' },
          () => fetchBadgeCounts()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          () => fetchBadgeCounts()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'parent_meetings' },
          () => fetchBadgeCounts()
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('mahfaza:counts-updated', handleSyncEvent);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchBadgeCounts, user?.id]);

  const getNavLinks = (): NavLinkItem[] => {
    switch (role) {
      case 'admin':
        return [
          { to: '/admin/dashboard', label: 'Kurum Dashboard (Müdür)', icon: LayoutDashboard },
          { to: '/admin/users', label: 'Kullanıcı Yönetimi', icon: Users },
          { to: '/admin/teachers', label: 'Öğretmen Kadrosu', icon: GraduationCap },
          { to: '/admin/classes', label: 'Sınıflar & Branşlar', icon: Calendar },
          { to: '/admin/timetable', label: 'Ders Dağıtmatik (AI)', icon: Sparkles },
          { to: '/admin/attendance', label: 'Yoklama & Devamsızlık', icon: CheckSquare },
          { to: '/admin/exams', label: 'Optik Okuyucu & Sınavlar', icon: Scan },
          { to: '/admin/audit', label: 'Kurum Raporları', icon: ShieldAlert },
          { to: '/admin/announcements', label: 'Kurum Duyuruları', icon: Megaphone },
          { to: '/admin/content', label: 'Müfredat & İçerik', icon: BookOpen },
          { to: '/admin/applications', label: 'Eğitimci Başvuruları', icon: Briefcase },
          { to: '/admin/subscriptions', label: 'Abonelik & Lisans', icon: CreditCard },
          { to: '/messages', label: 'Mesajlar', icon: MessageSquare, badge: unreadMessagesCount },
        ];
      case 'teacher':
        return [
          { to: '/teacher/dashboard', label: 'Öğretmen Masası', icon: LayoutDashboard },
          { to: '/teacher/schedule', label: 'Haftalık Program', icon: Calendar },
          { to: '/teacher/content', label: 'Ders Materyalleri', icon: BookOpen },
          { to: '/messages', label: 'Mesajlar', icon: MessageSquare, badge: unreadMessagesCount },
          { to: '/teacher/attendance', label: 'Yoklama Al', icon: CheckSquare },
          { to: '/teacher/homework', label: 'Ödev & Değerlendirme', icon: BookOpen },
          { to: '/teacher/exams', label: 'Sınav Girişi', icon: GraduationCap },
        ];
      case 'counselor':
        return [
          { to: '/counselor/dashboard', label: 'Rehberlik Masası', icon: LayoutDashboard },
          { to: '/counselor/notes', label: 'Özel Rehberlik Notları', icon: ClipboardList },
          { to: '/counselor/students', label: 'Öğrenci Profilleri', icon: Users },
          { to: '/counselor/exams', label: 'Optik Sınav Karneleri', icon: Scan },
          { to: '/messages', label: 'Mesajlar', icon: MessageSquare, badge: unreadMessagesCount },
          { to: '/counselor/interviews', label: 'Görüşme Takvimi', icon: Calendar },
        ];
      case 'coach':
      case 'head_coach':
        return [
          { to: '/coach/dashboard', label: 'Komuta Merkezi', icon: LayoutDashboard },
          { to: '/coach/students', label: 'Öğrenci Portföyüm', icon: Users },
          {
            to: '/coach/approvals',
            label: 'Onay Merkezi (XP & Kanıt)',
            icon: CheckSquare,
            badge: pendingApprovalsCount,
          },
          { to: '/coach/tasks', label: 'Koçluk Görevleri', icon: ClipboardList },
          { to: '/coach/rewards', label: 'Ödül Yönetimi', icon: Gift },
          {
            to: '/coach/parent-meetings',
            label: 'Veli Görüşmeleri',
            icon: Users,
            badge: scheduledMeetingsCount,
          },
          { to: '/coach/analytics', label: 'AI Analiz & Raporlama', icon: Sparkles },
          { to: '/messages', label: 'Mesajlar', icon: MessageSquare, badge: unreadMessagesCount },
        ];
      case 'student':
        return [
          { to: '/student/dashboard', label: 'Kumanda Merkezi', icon: LayoutDashboard },
          { to: '/student/study-logs', label: 'Çalışma Kayıtlarım', icon: FileText },
          { to: '/student/study-focus', label: 'Odaklanma (Pomodoro)', icon: Clock },
          { to: '/student/learning', label: 'Derslerim & İçerikler', icon: BookOpen },
          { to: '/messages', label: 'Mesajlar', icon: MessageSquare, badge: unreadMessagesCount },
          { to: '/student/schedule', label: 'Ders Programım', icon: Calendar },
          {
            to: '/student/homework',
            label: 'Ödevlerim & Görevler',
            icon: CheckSquare,
            badge: studentPendingTasksCount,
          },
          { to: '/student/exams', label: 'Deneme Sonuçları', icon: Target },
          { to: '/student/rewards', label: 'Mahfaza Ödül Vitrini', icon: Gift },
          { to: '/student/xp', label: 'XP & İlerleme', icon: Award },
          { to: '/pricing', label: 'Üyelik Paketleri', icon: CreditCard },
        ];
      case 'parent':
        return [
          { to: '/parent/dashboard', label: 'Veli Takip Masası', icon: LayoutDashboard },
          {
            to: '/messages',
            label: 'Öğretmenle İletişim',
            icon: MessageSquare,
            badge: unreadMessagesCount,
          },
          { to: '/parent/attendance', label: 'Devamsızlık', icon: CheckSquare },
          { to: '/parent/homework', label: 'Ödevler', icon: BookOpen },
          { to: '/parent/exams', label: 'Sınav Karnesi', icon: GraduationCap },
          { to: '/pricing', label: 'Paketler', icon: CreditCard },
        ];
      default:
        return [];
    }
  };

  const links = getNavLinks();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 shadow-sm flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <MahfazaLogo size="md" />
            <div>
              <div className="flex items-center gap-1 leading-none">
                <span className="font-serif font-black tracking-wider text-slate-900 text-sm">
                  MAHFAZA
                </span>
                <span className="text-amber-600 font-mono font-bold text-xs">.CO</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Akademik Platform</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            aria-label="Menüyü Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Methodology Slogan */}
        <div className="px-5 py-2.5 border-b border-slate-100 bg-amber-50/40">
          <p className="text-[11px] font-medium text-slate-700 leading-tight">
            Planını Kur. Disiplinini Koru. Hedefine Ulaş.
          </p>
          <span className="text-[10px] font-semibold text-amber-700 tracking-wide mt-0.5 block">
            Mahfaza.co Metodolojisi
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const badgeCount = link.badge && link.badge > 0 ? link.badge : 0;

            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-amber-50 text-amber-800 font-semibold border-r-2 border-amber-500 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">{link.label}</span>
                </div>

                {badgeCount > 0 && (
                  <span
                    className="ml-auto shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shadow-xs ring-2 ring-rose-100"
                    aria-label={`${badgeCount} bildirim`}
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Role Information */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Aktif Rol
            </span>
            <span className="font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full capitalize">
              {role}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
