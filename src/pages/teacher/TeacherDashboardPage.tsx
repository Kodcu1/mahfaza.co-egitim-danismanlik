import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { academicService } from '../../services/academicService';
import { attendanceService } from '../../services/attendanceService';
import { homeworkService } from '../../services/homeworkService';
import { examService } from '../../services/examService';
import { subscriptionService } from '../../services/subscriptionService';
import { AcademicClass, ScheduleItem, Homework, AttendanceSession, UserSubscription } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Calendar,
  CheckSquare,
  BookOpen,
  GraduationCap,
  Users,
  Plus,
  ArrowRight,
  CreditCard,
} from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';

export const TeacherDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [recentSessions, setRecentSessions] = useState<AttendanceSession[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [cls, sched, hws, sessions, sub] = await Promise.all([
        academicService.getClasses(),
        academicService.getMasterSchedule(undefined, user.id),
        homeworkService.getHomeworks(),
        attendanceService.getSessions(),
        subscriptionService.getUserSubscription(user.id),
      ]);
      setClasses(cls);
      setSchedule(sched);
      setHomeworks(hws.filter((h) => h.teacher_id === user.id || !h.teacher_id));
      setRecentSessions(sessions.slice(0, 5));
      setUserSubscription(sub);
    } catch (err) {
      console.error('Error loading teacher data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingState message="Öğretmen kumanda merkezi yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Öğretmen Masası</span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Akademik Eğitim & Değerlendirme
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Derslik yoklaması, haftalık ders programı, ödev notlandırma ve deneme sınav girişleri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/pricing"
            className="p-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 transition-colors flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <div className="text-[10px] text-zinc-500 font-mono uppercase">
                {userSubscription?.plan?.name || 'Öğretmen Başlangıç'}
              </div>
              <div className="text-[11px] font-bold text-zinc-200 font-mono">
                Kapasite: {userSubscription?.plan?.student_capacity || 30} Öğrenci
              </div>
            </div>
          </Link>

          <NavLink to="/teacher/content">
            <Button variant="secondary" size="sm" leftIcon={<BookOpen className="w-3.5 h-3.5" />}>
              Materyaller
            </Button>
          </NavLink>
          <NavLink to="/teacher/attendance">
            <Button variant="primary" size="sm" leftIcon={<CheckSquare className="w-3.5 h-3.5" />}>
              Yoklama Al
            </Button>
          </NavLink>
          <NavLink to="/teacher/homework">
            <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Ödev Ver
            </Button>
          </NavLink>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Haftalık Dersim</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {schedule.length} <span className="text-xs font-normal text-zinc-500">Saat</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Haftalık toplam seans</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Aktif Sınıflar</span>
            <Users className="w-4 h-4 text-zinc-300" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {classes.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Kayıtlı sınıf şubesi</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Verilen Ödevler</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {homeworks.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Aktif görev</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Yoklama Kaydı</span>
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {recentSessions.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Son tamamlanan seans</span>
        </div>
      </div>

      {/* Grid: Timetable & Recent Homeworks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Ders Çizelgem"
          subtitle="Atandığınız haftalık ders saatleri"
          action={
            <NavLink to="/teacher/schedule" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <span>Tümü</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          }
        >
          {schedule.length === 0 ? (
            <EmptyState
              title="Ders Ataması Yok"
              description="Yönetici tarafından adınıza atanmış bir ders saati bulunmuyor."
              icon={<Calendar className="w-6 h-6 text-zinc-500" />}
            />
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {schedule.slice(0, 6).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-zinc-200">{item.subject_name || 'Ders'}</span>
                    <span className="text-zinc-500 ml-2">· {item.class_name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-amber-400 font-bold">{item.period}. Ders</span>
                    {item.room && <span className="text-zinc-500 text-[10px] ml-2">({item.room})</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Aktif Ödevler & Teslimler"
          subtitle="Öğrencilere atadığınız ödevler ve teslim durumu"
          action={
            <NavLink to="/teacher/homework" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <span>Yönet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          }
        >
          {homeworks.length === 0 ? (
            <EmptyState
              title="Ödev Bulunmuyor"
              description="Henüz bir ödev tanımlamadınız."
              actionText="Yeni Ödev Ver"
              onAction={() => window.location.href = '/teacher/homework'}
              icon={<BookOpen className="w-6 h-6 text-zinc-500" />}
            />
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {homeworks.slice(0, 5).map((hw) => (
                <div key={hw.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-zinc-200">{hw.title}</span>
                    <div className="text-[10px] text-zinc-500">
                      Sınıf: {hw.class_name || 'Genel'} · Son Tarih: {new Date(hw.due_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <Badge variant="amber">Aktif</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
