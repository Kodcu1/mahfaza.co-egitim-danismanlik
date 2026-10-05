import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';
import { xpService } from './xpService';
import { Reward, RewardRequest, RewardCategory, RewardRarity } from '../types';

function mapRowToReward(row: any): Reward {
  const price = Number(row.cost_xp ?? row.xp_price ?? 0);
  return {
    id: row.id,
    coach_id: row.coach_id || null,
    title: row.title || 'Ödül',
    description: row.description || '',
    category: (row.category as RewardCategory) || 'Genel',
    rarity: (row.rarity as RewardRarity) || 'rare',
    cost_xp: price,
    xp_price: price,
    real_cost: row.real_cost ?? 0,
    icon: row.icon || 'Gift',
    stock: row.stock ?? null,
    is_active: row.is_active ?? true,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

export const rewardService = {
  /**
   * Get all active rewards for Student Reward Shop
   */
  async getRewards(): Promise<Reward[]> {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('cost_xp', { ascending: true });

    if (error) {
      console.warn('Error fetching rewards:', error.message);
      return [];
    }

    return (data || []).map(mapRowToReward);
  },

  /**
   * Get all rewards for Coach / Admin management
   */
  async getAllRewardsAdmin(): Promise<Reward[]> {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching all rewards:', error.message);
      return [];
    }

    return (data || []).map(mapRowToReward);
  },

  /**
   * Get rewards created by or available to a specific coach
   */
  async getCoachRewards(coachId: string): Promise<Reward[]> {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .or(`coach_id.eq.${coachId},coach_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      return this.getAllRewardsAdmin();
    }

    return (data || []).map(mapRowToReward);
  },

  /**
   * Create a new reward item (Coach or Admin)
   */
  async createReward(payload: {
    coach_id?: string | null;
    title: string;
    description: string;
    category: RewardCategory | string;
    rarity?: RewardRarity;
    xp_price: number;
    cost_xp?: number;
    real_cost?: number;
    stock: number | null;
    icon?: string;
    is_active?: boolean;
  }): Promise<Reward> {
    const price = Math.max(10, Number(payload.cost_xp ?? payload.xp_price ?? 100));

    const insertData: any = {
      coach_id: payload.coach_id || null,
      title: payload.title.trim(),
      description: payload.description?.trim() || '',
      cost_xp: price,
      category: payload.category || 'Genel',
      icon: payload.icon || 'Gift',
      stock: payload.stock !== undefined ? payload.stock : null,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
    };

    const { data, error } = await supabase
      .from('rewards')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return mapRowToReward(data);
  },

  /**
   * Update an existing reward item
   */
  async updateReward(rewardId: string, updates: Partial<{
    title: string;
    description: string;
    category: string;
    cost_xp: number;
    xp_price: number;
    stock: number | null;
    icon: string;
    is_active: boolean;
  }>): Promise<Reward> {
    const patchData: any = {};
    if (updates.title !== undefined) patchData.title = updates.title.trim();
    if (updates.description !== undefined) patchData.description = updates.description.trim();
    if (updates.category !== undefined) patchData.category = updates.category;
    if (updates.cost_xp !== undefined || updates.xp_price !== undefined) {
      patchData.cost_xp = Number(updates.cost_xp ?? updates.xp_price);
    }
    if (updates.stock !== undefined) patchData.stock = updates.stock;
    if (updates.icon !== undefined) patchData.icon = updates.icon;
    if (updates.is_active !== undefined) patchData.is_active = updates.is_active;

    const { data, error } = await supabase
      .from('rewards')
      .update(patchData)
      .eq('id', rewardId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return mapRowToReward(data);
  },

  /**
   * Delete or deactivate a reward
   */
  async deleteReward(rewardId: string): Promise<void> {
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', rewardId);

    if (error) {
      // Fallback: toggle inactive
      await supabase
        .from('rewards')
        .update({ is_active: false })
        .eq('id', rewardId);
    }
  },

  /**
   * Student requests a reward
   */
  async requestReward(studentId: string, rewardId: string): Promise<RewardRequest> {
    // 1. Fetch reward details
    const { data: rewardRow } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', rewardId)
      .single();

    const cost = rewardRow ? Number(rewardRow.cost_xp || 0) : 100;

    // Check student wallet balance
    const xp = await xpService.getStudentXP(studentId);
    if (!xp || xp.wallet_xp < cost) {
      throw new Error(`Yetersiz XP bakiyesi! Bu ödül için ${cost} XP gerekiyor, mevcut bakiyeniz: ${xp?.wallet_xp || 0} XP.`);
    }

    const requestId = 'req_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('req-' + Date.now()));

    const { data, error } = await supabase
      .from('reward_requests')
      .insert({
        id: requestId,
        student_id: studentId,
        reward_id: rewardId,
        cost_xp: cost,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    // Notify coach if coach_id is defined
    if (rewardRow?.coach_id) {
      try {
        await notificationService.createNotification({
          user_id: rewardRow.coach_id,
          title: '🎁 Yeni Ödül Talebi Geldi',
          message: `Bir öğrenciniz "${rewardRow.title}" ödülünü talep etti (${cost} XP).`,
          type: 'reward',
          link: '/coach/rewards',
        });
      } catch {
        // ignore
      }
    }

    return {
      id: data.id,
      student_id: data.student_id,
      reward_id: data.reward_id,
      status: data.status,
      requested_at: data.requested_at || data.created_at,
      cost_xp: cost,
      reward: rewardRow ? mapRowToReward(rewardRow) : undefined,
    };
  },

  /**
   * Get student's reward requests
   */
  async getStudentRequests(studentId: string): Promise<RewardRequest[]> {
    const { data: requests, error } = await supabase
      .from('reward_requests')
      .select('*')
      .eq('student_id', studentId)
      .order('requested_at', { ascending: false });

    if (error || !requests) return [];

    const rewardIds = [...new Set(requests.map((r: any) => r.reward_id).filter(Boolean))];
    const { data: rewards } = await supabase
      .from('rewards')
      .select('*')
      .in('id', rewardIds);

    const rewardMap = new Map((rewards || []).map((rw: any) => [rw.id, mapRowToReward(rw)]));

    return requests.map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      reward_id: row.reward_id,
      cost_xp: row.cost_xp,
      status: row.status,
      requested_at: row.requested_at || row.created_at,
      reviewed_at: row.processed_at || row.reviewed_at,
      reviewed_by: row.reviewed_by,
      admin_note: row.coach_notes || row.admin_note,
      coach_notes: row.coach_notes || row.admin_note,
      reward: rewardMap.get(row.reward_id),
    }));
  },

  /**
   * Get all reward requests for Admin view
   */
  async getAllRequestsAdmin(): Promise<RewardRequest[]> {
    const { data: requests, error } = await supabase
      .from('reward_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error || !requests) return [];

    const rewardIds = [...new Set(requests.map((r: any) => r.reward_id).filter(Boolean))];
    const studentIds = [...new Set(requests.map((r: any) => r.student_id).filter(Boolean))];

    const [{ data: rewards }, { data: profiles }] = await Promise.all([
      supabase.from('rewards').select('*').in('id', rewardIds),
      supabase.from('profiles').select('id, email, name, full_name, first_name, last_name, avatar_url').in('id', studentIds),
    ]);

    const rewardMap = new Map((rewards || []).map((rw: any) => [rw.id, mapRowToReward(rw)]));
    const profileMap = new Map((profiles || []).map((p: any) => [
      p.id,
      {
        ...p,
        first_name: p.first_name || (p.full_name ? p.full_name.split(' ')[0] : 'Öğrenci'),
        last_name: p.last_name || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : ''),
      },
    ]));

    return requests.map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      reward_id: row.reward_id,
      cost_xp: row.cost_xp,
      status: row.status,
      requested_at: row.requested_at || row.created_at,
      reviewed_at: row.processed_at || row.reviewed_at,
      reviewed_by: row.reviewed_by,
      admin_note: row.coach_notes || row.admin_note,
      coach_notes: row.coach_notes || row.admin_note,
      reward: rewardMap.get(row.reward_id),
      student: profileMap.get(row.student_id),
    }));
  },

  /**
   * Get pending or all requests for coach assigned students
   */
  async getCoachPendingRequests(studentIds: string[]): Promise<RewardRequest[]> {
    if (!studentIds || studentIds.length === 0) return [];

    const { data: requests, error } = await supabase
      .from('reward_requests')
      .select('*')
      .in('student_id', studentIds)
      .order('requested_at', { ascending: false });

    if (error || !requests) return [];

    const rewardIds = [...new Set(requests.map((r: any) => r.reward_id).filter(Boolean))];

    const [{ data: rewards }, { data: profiles }] = await Promise.all([
      supabase.from('rewards').select('*').in('id', rewardIds),
      supabase.from('profiles').select('id, email, name, full_name, first_name, last_name, avatar_url').in('id', studentIds),
    ]);

    const rewardMap = new Map((rewards || []).map((rw: any) => [rw.id, mapRowToReward(rw)]));
    const profileMap = new Map((profiles || []).map((p: any) => [
      p.id,
      {
        ...p,
        first_name: p.first_name || (p.full_name ? p.full_name.split(' ')[0] : 'Öğrenci'),
        last_name: p.last_name || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : ''),
      },
    ]));

    return requests.map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      reward_id: row.reward_id,
      cost_xp: row.cost_xp,
      status: row.status,
      requested_at: row.requested_at || row.created_at,
      reviewed_at: row.processed_at || row.reviewed_at,
      reviewed_by: row.reviewed_by,
      admin_note: row.coach_notes || row.admin_note,
      coach_notes: row.coach_notes || row.admin_note,
      reward: rewardMap.get(row.reward_id),
      student: profileMap.get(row.student_id),
    }));
  },

  /**
   * Coach or Admin approves reward request and settles XP deduction
   */
  async approveRewardAtomic(requestId: string, notes?: string): Promise<{ success: boolean; message: string }> {
    const now = new Date().toISOString();

    // 1. Fetch request and reward details
    const { data: req } = await supabase
      .from('reward_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!req) throw new Error('Ödül talebi bulunamadı.');

    if (req.status === 'approved') {
      throw new Error('Bu talep zaten daha önce onaylanmış.');
    }

    let rewardTitle = 'Ödül';
    let costXP = Number(req.cost_xp || 0);

    const { data: rw } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', req.reward_id)
      .maybeSingle();

    if (rw) {
      rewardTitle = rw.title;
      if (!costXP) costXP = Number(rw.cost_xp || 0);

      // Decrement stock if finite
      if (rw.stock !== null && rw.stock > 0) {
        await supabase
          .from('rewards')
          .update({ stock: rw.stock - 1 })
          .eq('id', rw.id);
      }
    }

    // 2. Deduct XP atomically from student wallet
    if (costXP > 0) {
      try {
        await xpService.awardXPAtomic({
          student_id: req.student_id,
          base_amount: -costXP,
          action_type: 'reward_redemption',
          description: `Ödül Kullanıldı: ${rewardTitle}`,
          reference_id: req.id,
        });
      } catch (deductErr) {
        console.warn('XP deduction warning:', deductErr);
      }
    }

    // 3. Mark request approved
    const { error: updErr } = await supabase
      .from('reward_requests')
      .update({
        status: 'approved',
        coach_notes: notes || 'Koç tarafından onaylandı.',
        processed_at: now,
      })
      .eq('id', requestId);

    if (updErr) throw new Error(updErr.message);

    // 4. Notify student
    try {
      await notificationService.createNotification({
        user_id: req.student_id,
        title: '🎉 Ödül Talebiniz Onaylandı!',
        message: `"${rewardTitle}" ödülünüz koçunuz tarafından onaylandı! (${costXP} XP düşüldü)`,
        type: 'reward',
        link: '/student/rewards',
      });
    } catch {
      // ignore
    }

    return { success: true, message: 'Ödül talebi başarıyla onaylandı ve XP bakiyesi güncellendi.' };
  },

  /**
   * Coach or Admin rejects reward request
   */
  async rejectRewardRequest(requestId: string, notes: string): Promise<void> {
    const now = new Date().toISOString();

    const { data: req } = await supabase
      .from('reward_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    const { error } = await supabase
      .from('reward_requests')
      .update({
        status: 'rejected',
        coach_notes: notes,
        processed_at: now,
      })
      .eq('id', requestId);

    if (error) throw new Error(error.message);

    if (req) {
      try {
        await notificationService.createNotification({
          user_id: req.student_id,
          title: '❌ Ödül Talebiniz Reddedildi',
          message: `Ödül talebiniz onaylanmadı. Gerekçe: ${notes}`,
          type: 'reward',
          link: '/student/rewards',
        });
      } catch {
        // ignore
      }
    }
  },
};
