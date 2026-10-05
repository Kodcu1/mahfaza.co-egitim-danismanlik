import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { attendanceService } from '../../services/attendanceService';
import { examService } from '../../services/examService';
import { xpService } from '../../services/xpService';
import { Profile, AttendanceRecord, ExamResult, StudentXPData } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { Users, CheckSquare, Target, Flame, Award, ShieldCheck } from 'lucide-react';

export const ParentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Profile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [childXP, setChildXP] = useState<StudentXPData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const kids = await relationshipService.getParentLinkedChildren(user.id);
      setChildren(kids);
      if (kids.length > 0 && !selectedChildId) {
        setSelectedChildId(kids[0].id);
      }
    } catch (err) {
      console.error('Error loading parent data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedChildId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When child changes, load their verified records
  useEffect(() => {
    if (!selectedChildId) return;
    Promise.all([
      attendanceService.getStudentAttendance(selectedChildId),
      examService.getStudentExamResults(selectedChildId),
      xpService.getStudentXP(selectedChildId),
    ]).then(([att, exams, xp]) => {
      setAttendance(att);
      setExamResults(exams);
      setChildXP(xp);
    }).catch(console.error);
  }, [selectedChildId]);

  if (loading) {
    return <LoadingState message="Veli takip portalı yükleniyor..." />;
  }

  const activeChild = children.find((c) => c.id === selectedChildId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Veli Bilgilendirme Portalı</span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Öğrenci Gelişim & Takip Raporu
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Yalnızca size bağlı öğrencilerin doğrulanmış yoklama, ödev ve sınav net dökümleri.
          </p>
        </div>

        {/* Child Selector Tabs */}
        {children.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  selectedChildId === child.id
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {child.first_name} {child.last_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {children.length === 0 ? (
        <EmptyState
          title="Bağlı Öğrenci Bulunmuyor"
          description="Hesabınıza eşleştirilmiş bir öğrenci kaydı bulunmuyor. Kurum idaresi ile iletişime geçerek veli-öğrenci bağınızı tanımlatabilirsiniz."
          icon={<Users className="w-8 h-8 text-zinc-500" />}
        />
      ) : (
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Öğrenci</span>
              <span className="text-base font-bold text-zinc-100">
                {activeChild?.first_name} {activeChild?.last_name}
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Disiplin Serisi</span>
              <span className="text-lg font-bold font-mono text-amber-400 flex items-center gap-1">
                <Flame className="w-4 h-4" />
                {childXP?.current_streak_days || 0} Gün
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Toplam XP Başarısı</span>
              <span className="text-lg font-bold font-mono text-zinc-100">
                {childXP?.lifetime_xp || 0} XP
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Girilmiş Deneme</span>
              <span className="text-lg font-bold font-mono text-zinc-100">
                {examResults.length} Sınav
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Records */}
            <Card
              title="Devamsızlık & Katılım Kayıtları"
              subtitle="Öğretmenler tarafından kaydedilen ders yoklamaları"
            >
              {attendance.length === 0 ? (
                <EmptyState
                  title="Yoklama Kaydı Yok"
                  description="Öğrencinin henüz bir yoklama kaydı bulunmuyor."
                  icon={<CheckSquare className="w-6 h-6 text-zinc-500" />}
                />
              ) : (
                <div className="divide-y divide-zinc-800/80">
                  {attendance.slice(0, 10).map((att) => (
                    <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-400 font-mono">
                          {new Date(att.created_at).toLocaleDateString('tr-TR')}
                        </span>
                        {att.note && <p className="text-[11px] text-zinc-500 mt-0.5">{att.note}</p>}
                      </div>
                      <Badge
                        variant={
                          att.status === 'present'
                            ? 'success'
                            : att.status === 'absent'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {att.status === 'present'
                          ? 'Derste'
                          : att.status === 'absent'
                          ? 'Devamsız'
                          : att.status === 'late'
                          ? 'Geç Kaldı'
                          : 'İzinli'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Exam Results */}
            <Card
              title="Deneme Sınavları & Netler"
              subtitle="Öğrencinin son deneme sınavı sonuçları"
            >
              {examResults.length === 0 ? (
                <EmptyState
                  title="Sınav Sonucu Yok"
                  description="Henüz bir deneme sınavı sonucu girilmemiştir."
                  icon={<Target className="w-6 h-6 text-zinc-500" />}
                />
              ) : (
                <div className="divide-y divide-zinc-800/80 font-mono text-xs">
                  {examResults.map((ex) => (
                    <div key={ex.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-zinc-200 font-sans">{ex.exam?.title || 'Deneme'}</span>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          Tür: {ex.exam?.exam_type || 'TYT'} · T:{ex.turkish_net} M:{ex.math_net} S:{ex.social_net} F:{ex.science_net}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-400 font-bold">{ex.total_net} Net</span>
                        <span className="text-zinc-500 text-[10px] block">{ex.score} Puan</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
