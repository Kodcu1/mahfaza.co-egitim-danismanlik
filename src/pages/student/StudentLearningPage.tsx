import React, { useState, useEffect, useCallback } from 'react';
import { contentService } from '../../services/contentService';
import { academicService } from '../../services/academicService';
import { AcademicContent, AcademicCategory, AcademicContentType, Subject } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  BookOpen,
  Search,
  FileText,
  Video,
  FileDown,
  Image as ImageIcon,
  CheckSquare,
  ExternalLink,
  Eye,
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

const CONTENT_TYPE_LABELS: Record<AcademicContentType, { label: string; icon: React.ReactNode }> = {
  lesson_note: { label: 'Ders Notu', icon: <FileText className="w-3.5 h-3.5" /> },
  pdf: { label: 'PDF Doküman', icon: <FileDown className="w-3.5 h-3.5" /> },
  video: { label: 'Video Ders', icon: <Video className="w-3.5 h-3.5" /> },
  image: { label: 'Görsel Materyal', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  text: { label: 'Metin Kaynak', icon: <BookOpen className="w-3.5 h-3.5" /> },
  test: { label: 'Deneme / Test', icon: <CheckSquare className="w-3.5 h-3.5" /> },
};

export const StudentLearningPage: React.FC = () => {
  const [contents, setContents] = useState<AcademicContent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Content Viewer Modal
  const [activeContent, setActiveContent] = useState<AcademicContent | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [items, subs] = await Promise.all([
        contentService.getContent({
          category: selectedCategory,
          subjectId: selectedSubjectId,
          contentType: selectedType,
          search: searchTerm,
          publishedOnly: true,
        }).catch(() => []),
        academicService.getSubjects().catch(() => []),
      ]);
      setContents(items || []);
      setSubjects(subs || []);
    } catch {
      setContents([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedSubjectId, selectedType, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <span className="text-xs font-mono text-amber-700 font-semibold uppercase tracking-wider">
            Akademik Kütüphane & İçerikler
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight mt-0.5">
            Derslerim & İçerik Merkezi
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Müfredata uygun ders notları, video dersler, PDF kaynakları ve deneme testleri.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <Input
            placeholder="İçerik başlığında ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
          />

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-hidden focus:border-amber-500"
          >
            <option value="all">Tüm Kategoriler</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Subject Filter */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-hidden focus:border-amber-500"
          >
            <option value="all">Tüm Ders Branşları</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Content Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-hidden focus:border-amber-500"
          >
            <option value="all">Tüm Materyal Türleri</option>
            {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <LoadingState message="Ders içerikleri ve kütüphane taranıyor..." />
      ) : contents.length === 0 ? (
        <EmptyState
          title="Henüz içerik bulunmuyor."
          description="Seçilen filtre kriterlerine uygun akademik ders materyali veya test bulunamadı."
          icon={<BookOpen className="w-8 h-8 text-gray-500" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contents.map((item) => {
            const typeConfig = CONTENT_TYPE_LABELS[item.content_type] || {
              label: item.content_type,
              icon: <FileText className="w-3.5 h-3.5" />,
            };

            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-400 shadow-2xs transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
                      {item.category}
                    </span>
                    <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                      {typeConfig.icon}
                      {typeConfig.label}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-800 group-hover:text-amber-700 transition-colors line-clamp-2">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-3">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-[10px] text-gray-600">
                    {item.author ? `${item.author.first_name} ${item.author.last_name}` : 'Mahfaza.co'}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => setActiveContent(item)}
                  >
                    Görüntüle
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Content Modal Viewer */}
      {activeContent && (
        <Modal
          isOpen={true}
          onClose={() => setActiveContent(null)}
          title={activeContent.title}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-200 text-xs">
              <Badge variant="warning">{activeContent.category}</Badge>
              <Badge variant="neutral">
                {CONTENT_TYPE_LABELS[activeContent.content_type]?.label || activeContent.content_type}
              </Badge>
              {activeContent.subject && (
                <span className="text-gray-600 font-mono">
                  Ders: {activeContent.subject.name}
                </span>
              )}
            </div>

            {activeContent.description && (
              <p className="text-xs text-gray-800 italic bg-slate-50 p-3 rounded-xl border border-gray-200">
                {activeContent.description}
              </p>
            )}

            {/* Video Player */}
            {activeContent.content_type === 'video' && activeContent.file_url && (
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-slate-50 aspect-video flex items-center justify-center">
                {activeContent.file_url.includes('youtube.com') || activeContent.file_url.includes('youtu.be') ? (
                  <iframe
                    src={activeContent.file_url.replace('watch?v=', 'embed/')}
                    title={activeContent.title}
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <video src={activeContent.file_url} controls className="w-full h-full" />
                )}
              </div>
            )}

            {/* PDF Viewer / Download */}
            {activeContent.content_type === 'pdf' && activeContent.file_url && (
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-xl text-center space-y-3">
                <FileDown className="w-10 h-10 text-amber-600 mx-auto" />
                <p className="text-xs text-gray-800">
                  PDF dokümanı hazır. Tarayıcıda açabilir veya cihazınıza indirebilirsiniz.
                </p>
                <a
                  href={activeContent.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> PDF Dokümanını Aç
                </a>
              </div>
            )}

            {/* Text & Lesson Note Content Body */}
            {(activeContent.content_type === 'lesson_note' || activeContent.content_type === 'text') && (
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-xl text-xs leading-relaxed text-gray-800 whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">
                {activeContent.body || 'İçerik metni hazırlanıyor...'}
              </div>
            )}

            {/* Test Links */}
            {activeContent.content_type === 'test' && (
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-xl text-center space-y-3">
                <CheckSquare className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-gray-800">Online Deneme & Test Modülü</h4>
                {activeContent.body && (
                  <p className="text-xs text-gray-600">{activeContent.body}</p>
                )}
                {activeContent.file_url && (
                  <a
                    href={activeContent.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Testi Başlat
                  </a>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-gray-200">
              <Button variant="secondary" size="sm" onClick={() => setActiveContent(null)}>
                Kapat
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
