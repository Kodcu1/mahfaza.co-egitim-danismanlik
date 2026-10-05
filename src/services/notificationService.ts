import { supabase } from '../lib/supabase';
import { AppNotification } from '../types';

export const notificationService = {
  /**
   * Fetch all notifications for user directly from authoritative Supabase database
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
        console.error('Error fetching notifications from Supabase:', error.message);
        return [];
      }

      return (data || []) as AppNotification[];
    } catch (err) {
      console.error('Failed to query notifications table:', err);
      return [];
    }
  },

  /**
   * Mark a single notification as read in Supabase
   */
  async markAsRead(notificationId: string): Promise<void> {
    if (!notificationId) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Failed to mark notification as read in database:', error.message);
      throw new Error(`Bildirim okundu olarak işaretlenemedi: ${error.message}`);
    }
  },

  /**
   * Mark all notifications as read for user in Supabase
   */
  async markAllAsRead(userId: string): Promise<void> {
    if (!userId) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to mark all notifications as read in database:', error.message);
      throw new Error(`Bildirimler okundu olarak işaretlenemedi: ${error.message}`);
    }
  },

  /**
   * Get unread notification count directly from Supabase
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

      const { data } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_read', false);

      return data ? data.length : 0;
    } catch {
      return 0;
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

    if (error) {
      // CRITICAL: DO NOT silently fall back to localStorage.
      // Throw the authoritative database error so failed notifications are NEVER
      // disguised as successfully persisted.
      throw new Error(`Bildirim veritabanına kaydedilemedi (Supabase Error ${error.code || 'RLS'}): ${error.message}`);
    }

    const created = data as AppNotification;

    // Dispatch real-time local event for immediate UI responsiveness
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahfaza:new_notification', { detail: created }));
    }

    return created;
  },
};
