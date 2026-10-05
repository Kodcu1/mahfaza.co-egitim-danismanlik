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
    if (role === 'student' && user?.id) {
      xpService.getStudentXP(user.id).then(setXpData).catch(() => {});
    }
  }, [role, user?.id]);

  const levelInfo = xpData ? calculateLevel(xpData.lifetime_xp) : null;
  const todayRemaining = xpData ? Math.max(0, DAILY_XP_HARD_CAP - (xpData.today_earned_xp || 0)) : DAILY_XP_HARD_CAP;

  return (
    <header className="h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-900 focus-visible:outline-none"
          aria-label="Menüyü Aç"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Akademik İşletim Sistemi</span>
          <h2 className="text-sm font-semibold text-zinc-200 tracking-tight capitalize">
            {role ? `${role} Portalı` : 'Mahfaza.co'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        {/* Student Gamification Bar in Header */}
        {role === 'student' && xpData && (
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono">
            {/* Streak */}
            <div className="flex items-center gap-1 text-amber-400" title="Aktif Günlük Seri">
              <Flame className="w-4 h-4 fill-amber-400/20" />
              <span className="font-semibold tabular-nums">{xpData.current_streak_days} Gün</span>
            </div>

            {/* Wallet XP */}
            <div className="flex items-center gap-1 text-zinc-200" title="Kullanılabilir Cüzdan Bakiyesi">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-semibold tabular-nums">{xpData.wallet_xp} XP</span>
            </div>

            {/* Level */}
            {levelInfo && (
              <div className="hidden md:flex items-center gap-1 text-zinc-300" title={`Seviye ${levelInfo.level}: ${levelInfo.title}`}>
                <Award className="w-4 h-4 text-amber-400" />
                <span className="font-medium">Lv.{levelInfo.level}</span>
                <span className="text-zinc-500 font-sans text-[11px]">({levelInfo.title})</span>
              </div>
            )}

            {/* Today's Cap Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 text-zinc-400 text-[11px]" title="Bugünkü Kalan XP Kotası (Günlük Azami: 150 XP)">
              <Zap className="w-3.5 h-3.5 text-amber-400/80" />
              <span>Kota:</span>
              <span className="text-amber-400 font-semibold tabular-nums">{xpData.today_earned_xp}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-500 tabular-nums">150 XP</span>
            </div>
          </div>
        )}

        {/* Notification Bell Dropdown */}
        <NotificationDropdown />

        {/* User Profile Info & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3 border-l border-zinc-800/80 pl-2 sm:pl-4">
          <Link
            to="/profile"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Profilimi Görüntüle"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-750 flex items-center justify-center text-amber-400 font-bold text-xs overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.first_name?.charAt(0) || <User className="w-4 h-4 text-zinc-400" />
              )}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-zinc-200 truncate max-w-[120px]">
                {profile ? `${profile.first_name} ${profile.last_name}` : user?.email?.split('@')[0]}
              </div>
              <div className="text-[10px] text-zinc-500 capitalize tracking-wide">{role}</div>
            </div>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-zinc-400 hover:text-rose-400 p-2 h-8 w-8 ml-1"
            title="Oturumu Kapat"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
