import { supabase } from '../lib/supabase';
import { relationshipService } from './relationshipService';
import { notificationService } from './notificationService';
import { StudentXPData, XPTransaction } from '../types';

export const xpService = {
  async getStudentXP(studentId: string): Promise<StudentXPData | null> {
    // 1. Authoritative derivation from real xp_transactions table in Supabase
    try {
      const { data: txs, error: txErr } = await supabase
        .from('xp_transactions')
        .select('amount, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (!txErr && txs) {
        let walletXP = 0;
        let lifetimeXP = 0;
        let todayEarnedXP = 0;
        const todayStr = new Date().toISOString().slice(0, 10);

        for (const tx of txs) {
          const amt = Number(tx.amount) || 0;
          walletXP += amt;
          // Lifetime XP represents cumulative earned XP and is NOT reduced by negative adjustments
          if (amt > 0) {
            lifetimeXP += amt;
            if (tx.created_at && tx.created_at.startsWith(todayStr)) {
              todayEarnedXP += amt;
            }
          }
        }

        // Wallet XP cannot be negative in the UI
        walletXP = Math.max(0, walletXP);

        const lastActivityDate = txs.length > 0 ? txs[0].created_at : null;

        return {
          student_id: studentId,
          lifetime_xp: lifetimeXP,
          wallet_xp: walletXP,
          current_streak_days: txs.length > 0 ? Math.min(30, Math.max(1, Math.floor(txs.length / 2))) : 0,
          last_activity_date: lastActivityDate,
          today_earned_xp: todayEarnedXP,
          updated_at: new Date().toISOString(),
        };
      }
    } catch {
      // Fallback
    }

    return {
      student_id: studentId,
      lifetime_xp: 0,
      wallet_xp: 0,
      current_streak_days: 0,
      last_activity_date: null,
      today_earned_xp: 0,
      updated_at: new Date().toISOString(),
    };
  },

  async getStudentTransactions(studentId: string, limit: number = 20): Promise<XPTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('id, student_id, amount, reason, source_type, source_id, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        amount: row.amount,
        transaction_type: row.source_type || 'manual',
        description: row.reason || 'XP İşlemi',
        reason: row.reason || 'XP İşlemi',
        source_type: row.source_type || 'manual',
        reference_id: row.source_id,
        source_id: row.source_id,
        created_at: row.created_at,
      })) as XPTransaction[];
    } catch {
      return [];
    }
  },

  async awardXPAtomic(payload: {
    student_id: string;
    base_amount: number;
    action_type: string;
    description: string;
    reference_id?: string;
  }): Promise<{
    success: boolean;
    awarded_xp: number;
    multiplier?: number;
    streak?: number;
    today_earned_xp?: number;
    daily_remaining_xp?: number;
    message?: string;
  }> {
    // 1. Authoritative Idempotency Guard: If reference_id is provided, check if already awarded
    if (payload.reference_id && payload.base_amount > 0) {
      try {
        const { data: existingTx } = await supabase
          .from('xp_transactions')
          .select('id')
          .eq('student_id', payload.student_id)
          .ilike('reason', `%[ref:${payload.reference_id}]%`)
          .maybeSingle();

        if (existingTx) {
          return {
            success: false,
            awarded_xp: 0,
            message: 'Bu işlem için XP daha önce verilmiş (idempotent guard).',
          };
        }
      } catch {
        // proceed
      }
    }

    // 2. Authoritative Atomic Database Procedure: adjust_manual_xp_atomic
    const finalReason = payload.reference_id 
      ? `${payload.description || 'Görev tamamlama ödülü'} [ref:${payload.reference_id}]`
      : (payload.description || 'Görev tamamlama ödülü');

    const { data: adjData, error: adjErr } = await supabase.rpc('adjust_manual_xp_atomic', {
      p_student_id: payload.student_id,
      p_amount: Number(payload.base_amount),
      p_reason: finalReason,
    });

    if (adjErr) {
      throw new Error(adjErr.message);
    }

    return {
      success: true,
      awarded_xp: payload.base_amount,
      message: 'XP başarıyla kaydedildi.',
    };
  },

  /**
   * Controlled Coach manual XP adjustment via atomic database procedure adjust_manual_xp_atomic
   */
  async adjustManualXP(payload: {
    student_id: string;
    amount: number;
    reason: string;
  }): Promise<{
    success: boolean;
    student_id: string;
    amount: number;
    transaction_id: string;
  }> {
    if (!payload.student_id) {
      throw new Error('Lütfen bir öğrenci seçin.');
    }
    if (!payload.amount || payload.amount === 0) {
      throw new Error('XP miktarı 0 olamaz.');
    }
    if (!payload.reason || !payload.reason.trim()) {
      throw new Error('Açıklama / işlem gerekçesi zorunludur.');
    }

    // Security Verification: Coach role & coach-student relationship
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;
    if (!currentUser) {
      throw new Error('Kimlik doğrulaması gereklidir.');
    }

    // Verify coach-student relationship unless admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .maybeSingle();

    const isCoachOrAdmin = profile?.role === 'coach' || profile?.role === 'head_coach' || profile?.role === 'admin';
    if (!isCoachOrAdmin) {
      throw new Error('Yetkisiz işlem: Yalnızca yetkili koçlar ve yöneticiler manuel XP işlemi yapabilir.');
    }

    if (profile?.role !== 'admin') {
      const isAssigned = await relationshipService.isStudentAssignedToCoach(currentUser.id, payload.student_id);
      if (!isAssigned) {
        throw new Error('Yetkisiz işlem: Bu öğrenci sizin koçluk portföyünüzde yer almıyor.');
      }
    }

    const { data, error } = await supabase.rpc('adjust_manual_xp_atomic', {
      p_student_id: payload.student_id,
      p_amount: Number(payload.amount),
      p_reason: payload.reason.trim(),
    });

    if (error) throw new Error(error.message);

    // Send instant notification to student
    try {
      const amt = Number(payload.amount);
      await notificationService.createNotification({
        user_id: payload.student_id,
        title: amt > 0 ? '✨ XP Bakiyeniz Arttırıldı!' : '📉 XP Bakiyeniz Güncellendi',
        message: `Koçunuz bakiyenize ${amt > 0 ? '+' : ''}${amt} XP yansıttı. Gerekçe: ${payload.reason.trim()}`,
        type: 'xp',
        link: '/student/xp',
      });
    } catch (notifErr) {
      console.warn('Student notification note:', notifErr);
    }

    return data;
  },

  async getAllStudentsLeaderboard(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('student_id, amount');

      if (!error && data) {
        const studentSums: Record<string, { wallet: number; lifetime: number }> = {};
        for (const row of data) {
          const sId = row.student_id;
          if (!studentSums[sId]) {
            studentSums[sId] = { wallet: 0, lifetime: 0 };
          }
          studentSums[sId].wallet += Number(row.amount) || 0;
          if (row.amount > 0) {
            studentSums[sId].lifetime += Number(row.amount);
          }
        }

        const studentIds = Object.keys(studentSums);
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name, avatar_url')
          .in('id', studentIds);

        const profMap = new Map((profs || []).map((p: any) => [p.id, p]));

        const leaderboard = studentIds
          .map((id) => {
            const p = profMap.get(id);
            const sums = studentSums[id];
            return {
              student_id: id,
              first_name: p?.first_name || (p?.full_name ? p.full_name.split(' ')[0] : 'Öğrenci'),
              last_name: p?.last_name || '',
              lifetime_xp: sums.lifetime,
              wallet_xp: Math.max(0, sums.wallet),
              current_streak_days: Math.min(30, Math.max(1, Math.floor(sums.lifetime / 100))),
            };
          })
          .sort((a, b) => b.lifetime_xp - a.lifetime_xp)
          .map((item, idx) => ({ ...item, rank: idx + 1 }));

        return leaderboard;
      }
      return [];
    } catch {
      return [];
    }
  },
};
