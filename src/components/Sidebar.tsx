import React from 'react';
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
  HelpCircle,
  X,
  MessageSquare,
  Megaphone,
  CreditCard,
  Briefcase,
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  role: UserRole;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, isOpen, onClose }) => {
  const getNavLinks = () => {
    switch (role) {
      case 'admin':
        return [
          { to: '/admin/dashboard', label: 'Yönetim Masası', icon: LayoutDashboard },
          { to: '/admin/applications', label: 'Eğitimci Başvuruları', icon: Briefcase },
          { to: '/admin/classes', label: 'Sınıflar & Program', icon: Calendar },
          { to: '/admin/content', label: 'Müfredat & İçerik', icon: BookOpen },
          { to: '/admin/announcements', label: 'Duyurular', icon: Megaphone },
          { to: '/admin/subscriptions', label: 'Abonelik & Lisans', icon: CreditCard },
          { to: '/admin/users', label: 'Kullanıcı Yönetimi', icon: Users },
          { to: '/messages', label: 'Mesajlar', icon: MessageSquare },
          { to: '/admin/attendance', label: 'Yoklama Takibi', icon: CheckSquare },
          { to: '/admin/rewards', label: 'Ödüller & Onaylar', icon: Gift },
          { to: '/admin/audit', label: 'Sistem Denetim Logu', icon: ShieldAlert },
        ];
      case 'teacher':
        return [
          { to: '/teacher/dashboard', label: 'Öğretmen Masası', icon: LayoutDashboard },
          { to: '/teacher/schedule', label: 'Haftalık Program', icon: Calendar },
          { to: '/teacher/content', label: 'Ders Materyalleri', icon: BookOpen },
          { to: '/messages', label: 'Mesajlar', icon: MessageSquare },
          { to: '/teacher/attendance', label: 'Yoklama Al', icon: CheckSquare },
          { to: '/teacher/homework', label: 'Ödev & Değerlendirme', icon: BookOpen },
          { to: '/teacher/exams', label: 'Sınav Girişi', icon: GraduationCap },
        ];
      case 'counselor':
        return [
          { to: '/counselor/dashboard', label: 'Rehberlik Masası', icon: LayoutDashboard },
          { to: '/counselor/notes', label: 'Özel Rehberlik Notları', icon: ClipboardList },
          { to: '/counselor/students', label: 'Öğrenci Profilleri', icon: Users },
          { to: '/messages', label: 'Mesajlar', icon: MessageSquare },
          { to: '/counselor/interviews', label: 'Görüşme Takvimi', icon: Calendar },
        ];
      case 'coach':
      case 'head_coach':
        return [
          { to: '/coach/dashboard', label: 'Komuta Merkezi', icon: LayoutDashboard },
          { to: '/coach/students', label: 'Öğrenci Portföyüm', icon: Users },
          { to: '/coach/approvals', label: 'XP & Ödül Onayları', icon: CheckSquare },
          { to: '/coach/tasks', label: 'Koçluk Görevleri', icon: ClipboardList },
          { to: '/coach/rewards', label: '🎁 Ödül Yönetimi', icon: Gift },
          { to: '/coach/parent-meetings', label: 'Veli Görüşmeleri', icon: Users },
          { to: '/coach/analytics', label: 'AI Analiz & Raporlama', icon: Sparkles },
          { to: '/messages', label: 'Mesajlar', icon: MessageSquare },
        ];
      case 'student':
        return [
          { to: '/student/dashboard', label: 'Kumanda Merkezi', icon: LayoutDashboard },
          { to: '/student/learning', label: 'Derslerim & İçerikler', icon: BookOpen },
          { to: '/messages', label: 'Mesajlar', icon: MessageSquare },
          { to: '/student/sessions', label: 'Çalışma & Odaklanma', icon: Clock },
          { to: '/student/schedule', label: 'Ders Programım', icon: Calendar },
          { to: '/student/homework', label: 'Ödevlerim & Görevler', icon: CheckSquare },
          { to: '/student/exams', label: 'Deneme Sonuçları', icon: Target },
          { to: '/student/rewards', label: 'Mahfaza Ödül Vitrini', icon: Gift },
          { to: '/student/xp', label: 'XP & İlerleme', icon: Award },
          { to: '/pricing', label: 'Üyelik Paketleri', icon: CreditCard },
        ];
      case 'parent':
        return [
          { to: '/parent/dashboard', label: 'Veli Takip Masası', icon: LayoutDashboard },
          { to: '/messages', label: 'Öğretmenle İletişim', icon: MessageSquare },
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
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <span className="font-serif font-bold text-amber-400 text-sm tracking-widest">M</span>
            </div>
            <div>
              <span className="font-serif font-bold tracking-wider text-zinc-100 text-sm">MAHFAZA</span>
              <span className="text-amber-400 font-mono text-xs">.CO</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-zinc-400 hover:text-zinc-200 p-1"
            aria-label="Menüyü Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Methodology Slogan */}
        <div className="px-5 py-3 border-b border-zinc-900 bg-zinc-950/40">
          <p className="text-[11px] font-medium text-zinc-400 leading-tight">
            Planını Kur. Disiplinini Koru. Hedefine Ulaş.
          </p>
          <span className="text-[10px] text-amber-500/80 tracking-wide mt-0.5 block">
            Mahfaza.co Metodolojisi
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded transition-colors ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-300 border-l-2 border-amber-400'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Role Information */}
        <div className="p-4 border-t border-zinc-900 text-xs text-zinc-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400">Aktif Rol</span>
            <span className="font-medium text-amber-400 capitalize">{role}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
