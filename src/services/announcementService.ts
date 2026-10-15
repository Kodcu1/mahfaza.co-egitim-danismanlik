import { supabase } from '../lib/supabase';
import { Announcement, UserRole } from '../types';

export const announcementService = {
  /**
   * Fetch announcements viewable by user's role
   */
  async getAnnouncements(role?: UserRole): Promise<Announcement[]> {
    try {
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (role && role !== 'admin') {
        query = query.or(`target_role.is.null,target_role.eq.${role}`);
      }

      const { data, error } = await query;
      if (error) return [];
      return (data || []) as Announcement[];
    } catch {
      return [];
    }
  },

  /**
   * Admin: Fetch all announcements (including drafts)
   */
  async getAllAnnouncementsAdmin(): Promise<Announcement[]> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data || []) as Announcement[];
    } catch {
      return [];
    }
  },

  /**
   * Admin: Create new announcement
   */
  async createAnnouncement(payload: {
    title: string;
    content: string;
    target_role?: UserRole | null;
    author_id: string;
    is_published?: boolean;
    priority?: 'normal' | 'important' | 'urgent';
  }): Promise<Announcement> {
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: payload.title.trim(),
        content: payload.content.trim(),
        target_role: payload.target_role || null,
        author_id: payload.author_id,
        is_published: payload.is_published ?? true,
        priority: payload.priority || 'normal',
      })
      .select('*, author:profiles!announcements_author_id_fkey(name, full_name, role)')
      .single();

    if (error) throw new Error(error.message);
    return data as Announcement;
  },

  /**
   * Admin: Update announcement
   */
  async updateAnnouncement(
    id: string,
    updates: Partial<Announcement>
  ): Promise<Announcement> {
    const { data, error } = await supabase
      .from('announcements')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, author:profiles!announcements_author_id_fkey(name, full_name, role)')
      .single();

    if (error) throw new Error(error.message);
    return data as Announcement;
  },

  /**
   * Admin: Delete announcement
   */
  async deleteAnnouncement(id: string): Promise<void> {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};
