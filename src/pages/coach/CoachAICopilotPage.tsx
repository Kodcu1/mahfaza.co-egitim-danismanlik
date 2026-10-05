import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Sparkles, Cpu, ShieldCheck } from 'lucide-react';

export const CoachAICopilotPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-zinc-800">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">AI Akademik Analiz Modülü</span>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
          Yapay Zeka Destekli Öğrenci Analizi
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Öğrenci çalışma temposu, net sapmaları ve ders bazlı risk analiz modelleri.
        </p>
      </div>

      {/* Section 45 Compliant Configuration / Interface Preparation State */}
      <Card className="text-center py-12 px-6">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <Cpu className="w-6 h-6 text-amber-400" />
        </div>

        <h3 className="text-base font-bold text-zinc-100 mb-2">
          AI Analiz Entegrasyonu Beklemede
        </h3>

        <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
          Mahfaza.co yapay zeka modülü mimarisi; öğrenci deneme netlerini, soru çözüm hızlarını ve çalışma istikrarını analiz etmek üzere hazırlanmıştır.
          <br /><br />
          Sistem prensipleri gereğince <strong>sahte veya rastgele üretilmiş AI sonuçları sunulmamaktadır</strong>. Yapay zeka servis sağlayıcısı bağlandığında analiz modelleri doğrudan doğrulanmış veritabanı kayıtları üzerinden çalışacaktır.
        </p>

        <div className="inline-flex items-center gap-2 p-2.5 rounded bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Mimarisi Hazırlanan Modüller: TYT/AYT Net Tahmini, Soru Dağılımı ve Risk Tespiti</span>
        </div>
      </Card>
    </div>
  );
};
