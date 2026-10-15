import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { xpService } from '../../services/xpService';
import { supabase } from '../../lib/supabase';
import { XPTransaction, StudentXPData } from '../../types';
import { getStreakMultiplier, DAILY_XP_HARD_CAP, calculateLevel } from '../../utils/xpEngine';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Award,
  ArrowUpRight,
  ArrowDownLeft,
  Flame,
  Zap,
  Coins,
  TrendingUp,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';

export const StudentXPHistoryPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [xpData, setXpData] = useState<StudentXPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const studentPrimaryId = profile?.id || user?.id || '';
  const studentSecondaryId = user?.id !== profile?.id ? user?.id : undefined;

  const loadData = useCallback(async (isSilent = false) => {
    if (!studentPrimaryId) return;
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const [txs, xp] = await Promise.all([
        xpService.getStudentTransactions(studentPrimaryId, 100, studentSecondaryId),
        xpService.getStudentXP(studentPrimaryId, studentSecondaryId),
      ]);

      setTransactions(txs);
      setXpData(xp);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentPrimaryId, studentSecondaryId]);

  useEffect(() => {
    loadData();

    // 1. Custom DOM Events for instant reactive updates
    const handleLiveSync = () => {
      loadData(true);
    };
    window.addEventListener('mahfaza:xp-updated', handleLiveSync);
    window.addEventListener('mahfaza:new_notification', handleLiveSync);
    window.addEventListener('mahfaza:counts-updated', handleLiveSync);

    // 2. Supabase Real-time Channel Subscriptions
    let channel: any = null;
    if (studentPrimaryId) {
      channel = supabase
        .channel(`public:student_xp_sync:${studentPrimaryId}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
          },
          (payload: any) => {
            const uid = payload?.new?.user_id || payload?.old?.user_id;
            if (!uid || uid === studentPrimaryId || uid === studentSecondaryId) {
              loadData(true);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'xp_transactions',
          },
          (payload: any) => {
            const sid = payload?.new?.student_id || payload?.old?.student_id;
            if (!sid || sid === studentPrimaryId || sid === studentSecondaryId) {
              loadData(true);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'students_xp_data',
          },
          (payload: any) => {
            const sid = payload?.new?.student_id || payload?.old?.student_id;
            if (!sid || sid === studentPrimaryId || sid === studentSecondaryId) {
              loadData(true);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reward_requests',
          },
          (payload: any) => {
            const sid = payload?.new?.student_id || payload?.old?.student_id;
            if (!sid || sid === studentPrimaryId || sid === studentSecondaryId) {
              loadData(true);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'study_proofs',
          },
          (payload: any) => {
            const sid = payload?.new?.student_id || payload?.old?.student_id;
            if (!sid || sid === studentPrimaryId || sid === studentSecondaryId) {
              loadData(true);
            }
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('mahfaza:xp-updated', handleLiveSync);
      window.removeEventListener('mahfaza:new_notification', handleLiveSync);
      window.removeEventListener('mahfaza:counts-updated', handleLiveSync);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData, studentPrimaryId, studentSecondaryId]);

  if (loading && !xpData) {
    return <LoadingState message="XP motoru ve işlem defteri yükleniyor..." />;
  }

  const streakDays = xpData?.current_streak_days || 0;
  const multiplier = getStreakMultiplier(streakDays);
  const levelInfo = xpData ? calculateLevel(xpData.lifetime_xp) : calculateLevel(0);
  const todayEarned = xpData?.today_earned_xp || 0;
  const todayRemaining = Math.max(0, DAILY_XP_HARD_CAP - todayEarned);

  const getBadgeVariant = (txType: string, isEarning: boolean) => {
    if (txType?.includes('coach') || txType?.includes('manual')) return 'warning';
    if (txType?.includes('proof') || txType?.includes('study')) return 'success';
    if (isEarning) return 'success';
    return 'danger';
  };

  const formatTxType = (txType: string) => {
    switch (txType) {
      case 'coach_manual_xp':
      case 'manual_coach_adjustment':
        return 'Koç Tanımlaması';
      case 'study_proof_approved':
      case 'study_proof':
        return 'Çalışma Kanıtı';
      case 'pomodoro_complete':
      case 'study_focus':
        return 'Odak Seansı';
      case 'homework_complete':
        return 'Ödev Tamamlama';
      case 'reward_redeem':
        return 'Ödül Harcaması';
      case 'manual':
        return 'Manuel İşlem';
      default:
        return txType || 'İşlem';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <span className="text-xs font-mono text-amber-700 font-semibold uppercase tracking-wider">
            Akademik Gelişim & XP Defteri
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight mt-0.5">
            XP & İlerleme Merkezi
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            "Planını Kur. Disiplinini Koru. Hedefine Ulaş." — Mahfaza.co metodolojisi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadData(true)}
            isLoading={refreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            Yenile
          </Button>
        </div>
      </div>

      {/* Primary XP Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Toplam XP */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-gray-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Toplam XP</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-gray-800 tabular-nums">
            {xpData?.lifetime_xp || 0}
          </div>
          <span className="text-[10px] text-gray-600 mt-1 block">Ömür boyu (Asla azalmaz)</span>
        </div>

        {/* Metric 2: Cüzdan XP */}
        <div className="bg-white border border-amber-200/80 bg-amber-50/20 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Cüzdan XP</span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700 tabular-nums">
            {xpData?.wallet_xp || 0}
          </div>
          <span className="text-[10px] text-amber-800/80 mt-1 block">Ödül mağazasında harcanır</span>
        </div>

        {/* Metric 3: Bugünkü XP */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-gray-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Bugünkü XP</span>
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 tabular-nums">
            {todayEarned} <span className="text-xs font-normal text-gray-600">/ 150</span>
          </div>
          <span className="text-[10px] text-gray-600 mt-1 block">Kalan kota: {todayRemaining} XP</span>
        </div>

        {/* Metric 4: Seri */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-gray-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Seri</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-gray-800 tabular-nums">
            {streakDays} <span className="text-xs font-normal text-gray-600">Gün</span>
          </div>
          <span className="text-[10px] text-amber-700 mt-1 block font-medium">
            {streakDays >= 3 ? 'Aktif seride' : '3 günde çarpan açılır'}
          </span>
        </div>

        {/* Metric 5: Çarpan & Seviye */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-gray-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Seri Çarpanı</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-sky-600 tabular-nums">
            {multiplier.toFixed(2)}x
          </div>
          <span className="text-[10px] text-gray-600 mt-1 block">
            Lv.{levelInfo.level} &bull; {levelInfo.title}
          </span>
        </div>
      </div>

      {/* XP Transaction History */}
      <Card
        title="XP Geçmişi"
        subtitle="Gerçek zamanlı veritabanı denetim defteri (Son işlemler)"
        action={
          <span className="text-xs font-medium text-slate-500">
            Toplam {transactions.length} hareket
          </span>
        }
      >
        {transactions.length === 0 ? (
          <EmptyState
            title="Henüz İşlem Kaydı Yok"
            description="Çalışma seanslarınızı tamamladıkça veya koçunuz XP tanımladıkça tüm hareketler anında burada listelenecektir."
            icon={<Award className="w-8 h-8 text-gray-500" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-slate-50 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Tarih</th>
                  <th className="py-2.5 px-3">İşlem Türü</th>
                  <th className="py-2.5 px-3">Açıklama</th>
                  <th className="py-2.5 px-3 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                {transactions.map((tx) => {
                  const isEarning = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 font-sans whitespace-nowrap">
                        <Badge variant={getBadgeVariant(tx.transaction_type || '', isEarning)}>
                          {formatTxType(tx.transaction_type || '')}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-gray-800 font-sans font-medium">
                        {tx.description}
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            isEarning ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
                          }`}
                        >
                          {isEarning ? (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              +{tx.amount} XP
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              {tx.amount} XP
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
