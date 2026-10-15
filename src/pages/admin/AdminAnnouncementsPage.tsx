import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { announcementService } from '../../services/announcementService';
import { Announcement, UserRole } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  Users,
} from 'lucide-react';

export const AdminAnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<string>('all');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const list = await announcementService.getAllAnnouncementsAdmin();
      setAnnouncements(list);
    } catch (err) {
      console.warn('Announcements loaded with fallback notice:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setTargetRole('all');
    setPriority('normal');
    setIsPublished(true);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setContent(a.content);
    setTargetRole(a.target_role || 'all');
    setPriority(a.priority);
    setIsPublished(a.is_published);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !title.trim() || !content.trim()) return;
    setSaving(true);
    setFeedback(null);

    try {
      const rolePayload = targetRole === 'all' ? null : (targetRole as UserRole);

      if (editingId) {
        await announcementService.updateAnnouncement(editingId, {
          title: title.trim(),
          content: content.trim(),
          target_role: rolePayload,
          priority,
          is_published: isPublished,
        });
        setFeedback('Duyuru başarıyla güncellendi.');
      } else {
        await announcementService.createAnnouncement({
          title: title.trim(),
          content: content.trim(),
          target_role: rolePayload,
          author_id: user.id,
          priority,
          is_published: isPublished,
        });
        setFeedback('Yeni duyuru oluşturuldu ve yayına alındı.');
      }

      await loadAnnouncements();
      setTimeout(() => {
        setModalOpen(false);
        setFeedback(null);
      }, 1000);
    } catch (err: any) {
      setFeedback(err.message || 'Duyuru kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await announcementService.deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (err: any) {
      console.error('Delete announcement error:', err.message);
    }
  };

  if (loading) {
    return <LoadingState message="Kurumsal duyurular yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-amber-200 text-xs font-bold uppercase tracking-wider mb-1.5">
            Kurumsal İletişim Masası
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            Duyuru Yönetimi
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
            Tüm platforma veya belirli akademik rollere (öğrenci, öğretmen, veli) duyuru yayınlayın.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
        >
          Yeni Duyuru Yayınla
        </Button>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <EmptyState
          title="Henüz Duyuru Bulunmuyor"
          description="Sisteme kayıtlı kurumsal duyuru veya bilgilendirme kaydı bulunmamaktadır."
          icon={<Megaphone className="w-8 h-8 text-zinc-500" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        a.priority === 'urgent'
                          ? 'danger'
                          : a.priority === 'important'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {a.priority === 'urgent'
                        ? 'Acil'
                        : a.priority === 'important'
                        ? 'Önemli'
                        : 'Normal'}
                    </Badge>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {a.target_role ? `Hedef: ${a.target_role}` : 'Tüm Roller'}
                    </span>

                    {a.is_published ? (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> Yayında
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono">Taslak</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(a)}
                      className="p-1.5 text-zinc-400 hover:text-amber-400 rounded hover:bg-zinc-800 transition-colors"
                      title="Düzenle"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-zinc-100 mt-2">{a.title}</h3>
                <p className="text-xs text-zinc-300 mt-2 leading-relaxed whitespace-pre-wrap">
                  {a.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>
                  Yazar: {a.author ? `${a.author.first_name} ${a.author.last_name}` : 'Yönetici'}
                </span>
                <span>
                  {new Date(a.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          title={editingId ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Yayınla'}
          maxWidth="md"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {feedback && (
              <div
                className={`p-3 rounded text-xs border ${
                  feedback.includes('başarıyla') || feedback.includes('oluşturuldu')
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                {feedback}
              </div>
            )}

            <Input
              label="Duyuru Başlığı"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: 2026 Bahar Dönemi Deneme Sınav Takvimi"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Hedef Kitle</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
                >
                  <option value="all">Herkes (Tüm Roller)</option>
                  <option value="student">Yalnızca Öğrenciler</option>
                  <option value="teacher">Yalnızca Öğretmenler</option>
                  <option value="counselor">Yalnızca Danışmanlar</option>
                  <option value="coach">Yalnızca Koçlar</option>
                  <option value="parent">Yalnızca Veliler</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Öncelik</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
                >
                  <option value="normal">Normal</option>
                  <option value="important">Önemli</option>
                  <option value="urgent">Acil / Kritik</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Duyuru Metni</label>
              <textarea
                rows={5}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Duyuru detayları, tarihler veya yönergeler..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isPublishedAnn"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-zinc-800 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="isPublishedAnn" className="text-xs text-zinc-300">
                Hemen yayına al
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
                İptal
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={saving}>
                {editingId ? 'Güncelle' : 'Yayınla'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
