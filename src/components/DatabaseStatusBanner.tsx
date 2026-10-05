import React, { useState } from 'react';
import { Database, Copy, Check, ChevronRight } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

export const DatabaseStatusBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const migrationsList = [
    { num: '0001', name: 'extensions.sql', desc: 'UUID ve pgcrypto eklentileri' },
    { num: '0002', name: 'enums.sql', desc: 'Roller, durumlar ve nadirlik seviyeleri' },
    { num: '0003', name: 'profiles.sql', desc: 'Kullanıcı kimlik ve profil tetikleyicisi' },
    { num: '0004', name: 'academic_core.sql', desc: 'Sınıflar, dersler, haftalık program, ödev & sınavlar' },
    { num: '0005', name: 'guidance.sql', desc: 'Rehberlik & psikolojik danışmanlık özel notları' },
    { num: '0006', name: 'xp.sql', desc: 'Oyunlaştırma cüzdanı & işlem defteri' },
    { num: '0007', name: 'rewards.sql', desc: 'Mahfaza ödül vitrini & talep onaylama' },
    { num: '0008', name: 'rls.sql', desc: 'Satır Seviyesi Güvenlik (RLS) politikaları' },
    { num: '0009', name: 'functions.sql', desc: 'Atomik XP motoru & ödül takas mekanizması' },
    { num: '0010', name: 'indexes.sql', desc: 'B-Tree indeksler & sistem denetim log tablosu' },
  ];

  const handleCopyEnvSample = () => {
    const text = `VITE_SUPABASE_URL="https://your-project.supabase.co"\nVITE_SUPABASE_ANON_KEY="eyJhbGciOi..."`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Database className={`w-3.5 h-3.5 ${isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-zinc-300 font-medium">
            {isSupabaseConfigured ? 'Supabase Bağlı' : 'Supabase Yapılandırması Bekleniyor'}
          </span>
          <span className="text-zinc-500 hidden sm:inline">·</span>
          <span className="text-zinc-500 hidden sm:inline">10 SQL Migrasyonu Hazır</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Veritabanı & Migrasyon Bilgisi</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Mahfaza.co Veritabanı & Migrasyon Mimarisi"
        subtitle="PostgreSQL şeması, RLS kuralları ve atomik fonksiyonlar"
        maxWidth="lg"
      >
        <div className="space-y-5 text-xs text-zinc-300">
          <div className="p-3.5 rounded bg-zinc-950/80 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Gerekli Ortam Değişkenleri (.env)</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyEnvSample}
                leftIcon={copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              >
                {copied ? 'Kopyalandı' : 'Örneği Kopyala'}
              </Button>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Supabase Dashboard &gt; Project Settings &gt; API bölümünden Project URL ve Anon public anahtarınızı <code className="text-amber-300 font-mono">.env</code> dosyanıza ekleyin.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-200 mb-2.5">Hazırlanmış 10 Aşamalı SQL Migrasyon Dosyaları:</h4>
            <div className="divide-y divide-zinc-800/80 border border-zinc-800 rounded bg-zinc-950/50">
              {migrationsList.map((m) => (
                <div key={m.num} className="p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-amber-400/90 font-medium">{m.num}</span>
                    <span className="text-zinc-200 font-medium">{m.name}</span>
                  </div>
                  <span className="text-zinc-500 text-right">{m.desc}</span>
                </div>
              ))}
            </div>
            <p className="text-zinc-500 mt-2">
              Tüm SQL dosyaları projenin <code className="text-zinc-300 font-mono">/supabase/migrations/</code> dizinindedir. Sırayla Supabase SQL Editor'da çalıştırılabilir.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
              Kapat
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
