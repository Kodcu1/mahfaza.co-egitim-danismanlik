import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AuditLog } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export const AdminAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('audit_logs')
      .select(`
        id, actor_id, action, entity_type, entity_id, metadata, created_at,
        profiles:actor_id(full_name, name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data) {
          setLogs(data.map((r: any) => {
            const ap = r.profiles;
            return {
              id: r.id,
              actor_id: r.actor_id,
              action: r.action,
              entity_type: r.entity_type,
              entity_id: r.entity_id,
              metadata: r.metadata,
              created_at: r.created_at,
              actor: ap
                ? {
                    ...ap,
                    first_name: ap.full_name ? ap.full_name.split(' ')[0] : (ap.name ? ap.name.split(' ')[0] : 'Sistem'),
                    last_name: ap.full_name ? ap.full_name.split(' ').slice(1).join(' ') : (ap.name ? ap.name.split(' ').slice(1).join(' ') : ''),
                  }
                : undefined,
            };
          }));
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingState message="Sistem denetim logları yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-amber-200 text-xs font-bold uppercase tracking-wider mb-1.5">
          İzlenebilirlik & Güvenlik
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
          Sistem Denetim Logları (Audit Log)
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
          Kritik idari işlemler, oturum hareketleri ve yetki değişiklikleri değişmez log kaydında saklanır.
        </p>
      </div>

      <Card
        title="Son Denetim Kayıtları"
        subtitle="Veritabanı düzeyinde kayıt altına alınan son 100 idari işlem"
      >
        {logs.length === 0 ? (
          <EmptyState
            title="Henüz Denetim Logu Bulunmuyor"
            description="İdari işlemler gerçekleştirildikçe sistem denetim olayları burada kronolojik olarak listelenecektir."
            icon={<ShieldCheck className="w-8 h-8 text-zinc-500" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-zinc-500 font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Tarih</th>
                  <th className="py-2.5 px-3">Kullanıcı (Aktör)</th>
                  <th className="py-2.5 px-3">Aksiyon</th>
                  <th className="py-2.5 px-3">Hedef Varlık</th>
                  <th className="py-2.5 px-3">Detay / Meta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/40">
                    <td className="py-3 px-3 text-zinc-400">
                      {new Date(log.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      {log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : 'Sistem'}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <Badge variant="amber">{log.action}</Badge>
                    </td>
                    <td className="py-3 px-3 text-zinc-400">
                      {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                    </td>
                    <td className="py-3 px-3 text-zinc-500 truncate max-w-xs">
                      {JSON.stringify(log.metadata || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
