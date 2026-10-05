import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { contentService } from '../../services/contentService';
import { academicService } from '../../services/academicService';
import { AcademicContent, AcademicCategory, AcademicContentType, Subject } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  FileText,
  Video,
  FileDown,
  Image as ImageIcon,
  CheckSquare,
  Search,
  X,
} from 'lucide-react';

const CATEGORIES: AcademicCategory[] = [
  'TYT Tarih',
  'AYT Tarih',
  'KPSS Tarih',
  'LGS İnkılap Tarihi',
  '5. Sınıf',
  '6. Sınıf',
  '7. Sınıf',
  '8. Sınıf',
  '9. Sınıf',
  '10. Sınıf',
  '11. Sınıf',
  '12. Sınıf',
];

const CONTENT_TYPES: { type: AcademicContentType; label: string }[] = [
  { type: 'lesson_note', label: 'Ders Notu' },
  { type: 'pdf', label: 'PDF Dokümanı' },
  { type: 'video', label: 'Video Ders' },
  { type: 'image', label: 'Görsel Materyal' },
  { type: 'text', label: 'Metin Kaynak' },
  { type: 'test', label: 'Online Test / Deneme' },
];

export const AdminContentPage: React.FC = () => {
  const { user } = useAuth();
  const [contents, setContents] = useState<AcademicContent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Create/Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('TYT Tarih');
  const [subjectId, setSubjectId] = useState<string>('');
  const [contentType, setContentType] = useState<AcademicContentType>('lesson_note');
  const [fileUrl, setFileUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [body, setBody] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [items, subs] = await Promise.all([
        contentService.getContent({
          category: categoryFilter,
          search: searchTerm,
          publishedOnly: false, // Admin/Teacher sees all
        }),
        academicService.getSubjects(),
      ]);
      setContents(items);
      setSubjects(subs);
      if (subs.length > 0 && !subjectId) setSubjectId(subs[0].id);
    } catch (err) {
      console.error('Error loading content:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchTerm, subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategory('TYT Tarih');
    setContentType('lesson_note');
    setFileUrl('');
    setThumbnailUrl('');
    setBody('');
    setIsPublished(true);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: AcademicContent) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description || '');
    setCategory(item.category);
    setSubjectId(item.subject_id || (subjects[0]?.id || ''));
    setContentType(item.content_type);
    setFileUrl(item.file_url || '');
    setThumbnailUrl(item.thumbnail_url || '');
    setBody(item.body || '');
    setIsPublished(item.is_published);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !title.trim()) return;
    setSaving(true);
    setFeedback(null);

    try {
      if (editingId) {
        await contentService.updateContent(editingId, {
          title: title.trim(),
          description: description.trim() || null,
          category,
          subject_id: subjectId || null,
          content_type: contentType,
          file_url: fileUrl.trim() || null,
          thumbnail_url: thumbnailUrl.trim() || null,
          body: body.trim() || null,
          is_published: isPublished,
        });
        setFeedback('İçerik başarıyla güncellendi.');
      } else {
        await contentService.createContent({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          subject_id: subjectId || undefined,
          content_type: contentType,
          file_url: fileUrl.trim() || undefined,
          thumbnail_url: thumbnailUrl.trim() || undefined,
          body: body.trim() || undefined,
          author_id: user.id,
          is_published: isPublished,
        });
        setFeedback('Yeni içerik başarıyla oluşturuldu.');
      }

      await loadData();
      setTimeout(() => {
        setModalOpen(false);
        setFeedback(null);
      }, 1000);
    } catch (err: any) {
      setFeedback(err.message || 'İçerik kaydedilirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await contentService.deleteContent(id);
      await loadData();
    } catch (err: any) {
      console.error('Delete error:', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
            Müfredat & İçerik Yönetimi
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Akademik İçerik Merkezi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            TYT, AYT, KPSS, LGS ve ortaokul/lise müfredatına uygun ders notları, video ve PDF yönetimi.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
        >
          Yeni İçerik Ekle
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="İçerik başlığında ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-zinc-400" />}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
        >
          <option value="all">Tüm Kategoriler</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Content Table / Cards */}
      {loading ? (
        <LoadingState message="İçerik havuzu yükleniyor..." />
      ) : contents.length === 0 ? (
        <EmptyState
          title="Henüz İçerik Bulunmuyor"
          description="Sisteme kayıtlı akademik ders materyali veya test bulunmamaktadır."
          icon={<BookOpen className="w-8 h-8 text-zinc-500" />}
        />
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 font-mono text-[11px] border-b border-zinc-800 uppercase">
                <tr>
                  <th className="py-3 px-4">Başlık</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Tür</th>
                  <th className="py-3 px-4">Ders</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {contents.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-zinc-100">
                      <div className="font-semibold text-sm text-zinc-200">{item.title}</div>
                      {item.description && (
                        <div className="text-[11px] text-zinc-500 truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-amber-400">{item.category}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize">{item.content_type.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      {item.subject?.name || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.is_published ? (
                        <Badge variant="success">Yayında</Badge>
                      ) : (
                        <Badge variant="neutral">Taslak</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-zinc-400 hover:text-amber-400 rounded hover:bg-zinc-800"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          title={editingId ? 'İçeriği Düzenle' : 'Yeni Akademik İçerik Oluştur'}
          maxWidth="lg"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {feedback && (
              <div
                className={`p-3 rounded text-xs border ${
                  feedback.includes('başarıyla')
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                {feedback}
              </div>
            )}

            <Input
              label="İçerik Başlığı"
              required
              placeholder="Örn: Kurtuluş Savaşı ve Mudanya Mütarekesi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Açıklama / Özet</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Öğrenciler için kısa özet..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Materyal Türü</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as AcademicContentType)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
                >
                  {CONTENT_TYPES.map((ct) => (
                    <option key={ct.type} value={ct.type}>
                      {ct.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Ders Branşı</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Dosya / Video / Test URL"
              placeholder="https://... (YouTube, Google Drive veya depolama bağlantısı)"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
            />

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Ders Notu / Metin İçeriği
              </label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ders notu metnini buraya yazın..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-zinc-800 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="isPublished" className="text-xs text-zinc-300">
                Öğrenciler için yayında olsun
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
                İptal
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={saving}>
                {editingId ? 'Güncelle' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
