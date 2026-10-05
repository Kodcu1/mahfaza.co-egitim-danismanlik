import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { xpService } from '../../services/xpService';
import { XPTransaction, StudentXPData } from '../../types';
import { getStreakMultiplier, DAILY_XP_HARD_CAP, calculateLevel } from '../../utils/xpEngine';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Award,
  ArrowUpRight,
  ArrowDownLeft,
  Flame,
  Zap,
  Coins,
  TrendingUp,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const StudentXPHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [xpData, setXpData] = useState<StudentXPData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [txs, xp] = await Promise.all([
        xpService.getStudentTransactions(user.id, 100),
        xpService.getStudentXP(user.id),
      ]);
      setTransactions(txs);
      setXpData(xp);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingState message="XP motoru ve işlem defteri yükleniyor..." />;
  }

  const streakDays = xpData?.current_streak_days || 0;
  const multiplier = getStreakMultiplier(streakDays);
  const levelInfo = xpData ? calculateLevel(xpData.lifetime_xp) : calculateLevel(0);
  const todayEarned = xpData?.today_earned_xp || 0;
  const todayRemaining = Math.max(0, DAILY_XP_HARD_CAP - todayEarned);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
            Akademik Gelişim & XP Defteri
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            XP & İlerleme Merkezi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            "Planını Kur. Disiplinini Koru. Hedefine Ulaş." — Mahfaza.co metodolojisi
          </p>
        </div>
      </div>

      {/* Primary XP Metrics Grid (Section 8) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Toplam XP */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Toplam XP</span>
            <Award className="w-4 h-4 text-amber-400/80" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {xpData?.lifetime_xp || 0}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Ömür boyu (Asla azalmaz)</span>
        </div>

        {/* Metric 2: Cüzdan XP */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Cüzdan XP</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {xpData?.wallet_xp || 0}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Ödül mağazasında harcanır</span>
        </div>

        {/* Metric 3: Bugünkü XP */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Bugünkü XP</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {todayEarned} <span className="text-xs font-normal text-zinc-500">/ 150</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Kalan kota: {todayRemaining} XP</span>
        </div>

        {/* Metric 4: Seri */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Seri</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {streakDays} <span className="text-xs font-normal text-zinc-400">Gün</span>
          </div>
          <span className="text-[10px] text-amber-400/80 mt-1 block">
            {streakDays >= 3 ? 'Aktif seride' : '3 günde çarpan açılır'}
          </span>
        </div>

        {/* Metric 5: Çarpan & Seviye */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Seri Çarpanı</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400 tabular-nums">
            {multiplier.toFixed(2)}x
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">
            Lv.{levelInfo.level} &bull; {levelInfo.title}
          </span>
        </div>
      </div>

      {/* XP Transaction History */}
      <Card
        title="XP Geçmişi"
        subtitle="Gerçek zamanlı veritabanı denetim defteri (Son işlemler)"
      >
        {transactions.length === 0 ? (
          <EmptyState
            title="Henüz İşlem Kaydı Yok"
            description="Çalışma seanslarınızı tamamladıkça veya ödül aldıkça tüm hareketler burada listelenecektir."
            icon={<Award className="w-8 h-8 text-zinc-500" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-zinc-500 font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Tarih</th>
                  <th className="py-2.5 px-3">İşlem Türü</th>
                  <th className="py-2.5 px-3">Açıklama</th>
                  <th className="py-2.5 px-3 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {transactions.map((tx) => {
                  const isEarning = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-3 text-zinc-400">
                        {new Date(tx.created_at).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <Badge variant={isEarning ? 'success' : 'danger'}>
                          {tx.transaction_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-zinc-300 font-sans">
                        {tx.description}
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            isEarning ? 'text-emerald-400' : 'text-rose-400'
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
