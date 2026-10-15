import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabase';
import { AppNotification } from '../types';
import { Bell, Check, CheckCheck, X, Sparkles, Award, BookOpen, AlertTriangle } from 'lucide-react';
import { useNotificationSound } from '../hooks/useNotificationSound';

export const NotificationDropdown: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { playNotificationSound } = useNotificationSound();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [list, count] = await Promise.all([
        notificationService.getNotifications(user.id),
        notificationService.getUnreadCount(user.id),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch {
      // Fallback silently without throwing unhandled console errors
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // 60s backup poll (realtime handles instant updates)

    // Listen for local custom event
    const handleLocalNotif = (e: any) => {
      loadNotifications();
      // Only play sound if notification belongs to current user
      if (!e?.detail?.user_id || e?.detail?.user_id === user?.id) {
        playNotificationSound();
      }
    };
    window.addEventListener('mahfaza:new_notification', handleLocalNotif);

    // Supabase realtime channel subscription
    let channel: any = null;
    if (user?.id) {
      channel = supabase
        .channel(`public:notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadNotifications();
            playNotificationSound();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('mahfaza:new_notification', handleLocalNotif);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadNotifications, user?.id]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id, user?.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignored for optimistic UI
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Ignored for optimistic UI
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'xp':
      case 'reward':
        return <Award className="w-4 h-4 text-amber-400" />;
      case 'homework':
      case 'exam':
        return <BookOpen className="w-4 h-4 text-sky-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 focus-visible:outline-none transition-colors"
        title="Bildirimler"
        aria-label="Bildirimler"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center font-mono animate-pulse shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-auto sm:translate-x-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Bildirimler</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                  {unreadCount} yeni
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Tümünü Okundu Say
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="font-medium text-slate-700">Henüz bildirim bulunmuyor.</p>
                <span className="text-[10px] text-slate-400">Ödev, seans ve sınav bildirimleriniz burada görünür.</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={async () => {
                    if (!n.is_read) {
                      await notificationService.markAsRead(n.id);
                      setNotifications((prev) =>
                        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
                      );
                      setUnreadCount((prev) => Math.max(0, prev - 1));
                    }
                    if (n.link) {
                      setIsOpen(false);
                      navigate(n.link);
                    }
                  }}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                    n.is_read ? 'bg-white hover:bg-slate-50/80' : 'bg-amber-50/30 hover:bg-amber-50/60'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                    {getIconForType(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4
                        className={`text-xs ${
                          n.is_read ? 'text-slate-700 font-medium' : 'text-slate-900 font-bold'
                        }`}
                      >
                        {n.title}
                      </h4>
                      {!n.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          className="text-slate-400 hover:text-amber-600 p-0.5"
                          title="Okundu İşaretle"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                    <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                      {new Date(n.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
