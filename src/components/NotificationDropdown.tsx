import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabase';
import { AppNotification } from '../types';
import { Bell, Check, CheckCheck, X, Sparkles, Award, BookOpen, AlertTriangle } from 'lucide-react';

export const NotificationDropdown: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // 15s poll

    // Listen for local custom event
    const handleLocalNotif = () => {
      loadNotifications();
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
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
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
        className="relative p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-900 focus-visible:outline-none transition-colors"
        title="Bildirimler"
        aria-label="Bildirimler"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-zinc-950 font-bold text-[9px] flex items-center justify-center font-mono animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-auto sm:translate-x-0 mt-2 w-80 sm:w-96 bg-zinc-900/95 border border-zinc-800 rounded-xl shadow-2xl z-50 backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-200">Bildirimler</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono font-semibold">
                  {unreadCount} yeni
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Tümünü Okundu Say
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-850">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 space-y-1">
                <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-1.5" />
                <p>Henüz bildirim bulunmuyor.</p>
                <span className="text-[10px] text-zinc-600">Ödev ve seans bildirimleriniz burada görünür.</span>
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
                    n.is_read ? 'bg-zinc-900/40 hover:bg-zinc-850/40' : 'bg-zinc-850/80 hover:bg-zinc-800'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 mt-0.5">
                    {getIconForType(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4
                        className={`text-xs ${
                          n.is_read ? 'text-zinc-300 font-normal' : 'text-zinc-100 font-semibold'
                        }`}
                      >
                        {n.title}
                      </h4>
                      {!n.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          className="text-zinc-500 hover:text-amber-400 p-0.5"
                          title="Okundu İşaretle"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <span className="text-[9px] text-zinc-500 font-mono mt-1 block">
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
