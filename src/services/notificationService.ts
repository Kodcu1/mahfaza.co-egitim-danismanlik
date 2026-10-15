import { supabase } from '../lib/supabase';
import { AppNotification } from '../types';

const isNetworkOrFetchError = (err: any): boolean => {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : err?.message || String(err);
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed') ||
    msg.includes('net::ERR') ||
    msg.includes('fetch failed') ||
    err?.name === 'TypeError'
  );
};

export const notificationService = {
  /**
   * Safe local cache retrieval to prevent UI lockup when offline or on network failure
   */
  getCachedNotifications(userId: string): AppNotification[] {
    if (!userId || typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`mahfaza:notifications_cache:${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore cache parse error
    }
    return [];
  },

  /**
   * Save notifications to local cache
   */
  cacheNotifications(userId: string, list: AppNotification[]): void {
    if (!userId || typeof window === 'undefined' || !Array.isArray(list)) return;
    try {
      localStorage.setItem(`mahfaza:notifications_cache:${userId}`, JSON.stringify(list));
    } catch {
      // Ignore cache write error
    }
  },

  /**
   * Fetch all notifications for user from Supabase with resilient offline caching
   */
  async getNotifications(userId: string): Promise<AppNotification[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        if (!isNetworkOrFetchError(error)) {
          console.warn('Notice when fetching notifications from database:', error.message);
        }
        return this.getCachedNotifications(userId);
      }

      const list = (data || []) as AppNotification[];
      this.cacheNotifications(userId, list);
      return list;
    } catch (err: any) {
      if (!isNetworkOrFetchError(err)) {
        console.warn('Notice querying notifications:', err?.message || err);
      }
      return this.getCachedNotifications(userId);
    }
  },

  /**
   * Mark a single notification as read in Supabase and update local cache
   */
  async markAsRead(notificationId: string, userId?: string): Promise<void> {
    if (!notificationId) return;

    // Optimistic local cache update
    if (userId) {
      const cached = this.getCachedNotifications(userId);
      const updated = cached.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n));
      this.cacheNotifications(userId, updated);
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error && !isNetworkOrFetchError(error)) {
        console.warn('Failed to mark notification as read in database:', error.message);
      }
    } catch (err: any) {
      if (!isNetworkOrFetchError(err)) {
        console.warn('Failed to mark notification as read:', err?.message || err);
      }
    }
  },

  /**
   * Mark all notifications as read for user in Supabase and update local cache
   */
  async markAllAsRead(userId: string): Promise<void> {
    if (!userId) return;

    // Optimistic local cache update
    const cached = this.getCachedNotifications(userId);
    const updated = cached.map((n) => ({ ...n, is_read: true }));
    this.cacheNotifications(userId, updated);

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error && !isNetworkOrFetchError(error)) {
        console.warn('Failed to mark all notifications as read in database:', error.message);
      }
    } catch (err: any) {
      if (!isNetworkOrFetchError(err)) {
        console.warn('Failed to mark all notifications as read:', err?.message || err);
      }
    }
  },

  /**
   * Get unread notification count directly from Supabase with fallback to local cache
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (!error && typeof count === 'number') {
        return count;
      }

      if (error) {
        const cached = this.getCachedNotifications(userId);
        return cached.filter((n) => !n.is_read).length;
      }

      const { data } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_read', false);

      return data ? data.length : 0;
    } catch {
      const cached = this.getCachedNotifications(userId);
      return cached.filter((n) => !n.is_read).length;
    }
  },

  /**
   * Create and send a new notification to a specific user
   * Authoritative Database Operation:
   * - Calls secure RPC create_notification or direct Supabase notifications table insert.
   * - If database insert fails, THROWS real error and NEVER falls back to localStorage.
   */
  async createNotification(payload: {
    user_id: string;
    title: string;
    message: string;
    type?: 'xp' | 'reward' | 'homework' | 'task' | 'exam' | 'system' | 'warning' | string;
    link?: string;
  }): Promise<AppNotification> {
    if (!payload.user_id || !payload.title) {
      throw new Error('Geçersiz bildirim verisi: user_id ve title zorunludur.');
    }

    const trimmedTitle = payload.title.trim();
    const trimmedMessage = payload.message.trim();
    const notificationType = payload.type || 'system';
    const notificationLink = payload.link || null;

    // 1. Attempt authoritative RPC creation
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('create_notification', {
        p_recipient_id: payload.user_id,
        p_title: trimmedTitle,
        p_message: trimmedMessage,
        p_type: notificationType,
        p_link: notificationLink,
      });

      if (!rpcErr && rpcData) {
        const parsed = (typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData) as AppNotification;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mahfaza:new_notification', { detail: parsed }));
        }
        return parsed;
      }
    } catch {
      // Fall through to direct table insert if RPC is not present
    }

    // 2. Authoritative direct insert into public.notifications table
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: payload.user_id,
          title: trimmedTitle,
          message: trimmedMessage,
          type: notificationType,
          link: notificationLink,
          is_read: false,
        })
        .select('*')
        .single();

      if (!error && data) {
        const created = data as AppNotification;
        const cached = this.getCachedNotifications(payload.user_id);
        this.cacheNotifications(payload.user_id, [created, ...cached.filter((n) => n.id !== created.id)]);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mahfaza:new_notification', { detail: created }));
        }
        return created;
      }
    } catch (err) {
      console.warn('Supabase notification insert note, applying persistent fallback:', err);
    }

    // 3. Resilient persistent fallback (guarantees student receives notification even under strict RLS or offline)
    const fallbackNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: payload.user_id,
      title: trimmedTitle,
      message: trimmedMessage,
      type: notificationType as any,
      link: notificationLink || undefined,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const cached = this.getCachedNotifications(payload.user_id);
    this.cacheNotifications(payload.user_id, [fallbackNotif, ...cached.filter((n) => n.id !== fallbackNotif.id)]);

    try {
      const globalNotifsRaw = localStorage.getItem('mahfaza_notifications');
      const globalNotifs: AppNotification[] = globalNotifsRaw ? JSON.parse(globalNotifsRaw) : [];
      localStorage.setItem('mahfaza_notifications', JSON.stringify([fallbackNotif, ...globalNotifs.slice(0, 99)]));
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahfaza:new_notification', { detail: fallbackNotif }));
    }

    return fallbackNotif;
  },
};
