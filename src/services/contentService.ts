import { supabase } from '../lib/supabase';
import { AcademicContent } from '../types';

export const contentService = {
  /**
   * Fetch published or authorized content with optional filtering directly from Supabase
   */
  async getContent(filters?: {
    category?: string;
    subjectId?: string;
    contentType?: string;
    search?: string;
    publishedOnly?: boolean;
  }): Promise<AcademicContent[]> {
    try {
      let query = supabase
        .from('academic_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.publishedOnly !== false) {
        query = query.eq('is_published', true);
      }
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters?.subjectId && filters.subjectId !== 'all') {
        query = query.eq('subject_id', filters.subjectId);
      }
      if (filters?.contentType && filters.contentType !== 'all') {
        query = query.eq('content_type', filters.contentType);
      }
      if (filters?.search && filters.search.trim()) {
        query = query.ilike('title', `%${filters.search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) {
        // Return empty array if table not yet migrated or schema cache unpopulated
        return [];
      }
      return (data || []) as AcademicContent[];
    } catch {
      return [];
    }
  },

  /**
   * Fetch a single content piece by ID directly from Supabase
   */
  async getContentById(id: string): Promise<AcademicContent | null> {
    try {
      const { data, error } = await supabase
        .from('academic_content')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        return null;
      }
      return data as AcademicContent;
    } catch {
      return null;
    }
  },

  /**
   * Create new academic content in Supabase
   */
  async createContent(content: {
    title: string;
    description?: string;
    category: string;
    subject_id?: string;
    content_type: any;
    thumbnail_url?: string;
    body?: string;
    file_url?: string;
    author_id: string;
    is_published?: boolean;
  }): Promise<AcademicContent> {
    const { data, error } = await supabase
      .from('academic_content')
      .insert({
        title: content.title.trim(),
        description: content.description?.trim() || null,
        category: content.category,
        subject_id: content.subject_id || null,
        content_type: content.content_type,
        thumbnail_url: content.thumbnail_url || null,
        body: content.body || null,
        file_url: content.file_url || null,
        author_id: content.author_id,
        is_published: content.is_published ?? true,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data as AcademicContent;
  },

  /**
   * Update existing academic content in Supabase
   */
  async updateContent(id: string, updates: Partial<AcademicContent>): Promise<AcademicContent> {
    const { data, error } = await supabase
      .from('academic_content')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data as AcademicContent;
  },

  /**
   * Delete content from Supabase
   */
  async deleteContent(id: string): Promise<void> {
    const { error } = await supabase
      .from('academic_content')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  },
};
