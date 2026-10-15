import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, LogOut, Flame, Zap, Award, Coins, User } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { xpService } from '../services/xpService';
import { StudentXPData } from '../types';
import { calculateLevel, DAILY_XP_HARD_CAP } from '../utils/xpEngine';
import { Button } from './ui/Button';
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, profile, role, signOut } = useAuth();
  const [xpData, setXpData] = useState<StudentXPData | null>(null);

  useEffect(() => {
    if (role === 'student' && (user?.id || profile?.id)) {
      const studentPrimaryId = profile?.id || user?.id || '';
      const studentSecondaryId = user?.id !== profile?.id ? user?.id : undefined;

      const fetchXP = () => {
        xpService.getStudentXP(studentPrimaryId, studentSecondaryId).then(setXpData).catch(() => {});
      };

      fetchXP();
      window.addEventListener('mahfaza:xp-updated', fetchXP);
      window.addEventListener('mahfaza:new_notification', fetchXP);
      window.addEventListener('mahfaza:counts-updated', fetchXP);
      return () => {
        window.removeEventListener('mahfaza:xp-updated', fetchXP);
        window.removeEventListener('mahfaza:new_notification', fetchXP);
        window.removeEventListener('mahfaza:counts-updated', fetchXP);
      };
    }
  }, [role, user?.id, profile?.id]);

  const levelInfo = xpData ? calculateLevel(xpData.lifetime_xp) : null;

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 focus-visible:outline-none"
          aria-label="Menüyü Aç"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Akademik İşletim Sistemi</span>
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight capitalize">
            {role ? `${role} Portalı` : 'Mahfaza.co'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        {/* Student Gamification Bar in Header */}
        {role === 'student' && xpData && (
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            {/* Streak */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 text-amber-800 px-2.5 py-1 rounded-xl shadow-xs" title="Aktif Günlük Seri">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span className="font-bold tabular-nums">{xpData.current_streak_days} Gün</span>
            </div>

            {/* Wallet XP */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-xl shadow-xs" title="Kullanılabilir Cüzdan Bakiyesi">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="font-bold tabular-nums">{xpData.wallet_xp} XP</span>
            </div>

            {/* Level */}
            {levelInfo && (
              <div className="hidden md:flex items-center gap-1.5 bg-indigo-50 border border-indigo-200/80 text-indigo-900 px-2.5 py-1 rounded-xl shadow-xs" title={`Seviye ${levelInfo.level}: ${levelInfo.title}`}>
                <Award className="w-4 h-4 text-indigo-600" />
                <span className="font-bold">Lv.{levelInfo.level}</span>
                <span className="text-indigo-600/80 text-[11px] font-medium hidden lg:inline">({levelInfo.title})</span>
              </div>
            )}

            {/* Today's Cap Indicator */}
            <div className="hidden xl:flex items-center gap-1.5 text-slate-500 text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl" title="Bugünkü Kalan XP Kotası (Günlük Azami: 150 XP)">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Kota:</span>
              <span className="text-amber-600 font-bold tabular-nums">{xpData.today_earned_xp}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 tabular-nums">150 XP</span>
            </div>
          </div>
        )}

        {/* Notification Bell Dropdown */}
        <NotificationDropdown />

        {/* User Profile Info & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-2 sm:pl-4">
          <Link
            to="/profile"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Profilimi Görüntüle"
          >
            <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-bold text-xs overflow-hidden shrink-0 shadow-xs">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.first_name?.charAt(0) || <User className="w-4 h-4 text-amber-700" />
              )}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">
                {profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Kullanıcı'}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                {profile?.email || user?.email}
              </div>
            </div>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            title="Güvenli Çıkış Yap"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
            aria-label="Çıkış Yap"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
