import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export const profileService = {
  /**
   * Fetch profile by ID
   */
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error.message);
      return null;
    }
    return data as Profile;
  },

  /**
   * Update profile information safely (No privileged role modification allowed)
   */
  async updateProfile(
    userId: string,
    updates: {
      first_name?: string;
      last_name?: string;
      username?: string | null;
      bio?: string | null;
      school_name?: string | null;
      grade_level?: number | null;
      avatar_url?: string | null;
    }
  ): Promise<Profile> {
    // Sanitize username
    let cleanUsername = updates.username?.trim().toLowerCase() || null;
    if (cleanUsername) {
      // Reserved usernames check
      const reserved = ['admin', 'root', 'system', 'mahfaza', 'superuser', 'support'];
      if (reserved.includes(cleanUsername)) {
        throw new Error(`'${cleanUsername}' kullanıcı adı sistem tarafından ayrılmıştır.`);
      }
    }

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.first_name !== undefined) payload.first_name = updates.first_name.trim();
    if (updates.last_name !== undefined) payload.last_name = updates.last_name.trim();
    if (updates.username !== undefined) payload.username = cleanUsername;
    if (updates.bio !== undefined) payload.bio = updates.bio?.trim() || null;
    if (updates.school_name !== undefined) payload.school_name = updates.school_name?.trim() || null;
    if (updates.grade_level !== undefined) payload.grade_level = updates.grade_level;
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      if (error.message.includes('unique') || error.message.includes('profiles_username_key')) {
        throw new Error('Bu kullanıcı adı başka bir kullanıcı tarafından alınmış.');
      }
      throw new Error(error.message);
    }

    return data as Profile;
  },

  /**
   * Upload user avatar image to Supabase Storage
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      // In case bucket is not public or storage not configured yet, fallback to local URL
      console.warn('Supabase storage upload note:', uploadError.message);
      // Return a data URL or placeholder if storage bucket isn't provisioned yet
      return URL.createObjectURL(file);
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  },
};
