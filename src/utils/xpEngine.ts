/**
 * Mahfaza.co - Central Gamification & XP Engine
 * Planını Kur. Disiplinini Koru. Hedefine Ulaş.
 *
 * Enforces canonical deterministic rules:
 * - Lifetime XP never decreases
 * - Daily hard cap: 150 XP per student per calendar day (Europe/Istanbul)
 * - Deterministic streak multipliers: 3d(1.05), 7d(1.10), 14d(1.15), 30d(1.20), 60+d(1.25)
 * - Multiplier applies before the daily hard cap
 */

import { LevelInfo } from '../types';

export const DAILY_XP_HARD_CAP = 150;
export const CANONICAL_TIMEZONE = 'Europe/Istanbul';

export const LEVEL_THRESHOLDS: { level: number; title: string; minXP: number; maxXP: number }[] = [
  { level: 1, title: 'Çırak', minXP: 0, maxXP: 250 },
  { level: 2, title: 'Talebe', minXP: 251, maxXP: 600 },
  { level: 3, title: 'Kaşif', minXP: 601, maxXP: 1200 },
  { level: 4, title: 'Araştırmacı', minXP: 1201, maxXP: 2100 },
  { level: 5, title: 'Bilgin', minXP: 2101, maxXP: 3400 },
  { level: 6, title: 'Üstat', minXP: 3401, maxXP: 5200 },
  { level: 7, title: 'Mimar', minXP: 5201, maxXP: 7800 },
  { level: 8, title: 'Başmuallim', minXP: 7801, maxXP: 11200 },
  { level: 9, title: 'Allame', minXP: 11201, maxXP: 16000 },
  { level: 10, title: 'Mahfaza Muhafızı', minXP: 16001, maxXP: 999999 },
];

/**
 * Calculates current level details deterministically from lifetime_xp
 */
export function calculateLevel(lifetimeXP: number): LevelInfo {
  const safeXP = Math.max(0, lifetimeXP || 0);
  const currentTier = LEVEL_THRESHOLDS.find(
    (t) => safeXP >= t.minXP && safeXP <= t.maxXP
  ) || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

  const range = currentTier.maxXP - currentTier.minXP;
  const progressInTier = safeXP - currentTier.minXP;
  const progressPercent = currentTier.level === 10 
    ? 100 
    : Math.min(100, Math.max(0, Math.round((progressInTier / (range || 1)) * 100)));

  return {
    level: currentTier.level,
    title: currentTier.title,
    minXP: currentTier.minXP,
    maxXP: currentTier.maxXP,
    progressPercent,
  };
}

/**
 * Evaluates streak multiplier deterministically
 */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 60) return 1.25;
  if (streakDays >= 30) return 1.20;
  if (streakDays >= 14) return 1.15;
  if (streakDays >= 7) return 1.10;
  if (streakDays >= 3) return 1.05;
  return 1.0;
}

/**
 * Earning action standard base XP values
 */
export const XP_EARNING_ACTIONS = {
  STUDY_15_MIN: { baseXP: 10, label: '15-29 dk Çalışma Seansı' },
  STUDY_30_MIN: { baseXP: 20, label: '30-59 dk Çalışma Seansı' },
  STUDY_60_MIN: { baseXP: 35, label: '60-89 dk Derin Odaklanma' },
  STUDY_90_MIN: { baseXP: 50, label: '90+ dk Maraton Çalışma' },
  QUESTION_SOLVE: { baseXP: 15, label: 'Soru Çözüm Seti (20+ Soru)' },
  HOMEWORK_COMPLETE: { baseXP: 25, label: 'Ödev Teslimi' },
  EXAM_ANALYSIS: { baseXP: 45, label: 'Deneme Sınavı Net Analizi' },
  TASK_COMPLETE: { baseXP: 15, label: 'Günlük Akademik Görev' },
} as const;

/**
 * Calculates net awardable XP respecting daily 150 XP hard cap and streak multiplier
 */
export function previewAwardCalculation(
  baseXP: number,
  streakDays: number,
  todayEarnedXP: number
): { calculatedXP: number; multiplier: number; finalAwardable: number; dailyRemaining: number } {
  const multiplier = getStreakMultiplier(streakDays);
  const calculatedXP = Math.round(baseXP * multiplier);
  const room = Math.max(0, DAILY_XP_HARD_CAP - todayEarnedXP);
  const finalAwardable = Math.min(calculatedXP, room);
  const dailyRemaining = Math.max(0, room - finalAwardable);

  return {
    calculatedXP,
    multiplier,
    finalAwardable,
    dailyRemaining,
  };
}
