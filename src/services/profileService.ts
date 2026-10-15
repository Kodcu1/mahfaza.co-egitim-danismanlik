import { supabase } from '../lib/supabase';
import { Profile } from '../types';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

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

    if (error || !data) {
      if (error && !error.message?.includes('Failed to fetch')) {
        console.warn('Error fetching profile:', error.message);
      }
      return null;
    }

    const row: any = data;
    return {
      ...row,
      first_name:
        row.first_name ||
        (row.full_name
          ? row.full_name.split(' ')[0]
          : row.name
          ? row.name.split(' ')[0]
          : 'Kullanıcı'),
      last_name:
        row.last_name ||
        (row.full_name
          ? row.full_name.split(' ').slice(1).join(' ')
          : row.name
          ? row.name.split(' ').slice(1).join(' ')
          : ''),
    } as Profile;
  },

  /**
   * Update profile information safely and persist to both profiles table and auth user_metadata
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
    const cleanUsername = updates.username?.trim().toLowerCase() || null;
    if (cleanUsername) {
      const reserved = ['admin', 'root', 'system', 'mahfaza', 'superuser', 'support'];
      if (reserved.includes(cleanUsername)) {
        throw new Error(`'${cleanUsername}' kullanıcı adı sistem tarafından ayrılmıştır.`);
      }
    }

    const now = new Date().toISOString();
    const firstName = updates.first_name?.trim() || '';
    const lastName = updates.last_name?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();

    // Sync with Supabase Auth user_metadata so session reflects changes immediately
    // CRITICAL: Never store base64 DataURLs in Auth user_metadata as it bloats the JWT and causes Cloudflare 400 Header Too Large!
    const safeMetadataAvatar =
      updates.avatar_url && !updates.avatar_url.startsWith('data:')
        ? updates.avatar_url
        : null;
    try {
      await supabase.auth.updateUser({
        data: {
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          full_name: fullName || undefined,
          username: cleanUsername,
          bio: updates.bio ?? null,
          school_name: updates.school_name ?? null,
          grade_level: updates.grade_level ?? null,
          avatar_url: safeMetadataAvatar,
        },
      });
    } catch {
      // ignore
    }

    // Attempt full update on profiles table first
    const fullPayload: Record<string, any> = {
      updated_at: now,
    };
    if (fullName) {
      fullPayload.full_name = fullName;
      fullPayload.name = fullName;
    }
    if (updates.first_name !== undefined) fullPayload.first_name = firstName;
    if (updates.last_name !== undefined) fullPayload.last_name = lastName;
    if (updates.username !== undefined) fullPayload.username = cleanUsername;
    if (updates.bio !== undefined) fullPayload.bio = updates.bio;
    if (updates.school_name !== undefined) fullPayload.school_name = updates.school_name;
    if (updates.grade_level !== undefined) fullPayload.grade_level = updates.grade_level ?? null;
    if (updates.avatar_url !== undefined) fullPayload.avatar_url = updates.avatar_url;

    const { data, error } = await supabase
      .from('profiles')
      .update(fullPayload)
      .eq('id', userId)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      const row: any = data;
      return {
        ...row,
        first_name: row.first_name || firstName || 'Kullanıcı',
        last_name: row.last_name || lastName || '',
        username: row.username ?? cleanUsername,
        bio: row.bio ?? updates.bio ?? null,
        school_name: row.school_name ?? updates.school_name ?? null,
        grade_level: row.grade_level ?? updates.grade_level ?? null,
        avatar_url: row.avatar_url ?? updates.avatar_url ?? null,
      } as Profile;
    }

    // Fallback: if optional columns (school_name, bio, grade_level, first_name) don't exist in DB, update core columns
    if (error && (error.message.includes('unique') || error.message.includes('profiles_username_key'))) {
      throw new Error('Bu kullanıcı adı başka bir kullanıcı tarafından alınmış.');
    }

    const minimalPayload: Record<string, any> = {
      updated_at: now,
    };
    if (fullName) {
      minimalPayload.full_name = fullName;
      minimalPayload.name = fullName;
    }
    if (updates.avatar_url !== undefined) {
      minimalPayload.avatar_url = updates.avatar_url;
    }

    const { data: minData } = await supabase
      .from('profiles')
      .update(minimalPayload)
      .eq('id', userId)
      .select('*')
      .maybeSingle();

    const baseRow: any = minData || {};
    return {
      id: userId,
      email: baseRow.email || '',
      first_name: firstName || baseRow.first_name || 'Kullanıcı',
      last_name: lastName || baseRow.last_name || '',
      full_name: fullName || baseRow.full_name || baseRow.name || 'Kullanıcı',
      name: fullName || baseRow.name || baseRow.full_name || 'Kullanıcı',
      role: baseRow.role || 'student',
      username: cleanUsername,
      bio: updates.bio ?? null,
      school_name: updates.school_name ?? null,
      grade_level: updates.grade_level ?? null,
      avatar_url: updates.avatar_url ?? baseRow.avatar_url ?? null,
      created_at: baseRow.created_at || now,
      updated_at: now,
    } as Profile;
  },

  /**
   * Upload user avatar image to Supabase Storage (avatars bucket) with DataURL fallback
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch {
      // fallback to DataURL below if bucket not created yet
    }

    // Durable DataURL fallback so avatar renders cleanly across reloads without broken image alt text
    return await fileToDataUrl(file);
  },
};
