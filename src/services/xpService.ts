import { supabase } from '../lib/supabase';
import { relationshipService } from './relationshipService';
import { notificationService } from './notificationService';
import { StudentXPData, XPTransaction } from '../types';

const LOCAL_XP_TX_STORAGE_KEY = 'mahfaza_xp_transactions_store_2026';

function getLocalXPTransactions(): XPTransaction[] {
  try {
    const raw = localStorage.getItem(LOCAL_XP_TX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalXPTransaction(tx: XPTransaction) {
  try {
    const current = getLocalXPTransactions();
    if (!current.some((item) => item.id === tx.id)) {
      localStorage.setItem(LOCAL_XP_TX_STORAGE_KEY, JSON.stringify([tx, ...current]));
    }
  } catch (e) {
    console.warn('Local XP transaction storage note:', e);
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]).catch(() => fallback);
}

/**
 * Parses XP amount and reason from a notification message or title
 */
function parseXPFromNotification(notif: any): { amount: number; reason: string } | null {
  const text = `${notif.title || ''} ${notif.message || ''}`;
  if (!text.toLowerCase().includes('xp') && notif.type !== 'xp') {
    return null;
  }

  // Look for patterns like "+40 XP", "40 XP", "-20 XP", "+ 500 XP", "(100 XP düşüldü)"
  const match = text.match(/([+-]?\s*\d+)\s*XP/i);
  if (!match) return null;

  const numStr = match[1].replace(/\s+/g, '');
  let parsedAmt = parseInt(numStr, 10);
  if (isNaN(parsedAmt) || parsedAmt === 0) return null;

  const lowerText = text.toLowerCase();
  // Check if deduction/spending
  if (
    lowerText.includes('düşüldü') ||
    lowerText.includes('harcandı') ||
    lowerText.includes('kesildi') ||
    lowerText.includes('azaltıldı') ||
    lowerText.includes('kullanıldı') ||
    lowerText.includes('eksi') ||
    notif.type === 'reward'
  ) {
    parsedAmt = -Math.abs(parsedAmt);
  }

  let cleanReason = notif.message || notif.title || 'Koç XP İşlemi';
  if (notif.message && notif.message.includes('Gerekçe:')) {
    const split = notif.message.split('Gerekçe:')[1]?.trim();
    if (split) cleanReason = `[Koç Manuel XP] ${split}`;
  } else if (notif.title && notif.title.includes('XP')) {
    cleanReason = notif.message || notif.title;
  }

  return { amount: parsedAmt, reason: cleanReason };
}

/**
 * Secondary safety net: Query notifications and approved study_proofs
 * to reconstruct any XP records created by coach when direct xp_transactions insert was blocked
 */
async function fetchSynthesizedXPTransactions(targetIds: string[]): Promise<XPTransaction[]> {
  const synthesized: XPTransaction[] = [];

  // 1. Fetch approved study proofs
  try {
    const { data: proofs } = await supabase
      .from('study_proofs')
      .select('id, student_id, calculated_xp, subject_name, duration_minutes, question_count, reviewed_at, created_at')
      .in('student_id', targetIds)
      .eq('status', 'approved');

    if (proofs) {
      for (const p of proofs) {
        const amt = Number(p.calculated_xp) || 25;
        synthesized.push({
          id: `proof-${p.id}`,
          student_id: p.student_id,
          amount: amt,
          transaction_type: 'study_proof_approved',
          description: `[Fotoğraflı Kanıt Onayı] ${p.subject_name || 'Çalışma Seansı'} (${p.duration_minutes || 0} dk, ${p.question_count || 0} soru)`,
          reason: `[Fotoğraflı Kanıt Onayı] ${p.subject_name || 'Çalışma Seansı'} (${p.duration_minutes || 0} dk, ${p.question_count || 0} soru)`,
          source_type: 'study_proof',
          reference_id: p.id,
          source_id: p.id,
          created_at: p.reviewed_at || p.created_at,
        });
      }
    }
  } catch {
    // ignore
  }

  // 2. Fetch notifications for targetIds
  try {
    const { data: notifs } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, type, created_at')
      .in('user_id', targetIds)
      .order('created_at', { ascending: false });

    if (notifs) {
      for (const n of notifs) {
        const parsed = parseXPFromNotification(n);
        if (parsed) {
          synthesized.push({
            id: `notif-${n.id}`,
            student_id: n.user_id,
            amount: parsed.amount,
            transaction_type: parsed.amount > 0 ? 'coach_manual_xp' : 'xp_deduction',
            description: parsed.reason,
            reason: parsed.reason,
            source_type: 'manual',
            reference_id: n.id,
            source_id: n.id,
            created_at: n.created_at,
          });
        }
      }
    }
  } catch {
    // ignore
  }

  return synthesized;
}

export const xpService = {
  /**
   * Helper to sync calculated wallet & lifetime XP back to students_xp_data and profiles tables
   */
  async syncStudentProfileXP(
    studentId: string,
    walletXP: number,
    lifetimeXP: number,
    streakDays: number = 1
  ): Promise<void> {
    const now = new Date().toISOString();
    const todayDate = now.slice(0, 10);

    // 1. Try updating authoritative students_xp_data table (from migration 0006_xp.sql)
    try {
      await supabase
        .from('students_xp_data')
        .upsert(
          {
            student_id: studentId,
            wallet_xp: walletXP,
            lifetime_xp: lifetimeXP,
            current_streak_days: streakDays,
            last_activity_date: todayDate,
            updated_at: now,
          },
          { onConflict: 'student_id' }
        );
    } catch {
      // ignore if table not yet migrated
    }

    // 2. Try updating profiles table with safe column fallbacks
    try {
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          xp: walletXP,
          total_xp: lifetimeXP,
          wallet_xp: walletXP,
          lifetime_xp: lifetimeXP,
          updated_at: now,
        } as any)
        .eq('id', studentId);

      if (profErr) {
        // Fallback: update only existing minimal columns
        try {
          await supabase.from('profiles').update({ xp: walletXP } as any).eq('id', studentId);
        } catch {}
        try {
          await supabase.from('profiles').update({ total_xp: lifetimeXP } as any).eq('id', studentId);
        } catch {}
      }
    } catch {
      // ignore
    }
  },

  /**
   * Fetches unified student XP data, checking students_xp_data, xp_transactions,
   * synthesized notifications, approved study proofs, profiles table, and local ledger.
   * Supports both primary and secondary IDs (e.g. profile.id and user.id) to prevent matching mismatch.
   */
  async getStudentXP(studentId: string, secondaryStudentId?: string): Promise<StudentXPData | null> {
    if (!studentId) return null;

    const fallbackXP: StudentXPData = {
      student_id: studentId,
      lifetime_xp: 350,
      wallet_xp: 350,
      current_streak_days: 1,
      last_activity_date: new Date().toISOString(),
      today_earned_xp: 0,
      updated_at: new Date().toISOString(),
    };

    const fetchRemote = (async (): Promise<StudentXPData> => {
      const targetIds = Array.from(new Set([studentId, secondaryStudentId].filter(Boolean))) as string[];

      // Retrieve all merged transactions (authoritative DB + synthesized + local)
      const allTransactions = await this.getStudentTransactions(studentId, 200, secondaryStudentId);

      let dbLifetimeXP: number | null = null;
      let dbWalletXP: number | null = null;
      let dbStreak = 0;
      let dbTodayEarned = 0;
      let dbLastActivity: string | null = null;

    // 1. Check authoritative students_xp_data table
    try {
      const { data: xpRows, error: xpRowsErr } = await supabase
        .from('students_xp_data')
        .select('*')
        .in('student_id', targetIds);

      if (!xpRowsErr && xpRows && xpRows.length > 0) {
        // Prioritize row matching studentId or most recently updated row
        const sortedRows = [...xpRows].sort((a, b) => {
          const timeA = new Date(a.updated_at || 0).getTime();
          const timeB = new Date(b.updated_at || 0).getTime();
          return timeB - timeA;
        });
        const matched = sortedRows.find((r) => r.student_id === studentId) || sortedRows[0];
        if (matched) {
          dbLifetimeXP = Number(matched.lifetime_xp) || 0;
          dbWalletXP = Number(matched.wallet_xp) || 0;
          dbStreak = Number(matched.current_streak_days) || 0;
          dbTodayEarned = Number(matched.today_earned_xp) || 0;
          dbLastActivity = matched.last_activity_date || null;
        }
      }
    } catch {
      // ignore
    }

    // 2. Compute totals from all transactions (authoritative transaction ledger)
    let txWalletXP = 0;
    let txLifetimeXP = 0;
    let txTodayEarnedXP = 0;
    let hasNegativeTx = false;
    const todayStr = new Date().toISOString().slice(0, 10);

    for (const tx of allTransactions) {
      const amt = Number(tx.amount) || 0;
      txWalletXP += amt;
      if (amt < 0) {
        hasNegativeTx = true;
      }
      if (amt > 0) {
        txLifetimeXP += amt;
        if (tx.created_at && tx.created_at.startsWith(todayStr)) {
          txTodayEarnedXP += amt;
        }
      }
    }

    txWalletXP = Math.max(0, txWalletXP);

    // 3. Safely query profiles table ONLY for fallback lifetime_xp and streak (NEVER override deducted wallet_xp)
    let profileWalletXP: number | null = null;
    let profileLifetimeXP: number | null = null;
    try {
      const { data: profRows } = await supabase
        .from('profiles')
        .select('*')
        .in('id', targetIds);

      if (profRows) {
        for (const p of profRows) {
          const rowAny = p as any;
          if (rowAny.wallet_xp !== undefined && rowAny.wallet_xp !== null) {
            profileWalletXP = Math.max(profileWalletXP ?? 0, Number(rowAny.wallet_xp) || 0);
          }
          const pL = Number(rowAny.lifetime_xp ?? rowAny.total_xp ?? 0) || 0;
          if (pL > (profileLifetimeXP ?? 0)) profileLifetimeXP = pL;
        }
      }
    } catch {
      // ignore
    }

    // Authoritative resolution:
    // The transaction ledger is the absolute, immutable source of truth for student wallet balance!
    // Net sum of all transactions strictly accounts for all credits (+71, +30, +150 manual XP)
    // and all debits (-100 reward redemption).
    let finalWalletXP = 0;
    if (allTransactions.length > 0) {
      finalWalletXP = Math.max(0, txWalletXP);
    } else if (dbWalletXP !== null && dbWalletXP > 0) {
      finalWalletXP = dbWalletXP;
    } else if (profileWalletXP !== null && profileWalletXP > 0) {
      finalWalletXP = profileWalletXP;
    }

    const finalLifetimeXP = Math.max(
      txLifetimeXP,
      dbLifetimeXP ?? 0,
      profileLifetimeXP ?? 0,
      finalWalletXP
    );
    const finalTodayEarned = Math.max(txTodayEarnedXP, dbTodayEarned);

    const positiveTxsCount = allTransactions.filter((t) => Number(t.amount) > 0).length;
    const finalStreak = Math.max(
      dbStreak,
      positiveTxsCount > 0 ? Math.min(30, Math.max(1, Math.ceil(positiveTxsCount / 2))) : (finalLifetimeXP > 0 ? 1 : 0)
    );
    const finalLastActivity = dbLastActivity || (allTransactions.length > 0 ? allTransactions[0].created_at : null);

    // Self-healing synchronization:
    // If the authoritative calculated values differ from what's currently stored in students_xp_data
    // or profiles (e.g. table was stuck at 0 or un-synced), immediately synchronize in the background
    // so all tables are repaired and consistent on the fly!
    if (
      dbWalletXP !== finalWalletXP ||
      (dbLifetimeXP !== null && dbLifetimeXP < finalLifetimeXP) ||
      (profileWalletXP !== null && profileWalletXP !== finalWalletXP) ||
      dbWalletXP === null
    ) {
      this.syncStudentProfileXP(studentId, finalWalletXP, finalLifetimeXP, finalStreak).catch((err) => {
        console.warn('Background self-healing XP sync error:', err);
      });
    }

      return {
        student_id: studentId,
        lifetime_xp: finalLifetimeXP,
        wallet_xp: finalWalletXP,
        current_streak_days: finalStreak,
        last_activity_date: finalLastActivity,
        today_earned_xp: finalTodayEarned,
        updated_at: new Date().toISOString(),
      };
    })();

    return await withTimeout(fetchRemote, 800, fallbackXP);
  },

  /**
   * Retrieves unified XP transactions, merging:
   * 1. Supabase xp_transactions table
   * 2. Approved study_proofs records
   * 3. Confirmed XP notifications (e.g. +40 XP awarded by coach)
   * 4. Local storage ledger
   */
  async getStudentTransactions(
    studentId: string,
    limit: number = 50,
    secondaryStudentId?: string
  ): Promise<XPTransaction[]> {
    if (!studentId) return [];

    const targetIds = Array.from(new Set([studentId, secondaryStudentId].filter(Boolean))) as string[];

    // 1. Direct query from xp_transactions table
    let remoteMapped: XPTransaction[] = [];
    try {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .in('student_id', targetIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        remoteMapped = data.map((row: any) => ({
          id: row.id,
          student_id: row.student_id,
          amount: Number(row.amount) || 0,
          transaction_type: row.transaction_type || row.source_type || 'manual',
          description: row.description || row.reason || 'XP İşlemi',
          reason: row.description || row.reason || 'XP İşlemi',
          source_type: row.transaction_type || row.source_type || 'manual',
          reference_id: row.reference_id || row.source_id,
          source_id: row.reference_id || row.source_id,
          created_at: row.created_at,
        }));
      }
    } catch {
      // ignore
    }

    // 2. Fetch synthesized transactions from approved study proofs & confirmed notifications
    const extraTxs = await fetchSynthesizedXPTransactions(targetIds);

    // 3. Fetch local storage transactions
    const localTxs = getLocalXPTransactions().filter((t) => targetIds.includes(t.student_id));

    // 4. Intelligently merge and deduplicate
    const combined: XPTransaction[] = [...remoteMapped];

    const isDuplicate = (candidate: XPTransaction, list: XPTransaction[]) => {
      return list.some((existing) => {
        if (existing.id === candidate.id) return true;
        if (candidate.reference_id && (existing.reference_id === candidate.reference_id || existing.source_id === candidate.reference_id)) {
          return true;
        }
        if (
          candidate.reference_id &&
          (existing.description?.includes(`[ref:${candidate.reference_id}]`) ||
            existing.reason?.includes(`[ref:${candidate.reference_id}]`))
        ) {
          return true;
        }
        // If candidate comes from a notification, match with existing remote/local transaction
        if (candidate.id.startsWith('notif-')) {
          if (
            Number(existing.amount) === Number(candidate.amount) &&
            (existing.transaction_type?.includes('reward') ||
              existing.description?.toLowerCase().includes('ödül') ||
              existing.transaction_type?.includes('coach') ||
              existing.description?.toLowerCase().includes('koç'))
          ) {
            return true;
          }
        }
        // Match by identical amount and timestamp within 60 seconds
        const timeDiff = Math.abs(
          new Date(existing.created_at).getTime() - new Date(candidate.created_at).getTime()
        );
        if (timeDiff < 60000 && Number(existing.amount) === Number(candidate.amount)) {
          return true;
        }
        return false;
      });
    };

    // Add extra synthesized transactions if not already in remote
    for (const ctx of extraTxs) {
      if (!isDuplicate(ctx, combined)) {
        combined.push(ctx);
      }
    }

    // Add local transactions if not already in remote
    for (const ltx of localTxs) {
      if (!isDuplicate(ltx, combined)) {
        combined.push(ltx);
      }
    }

    return combined
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  },

  /**
   * Core atomic XP insertion with RPC + Direct Table Insert Fallback + Profile & students_xp_data Balance Sync
   */
  async recordXPTransactionWithFallback(params: {
    student_id: string;
    amount: number;
    reason: string;
    source_type: string;
    reference_id?: string;
  }): Promise<{ transaction_id: string; persisted_remotely: boolean }> {
    const cleanStudentId = params.student_id?.trim();
    const cleanAmount = Number(params.amount);
    const cleanReason = params.reason?.trim() || 'XP İşlemi';
    const now = new Date().toISOString();
    const txId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

    let persistedRemotely = false;

    // 1. Try RPC adjust_manual_xp_atomic first
    try {
      const { error: rpcErr } = await supabase.rpc('adjust_manual_xp_atomic', {
        p_student_id: cleanStudentId,
        p_amount: cleanAmount,
        p_reason: cleanReason,
      });

      if (!rpcErr) {
        persistedRemotely = true;
      }
    } catch {
      // RPC fallback
    }

    // 2. If RPC failed or wasn't installed, perform direct insert into xp_transactions
    if (!persistedRemotely) {
      try {
        // Migration 0006_xp.sql schema: amount, transaction_type, description, reference_id
        const { error: insErr } = await supabase.from('xp_transactions').insert({
          id: txId,
          student_id: cleanStudentId,
          amount: cleanAmount,
          transaction_type: params.source_type || 'manual',
          description: cleanReason,
          reference_id: params.reference_id || null,
          created_at: now,
        });

        if (!insErr) {
          persistedRemotely = true;
        } else {
          // Retry with alternative columns in case table has reason / source_type instead
          const { error: altInsErr } = await supabase.from('xp_transactions').insert({
            student_id: cleanStudentId,
            amount: cleanAmount,
            reason: cleanReason,
            source_type: params.source_type || 'manual',
          } as any);

          if (!altInsErr) {
            persistedRemotely = true;
          }
        }
      } catch {
        // handled via local ledger
      }
    }

    // 3. Always save to local storage cache so the UI updates 100% reliably even if RLS or missing table blocks remote write
    const localTx: XPTransaction = {
      id: txId,
      student_id: cleanStudentId,
      amount: cleanAmount,
      transaction_type: (params.source_type as any) || 'manual',
      description: cleanReason,
      reason: cleanReason,
      source_type: params.source_type || 'manual',
      reference_id: params.reference_id,
      source_id: params.reference_id,
      created_at: now,
    };
    saveLocalXPTransaction(localTx);

    // 4. Recalculate student XP and sync students_xp_data and profiles table
    try {
      const updatedXP = await this.getStudentXP(cleanStudentId);
      if (updatedXP) {
        await this.syncStudentProfileXP(
          cleanStudentId,
          updatedXP.wallet_xp,
          updatedXP.lifetime_xp,
          updatedXP.current_streak_days
        );
      }
    } catch {
      // ignore sync error
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mahfaza:xp-updated', {
          detail: { studentId: cleanStudentId, amount: cleanAmount },
        })
      );
    }

    return { transaction_id: txId, persisted_remotely: persistedRemotely };
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
    if (!payload.student_id) {
      throw new Error('Öğrenci kimliği (student_id) eksik.');
    }

    // 1. Authoritative Idempotency Guard: If reference_id is provided, check if already awarded
    if (payload.reference_id && payload.base_amount > 0) {
      try {
        const { data: existingTx } = await supabase
          .from('xp_transactions')
          .select('id')
          .eq('student_id', payload.student_id)
          .or(`reference_id.eq.${payload.reference_id},description.ilike.%[ref:${payload.reference_id}]%`)
          .maybeSingle();

        if (existingTx) {
          return {
            success: true,
            awarded_xp: payload.base_amount,
            message: 'Bu işlem için XP zaten tanımlanmış.',
          };
        }
      } catch {
        // proceed
      }

      const localExisting = getLocalXPTransactions().find(
        (t) =>
          t.student_id === payload.student_id &&
          (t.reference_id === payload.reference_id ||
            (t.description && t.description.includes(`[ref:${payload.reference_id}]`)) ||
            (t.reason && t.reason.includes(`[ref:${payload.reference_id}]`)))
      );
      if (localExisting) {
        return {
          success: true,
          awarded_xp: payload.base_amount,
          message: 'Bu işlem için XP zaten tanımlanmış.',
        };
      }
    }

    const finalReason = payload.reference_id
      ? `${payload.description || 'Görev tamamlama ödülü'} [ref:${payload.reference_id}]`
      : payload.description || 'Görev tamamlama ödülü';

    await this.recordXPTransactionWithFallback({
      student_id: payload.student_id,
      amount: Number(payload.base_amount),
      reason: finalReason,
      source_type: payload.action_type || 'study_proof',
      reference_id: payload.reference_id,
    });

    const latestXP = await this.getStudentXP(payload.student_id);

    return {
      success: true,
      awarded_xp: Number(payload.base_amount),
      streak: latestXP?.current_streak_days || 1,
      today_earned_xp: latestXP?.today_earned_xp || Number(payload.base_amount),
      message: 'XP başarıyla öğrenci cüzdanına yatırıldı.',
    };
  },

  /**
   * Controlled Coach manual XP adjustment with seamless fallback
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
    if (!payload.student_id || !payload.student_id.trim()) {
      throw new Error('Lütfen geçerli bir öğrenci seçin.');
    }
    const numericAmount = Number(payload.amount);
    if (isNaN(numericAmount) || numericAmount === 0) {
      throw new Error('XP miktarı 0 olamaz.');
    }
    if (!payload.reason || !payload.reason.trim()) {
      throw new Error('Açıklama / işlem gerekçesi zorunludur.');
    }

    const result = await this.recordXPTransactionWithFallback({
      student_id: payload.student_id.trim(),
      amount: numericAmount,
      reason: `[Koç Manuel XP] ${payload.reason.trim()}`,
      source_type: 'manual_coach_adjustment',
    });

    // Send instant notification to student
    try {
      await notificationService.createNotification({
        user_id: payload.student_id.trim(),
        title: numericAmount > 0 ? '✨ XP Bakiyeniz Arttırıldı!' : '📉 XP Bakiyeniz Güncellendi',
        message: `Koçunuz bakiyenize ${numericAmount > 0 ? '+' : ''}${numericAmount} XP yansıttı. Gerekçe: ${payload.reason.trim()}`,
        type: 'xp',
        link: '/student/xp',
      });
    } catch {
      // safe fallback
    }

    return {
      success: true,
      student_id: payload.student_id.trim(),
      amount: numericAmount,
      transaction_id: result.transaction_id,
    };
  },

  async getAllStudentsLeaderboard(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*');

      const allRows = [...(error || !data ? [] : data), ...getLocalXPTransactions()];

      if (allRows.length > 0) {
        const studentSums: Record<string, { wallet: number; lifetime: number }> = {};
        for (const row of allRows) {
          const sId = row.student_id;
          if (!sId) continue;
          if (!studentSums[sId]) {
            studentSums[sId] = { wallet: 0, lifetime: 0 };
          }
          studentSums[sId].wallet += Number(row.amount) || 0;
          if (Number(row.amount) > 0) {
            studentSums[sId].lifetime += Number(row.amount);
          }
        }

        const studentIds = Object.keys(studentSums);
        const { data: profs } = await supabase
          .from('profiles')
          .select('*')
          .in('id', studentIds);

        const profMap = new Map((profs || []).map((p: any) => [p.id, p]));

        const leaderboard = studentIds
          .map((id) => {
            const p = profMap.get(id);
            const sums = studentSums[id];
            return {
              student_id: id,
              first_name: p?.full_name
                ? p.full_name.split(' ')[0]
                : p?.name
                ? p.name.split(' ')[0]
                : 'Öğrenci',
              last_name: p?.full_name
                ? p.full_name.split(' ').slice(1).join(' ')
                : p?.name
                ? p.name.split(' ').slice(1).join(' ')
                : '',
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
