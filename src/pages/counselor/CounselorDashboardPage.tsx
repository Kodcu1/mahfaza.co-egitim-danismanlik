import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { guidanceService } from '../../services/guidanceService';
import { relationshipService } from '../../services/relationshipService';
import { subscriptionService } from '../../services/subscriptionService';
import { GuidanceNote, Profile, UserSubscription } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { ShieldCheck, Lock, Plus, Trash2, Calendar, FileText, CreditCard } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';

export const CounselorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<GuidanceNote[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  // New Note Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [category, setCategory] = useState('Akademik Gelişim');
  const [privateNote, setPrivateNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allNotes, studs, sub] = await Promise.all([
        guidanceService.getAllCounselorNotes(),
        relationshipService.getProfilesByRole('student'),
        user?.id ? subscriptionService.getUserSubscription(user.id) : null,
      ]);
      setNotes(allNotes);
      setStudents(studs);
      setUserSubscription(sub);
      if (studs.length > 0) setTargetStudentId(studs[0].id);
    } catch (err) {
      console.error('Error loading guidance notes:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !targetStudentId || !privateNote.trim()) return;
    setSavingNote(true);
    setFormError(null);

    try {
      await guidanceService.createNote(targetStudentId, user.id, category, privateNote.trim());
      setModalOpen(false);
      setPrivateNote('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Not kaydedilemedi.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await guidanceService.deleteNote(id);
      await loadData();
    } catch (err: any) {
      console.error('Silme hatası:', err.message);
    }
  };

  if (loading) {
    return <LoadingState message="Rehberlik verileri yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            İzole Rehberlik & Psikolojik Danışmanlık
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Rehberlik Masası
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Yüksek hassasiyetli öğrenci görüşme kayıtları, davranış takibi ve müdahale planları (RLS Korumalı).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/pricing"
            className="p-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 transition-colors flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4 text-rose-400" />
            <div className="text-left">
              <div className="text-[10px] text-zinc-500 font-mono uppercase">
                {userSubscription?.plan?.name || 'Rehberlik Başlangıç'}
              </div>
              <div className="text-[11px] font-bold text-zinc-200 font-mono">
                Kapasite: {userSubscription?.plan?.student_capacity || 30} Danışan
              </div>
            </div>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Yeni Rehberlik Notu
          </Button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="p-3.5 rounded bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-300 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
        <p className="leading-relaxed">
          <strong>Güvenlik Garantisi:</strong> Bu sayfadaki özel rehberlik notları Supabase Row Level Security (RLS) ile veritabanı seviyesinde şifrelenmiş ve kısıtlanmıştır. Öğretmenler, veliler, koçlar ve öğrencilerin bu tablodan veri okuma yetkisi tamamen engellenmiştir.
        </p>
      </div>

      {/* Notes List */}
      <Card
        title={`Özel Rehberlik Kayıtları (${notes.length})`}
        subtitle="Öğrencilerle yapılan bireysel görüşmeler ve gelişim gözlemleri"
      >
        {notes.length === 0 ? (
          <EmptyState
            title="Kayıt Bulunmuyor"
            description="Henüz kaydedilmiş bir rehberlik veya danışmanlık notu bulunmuyor."
            actionText="Not Ekle"
            onAction={() => setModalOpen(true)}
            icon={<FileText className="w-8 h-8 text-zinc-500" />}
          />
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {notes.map((note) => (
              <div key={note.id} className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200 text-xs">
                      {note.student ? `${note.student.first_name} ${note.student.last_name}` : 'Öğrenci'}
                    </span>
                    <Badge variant="amber">{note.category}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {new Date(note.created_at).toLocaleDateString('tr-TR')}
                    </span>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-zinc-500 hover:text-rose-400 p-1"
                      title="Notu Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded bg-zinc-950/70 border border-zinc-850 text-xs text-zinc-300 leading-relaxed font-sans">
                  {note.private_note}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal: New Guidance Note */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Yeni Özel Rehberlik Notu"
        subtitle="Öğrenci görüşme veya davranış izleme kaydı"
        maxWidth="md"
      >
        <form onSubmit={handleCreateNote} className="space-y-4 text-xs">
          <Select
            label="Öğrenci"
            value={targetStudentId}
            onChange={(e) => setTargetStudentId(e.target.value)}
            options={students.map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))}
          />

          <Select
            label="Kategori"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: 'Akademik Gelişim', label: 'Akademik Gelişim' },
              { value: 'Sınav Kaygısı', label: 'Sınav Kaygısı & Motivasyon' },
              { value: 'Aile Görüşmesi', label: 'Aile Görüşmesi' },
              { value: 'Bireysel Danışmanlık', label: 'Bireysel Danışmanlık' },
              { value: 'Kriz / Acil Durum', label: 'Kriz / Acil Durum Müdahalesi' },
            ]}
          />

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Özel Görüşme Notu</label>
            <textarea
              rows={5}
              required
              placeholder="Öğrenci ile yapılan görüşme detayları, gözlemlenen davranışlar ve alınan kararlar..."
              value={privateNote}
              onChange={(e) => setPrivateNote(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingNote}>
              Gizli Notu Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
