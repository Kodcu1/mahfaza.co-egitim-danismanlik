import React, { useState, useEffect } from 'react';
import { academicService } from '../../services/academicService';
import { ScheduleItem } from '../../types';
import { Card } from '../../components/ui/Card';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { Calendar } from 'lucide-react';

export const StudentSchedulePage: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    academicService.getMasterSchedule().then((items) => {
      setSchedule(items);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const days = [
    { id: 1, name: 'Pazartesi' },
    { id: 2, name: 'Salı' },
    { id: 3, name: 'Çarşamba' },
    { id: 4, name: 'Perşembe' },
    { id: 5, name: 'Cuma' },
    { id: 6, name: 'Cumartesi' },
  ];

  if (loading) {
    return <LoadingState message="Ders programı yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-zinc-800">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Haftalık Çizelge</span>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
          Ders Programım
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Haftalık ders seansları, derslikler ve branş öğretmenleri çizelgesi.
        </p>
      </div>

      {schedule.length === 0 ? (
        <EmptyState
          title="Henüz Ders Programı Eklenmemiş"
          description="Sistem yöneticiniz veya danışmanınız sınıfınız için haftalık ders programı tanımladığında burada görünecektir."
          icon={<Calendar className="w-8 h-8 text-zinc-500" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map((day) => {
            const dayItems = schedule.filter((s) => s.day_of_week === day.id);
            return (
              <Card key={day.id} title={day.name} className="h-full">
                {dayItems.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-4">Bu gün için planlı ders yok.</p>
                ) : (
                  <div className="divide-y divide-zinc-800/80">
                    {dayItems.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-start justify-between">
                        <div>
                          <div className="text-xs font-semibold text-zinc-200">
                            {item.subject_name || 'Ders'}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {item.teacher_name || 'Öğretmen Belirtilmedi'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono text-amber-400 font-medium">
                            {item.period}. Ders
                          </span>
                          {item.room && (
                            <div className="text-[10px] text-zinc-500">
                              Oda: {item.room}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
