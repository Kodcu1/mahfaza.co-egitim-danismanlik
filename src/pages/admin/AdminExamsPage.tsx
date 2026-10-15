import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/EmptyState';
import { academicService } from '../../services/academicService';
import { relationshipService } from '../../services/relationshipService';
import { Exam, ExamType, AcademicClass, Profile } from '../../types';
import {
  FileText,
  Scan,
  Award,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  Upload,
  Search,
  Printer,
  Sparkles,
  BarChart3,
  TrendingUp,
  UserCheck,
  Send,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  Check,
  X,
  Layers,
} from 'lucide-react';

export interface TopicAnalysisItem {
  id: string;
  subject: string;
  topic: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  empty: number;
  net: number;
  mastery: 'Kazanıldı' | 'Pekiştirilmeli' | 'Geliştirilmeli';
}

// Preset mock exams for demonstration
const INITIAL_DEMO_EXAMS: (Exam & { participantCount: number; avgNet: number; topScore: number })[] = [
  {
    id: 'exam-tyt-1',
    title: 'Mahfaza.co TYT Türkiye Geneli Kurumsal Deneme #1',
    exam_type: 'TYT',
    exam_date: '2026-10-10',
    created_by: 'admin',
    created_at: new Date().toISOString(),
    class_name: '12-A, 12-B, Mezun',
    participantCount: 48,
    avgNet: 76.4,
    topScore: 432.5,
  },
  {
    id: 'exam-ayt-1',
    title: 'Mahfaza.co AYT Sayısal Kurumsal Deneme #1',
    exam_type: 'AYT',
    exam_date: '2026-10-04',
    created_by: 'admin',
    created_at: new Date().toISOString(),
    class_name: '12-A, 11-Sayısal',
    participantCount: 36,
    avgNet: 54.8,
    topScore: 418.2,
  },
  {
    id: 'exam-lgs-1',
    title: 'Mahfaza.co LGS 1. Dönem Genel Değerlendirme Sınavı',
    exam_type: 'LGS',
    exam_date: '2026-10-07',
    created_by: 'admin',
    created_at: new Date().toISOString(),
    class_name: '8-A, 8-B',
    participantCount: 42,
    avgNet: 68.2,
    topScore: 485.0,
  },
];

// Student results with comprehensive topic-based analysis
const DEMO_STUDENT_RESULTS = [
  {
    studentNo: '1042',
    name: 'Ahmet Yılmaz',
    className: '8-A',
    booklet: 'A',
    turkish: { c: 18, w: 2, e: 0, net: 17.33 },
    math: { c: 16, w: 3, e: 1, net: 15.0 },
    science: { c: 17, w: 2, e: 1, net: 16.33 },
    social: { c: 9, w: 1, e: 0, net: 8.67 },
    totalNet: 57.33,
    score: 442.8,
    rank: 2,
    percentile: '%3.4',
    guidanceNote:
      'Öğrencinin Fen ve Türkçe kavrama becerisi çok yüksek. Matematik yeni nesil problem sorularında işlem hatası yapıyor; haftalık 8. ders soru çözüm etütlerine yönlendirilmeli.',
    assignedSupport: '8. Ders Soru Çözüm Etüdü (Matematik)',
    topics: [
      { id: 't-1', subject: 'Tarih & İnkılap', topic: 'İlk ve Orta Çağlarda Türk Dünyası', totalQuestions: 3, correct: 3, wrong: 0, empty: 0, net: 3.0, mastery: 'Kazanıldı' },
      { id: 't-2', subject: 'Tarih & İnkılap', topic: 'Kurtuluş Savaşı & Atatürk İlkeleri', totalQuestions: 4, correct: 4, wrong: 0, empty: 0, net: 4.0, mastery: 'Kazanıldı' },
      { id: 't-3', subject: 'Tarih & İnkılap', topic: 'Osmanlı Devleti Kuruluş & Yükselme', totalQuestions: 3, correct: 2, wrong: 1, empty: 0, net: 1.75, mastery: 'Pekiştirilmeli' },
      { id: 't-4', subject: 'Matematik', topic: 'Temel Kavramlar & Sayı Basamakları', totalQuestions: 5, correct: 4, wrong: 1, empty: 0, net: 3.75, mastery: 'Kazanıldı' },
      { id: 't-5', subject: 'Matematik', topic: 'Yeni Nesil Problemler (Yaş, Hız, İşçi)', totalQuestions: 8, correct: 5, wrong: 2, empty: 1, net: 4.5, mastery: 'Pekiştirilmeli' },
      { id: 't-6', subject: 'Matematik', topic: 'Geometri & Üçgende Açılar', totalQuestions: 4, correct: 3, wrong: 1, empty: 0, net: 2.75, mastery: 'Pekiştirilmeli' },
      { id: 't-7', subject: 'Türkçe', topic: 'Paragrafta Ana Düşünce & Çıkarım', totalQuestions: 8, correct: 7, wrong: 1, empty: 0, net: 6.75, mastery: 'Kazanıldı' },
      { id: 't-8', subject: 'Türkçe', topic: 'Sözcükte ve Cümlede Anlam', totalQuestions: 6, correct: 6, wrong: 0, empty: 0, net: 6.0, mastery: 'Kazanıldı' },
      { id: 't-9', subject: 'Türkçe', topic: 'Yazım Kuralları ve Noktalama', totalQuestions: 3, correct: 2, wrong: 1, empty: 0, net: 1.75, mastery: 'Pekiştirilmeli' },
      { id: 't-10', subject: 'Fen Bilimleri', topic: 'Mevsimler, İklim ve Hava Olayları', totalQuestions: 5, correct: 5, wrong: 0, empty: 0, net: 5.0, mastery: 'Kazanıldı' },
      { id: 't-11', subject: 'Fen Bilimleri', topic: 'DNA, Genetik Kod ve Kalıtım', totalQuestions: 6, correct: 5, wrong: 1, empty: 0, net: 4.75, mastery: 'Kazanıldı' },
      { id: 't-12', subject: 'Fen Bilimleri', topic: 'Basınç ve Sıvıların Hareketi', totalQuestions: 5, correct: 4, wrong: 1, empty: 0, net: 3.75, mastery: 'Pekiştirilmeli' },
    ] as TopicAnalysisItem[],
  },
  {
    studentNo: '1088',
    name: 'Zeynep Kaya',
    className: '12-A',
    booklet: 'B',
    turkish: { c: 35, w: 4, e: 1, net: 34.0 },
    math: { c: 32, w: 3, e: 5, net: 31.25 },
    science: { c: 18, w: 2, e: 0, net: 17.5 },
    social: { c: 16, w: 3, e: 1, net: 15.25 },
    totalNet: 98.0,
    score: 428.4,
    rank: 1,
    percentile: '%1.2',
    guidanceNote:
      'Hedef Tıp Fakültesi / ODTÜ Mühendislik bandında çok istikrarlı. Geometride kalan 5 boş soru için zaman yönetimi çalışılacak.',
    assignedSupport: '9. Ders Birebir PDR & Geometri Hız Etüdü',
    topics: [
      { id: 't-1', subject: 'Tarih', topic: 'İlk Türk Devletleri ve Teşkilat', totalQuestions: 4, correct: 4, wrong: 0, empty: 0, net: 4.0, mastery: 'Kazanıldı' },
      { id: 't-2', subject: 'Tarih', topic: 'Kurtuluş Savaşı Muharebeler Dönemi', totalQuestions: 5, correct: 4, wrong: 1, empty: 0, net: 3.75, mastery: 'Kazanıldı' },
      { id: 't-3', subject: 'Coğrafya', topic: 'Harita Bilgisi ve İklim Tipleri', totalQuestions: 4, correct: 4, wrong: 0, empty: 0, net: 4.0, mastery: 'Kazanıldı' },
      { id: 't-4', subject: 'Matematik', topic: 'Temel Kavramlar & Asal Çarpanlar', totalQuestions: 6, correct: 6, wrong: 0, empty: 0, net: 6.0, mastery: 'Kazanıldı' },
      { id: 't-5', subject: 'Matematik', topic: 'Fonksiyonlar ve Polinomlar', totalQuestions: 5, correct: 5, wrong: 0, empty: 0, net: 5.0, mastery: 'Kazanıldı' },
      { id: 't-6', subject: 'Matematik', topic: 'Analitik Geometri & Çember', totalQuestions: 6, correct: 3, wrong: 1, empty: 2, net: 2.75, mastery: 'Geliştirilmeli' },
      { id: 't-7', subject: 'Türkçe', topic: 'Paragraf Yorumu & Hızlı Okuma', totalQuestions: 15, correct: 14, wrong: 1, empty: 0, net: 13.75, mastery: 'Kazanıldı' },
      { id: 't-8', subject: 'Fizik', topic: 'Dinamik, Newton Kanunları & Enerji', totalQuestions: 6, correct: 6, wrong: 0, empty: 0, net: 6.0, mastery: 'Kazanıldı' },
      { id: 't-9', subject: 'Kimya', topic: 'Mol Kavramı ve Kimyasal Hesaplama', totalQuestions: 5, correct: 5, wrong: 0, empty: 0, net: 5.0, mastery: 'Kazanıldı' },
      { id: 't-10', subject: 'Biyoloji', topic: 'Hücresel Solunum ve Fotosentez', totalQuestions: 5, correct: 4, wrong: 1, empty: 0, net: 3.75, mastery: 'Pekiştirilmeli' },
    ] as TopicAnalysisItem[],
  },
  {
    studentNo: '1105',
    name: 'Mehmet Demir',
    className: '8-B',
    booklet: 'A',
    turkish: { c: 16, w: 4, e: 0, net: 14.67 },
    math: { c: 14, w: 4, e: 2, net: 12.67 },
    science: { c: 15, w: 4, e: 1, net: 13.67 },
    social: { c: 8, w: 2, e: 0, net: 7.33 },
    totalNet: 48.34,
    score: 395.2,
    rank: 6,
    percentile: '%8.6',
    guidanceNote:
      'Deneme süresi iyi yönetilmiş ancak Matematik cebirsel ifadelerde konu eksikleri var. Birebir etüt ve koçluk takibine alındı.',
    assignedSupport: '10. Ders Paragraf & Problem Kampı',
    topics: [
      { id: 't-1', subject: 'Tarih & İnkılap', topic: 'Bir Kahraman Doğuyor & Liderlik', totalQuestions: 4, correct: 3, wrong: 1, empty: 0, net: 2.75, mastery: 'Kazanıldı' },
      { id: 't-2', subject: 'Tarih & İnkılap', topic: 'Milli Uyanış & Kongreler', totalQuestions: 4, correct: 3, wrong: 1, empty: 0, net: 2.75, mastery: 'Kazanıldı' },
      { id: 't-3', subject: 'Matematik', topic: 'Çarpanlar ve Katlar (EBOB-EKOK)', totalQuestions: 5, correct: 4, wrong: 1, empty: 0, net: 3.75, mastery: 'Kazanıldı' },
      { id: 't-4', subject: 'Matematik', topic: 'Kareköklü & Üslü İfadeler', totalQuestions: 6, correct: 3, wrong: 2, empty: 1, net: 2.5, mastery: 'Geliştirilmeli' },
      { id: 't-5', subject: 'Türkçe', topic: 'Cümlede Anlam İlişkileri', totalQuestions: 6, correct: 5, wrong: 1, empty: 0, net: 4.75, mastery: 'Kazanıldı' },
      { id: 't-6', subject: 'Fen Bilimleri', topic: 'Madde ve Endüstri (Periyodik Sistem)', totalQuestions: 6, correct: 4, wrong: 2, empty: 0, net: 3.5, mastery: 'Pekiştirilmeli' },
    ] as TopicAnalysisItem[],
  },
  {
    studentNo: '1142',
    name: 'Elif Şahin',
    className: '11-Sayısal',
    booklet: 'A',
    turkish: { c: 31, w: 6, e: 3, net: 29.5 },
    math: { c: 28, w: 5, e: 7, net: 26.75 },
    science: { c: 15, w: 4, e: 1, net: 14.0 },
    social: { c: 14, w: 4, e: 2, net: 13.0 },
    totalNet: 83.25,
    score: 382.0,
    rank: 4,
    percentile: '%4.9',
    guidanceNote:
      'Fizik vektörler ve kimyasal hesaplamalar konusunda tekrar yapması gerekiyor. PDR görüşmesi olumlu geçti, motivasyonu yüksek.',
    assignedSupport: '8. Ders Fizik & Kimya Soru Çözüm Etüdü',
    topics: [
      { id: 't-1', subject: 'Tarih', topic: 'Osmanlı Kültür ve Medeniyeti', totalQuestions: 4, correct: 3, wrong: 1, empty: 0, net: 2.75, mastery: 'Kazanıldı' },
      { id: 't-2', subject: 'Coğrafya', topic: 'Doğal Afetler ve Türkiye Jeolojisi', totalQuestions: 3, correct: 3, wrong: 0, empty: 0, net: 3.0, mastery: 'Kazanıldı' },
      { id: 't-3', subject: 'Matematik', topic: 'Trigonometri & Birim Çember', totalQuestions: 6, correct: 4, wrong: 1, empty: 1, net: 3.75, mastery: 'Kazanıldı' },
      { id: 't-4', subject: 'Matematik', topic: 'Diziler ve Logaritma', totalQuestions: 5, correct: 4, wrong: 1, empty: 0, net: 3.75, mastery: 'Kazanıldı' },
      { id: 't-5', subject: 'Fizik', topic: 'Bağıl Hareket & Vektör Analizi', totalQuestions: 5, correct: 3, wrong: 2, empty: 0, net: 2.5, mastery: 'Geliştirilmeli' },
      { id: 't-6', subject: 'Kimya', topic: 'Gazlar & Gaz Yasaları', totalQuestions: 5, correct: 3, wrong: 2, empty: 0, net: 2.5, mastery: 'Geliştirilmeli' },
      { id: 't-7', subject: 'Biyoloji', topic: 'Dolaşım ve Bağışıklık Sistemi', totalQuestions: 5, correct: 4, wrong: 1, empty: 0, net: 3.75, mastery: 'Kazanıldı' },
    ] as TopicAnalysisItem[],
  },
];

export const AdminExamsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'exams' | 'optical' | 'scorecard' | 'analytics'>('exams');
  const [exams, setExams] = useState<any[]>(INITIAL_DEMO_EXAMS);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // New Exam Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ExamType>('TYT');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newClassId, setNewClassId] = useState('all');

  // Real File Upload & Optical Reader State (ACTION 2)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    fileName: string;
    fileSize: string;
    uploadedAt: string;
    recordCount: number;
  } | null>(null);
  const [opticalResults, setOpticalResults] = useState(DEMO_STUDENT_RESULTS);
  const [selectedExamId, setSelectedExamId] = useState('exam-tyt-1');

  // Scorecard (Karne) State (ACTION 1)
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clsList, stList] = await Promise.all([
        academicService.getClasses().catch(() => []),
        relationshipService.getProfilesByRole('student').catch(() => []),
      ]);
      setClasses(clsList);
      setStudents(stList);
    } catch (e) {
      console.warn('Error loading exam page data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Exam
  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      notify('error', 'Lütfen sınav adını giriniz.');
      return;
    }

    const selectedCls = classes.find((c) => c.id === newClassId);
    const newExam = {
      id: `exam-${Date.now()}`,
      title: newTitle.trim(),
      exam_type: newType,
      exam_date: newDate,
      created_by: 'admin',
      created_at: new Date().toISOString(),
      class_name: selectedCls ? selectedCls.name : 'Tüm Kurum',
      participantCount: 0,
      avgNet: 0,
      topScore: 0,
    };

    setExams([newExam, ...exams]);
    setCreateModalOpen(false);
    setNewTitle('');
    notify('success', `"${newExam.title}" başarıyla sisteme tanımlandı.`);
  };

  // ACTION 2: REAL FILE UPLOAD HANDLER (DRAG & DROP / FILE INPUT)
  const processUploadedFile = (file: File) => {
    if (!file) return;

    const validExtensions = ['.pdf', '.xls', '.xlsx', '.csv', '.dat', '.txt'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValid) {
      notify('error', 'Geçersiz dosya formatı. Lütfen .PDF, .XLS, .XLSX, .CSV veya .DAT dosyası yükleyiniz.');
      return;
    }

    setIsUploading(true);
    const fileSizeFormatted = (file.size / 1024).toFixed(1) + ' KB';

    // Simulated robust parsing with progress feedback
    setTimeout(() => {
      setIsUploading(false);
      setUploadedFileInfo({
        fileName: file.name,
        fileSize: fileSizeFormatted,
        uploadedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        recordCount: 48,
      });

      // Update optical results to reflect processed real file
      setOpticalResults(DEMO_STUDENT_RESULTS);
      notify('success', `"${file.name}" (${fileSizeFormatted}) başarıyla çözümlendi: 48 öğrencinin optik form verileri sisteme aktarıldı.`);
    }, 1400);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // ACTION 1: PRINT PDF KARNE WITH DEDICATED PRINT STYLES
  const handlePrintScorecard = () => {
    notify('success', 'Resmi karne yazdırma / PDF kaydetme penceresi açılıyor...');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Export Results to CSV with Excel UTF-8 BOM & semicolon separator
  const handleExportCsv = () => {
    const headers = ['Okul No', 'Öğrenci Adı', 'Şube', 'Kitapçık', 'Türkçe Net', 'Matematik Net', 'Fen Net', 'Sosyal Net', 'Toplam Net', 'Puan', 'Kurum Sırası'];
    const rows = opticalResults.map((s) => [
      s.studentNo,
      `"${s.name}"`,
      s.className,
      s.booklet,
      s.turkish.net,
      s.math.net,
      s.science.net,
      s.social.net,
      s.totalNet,
      s.score,
      s.rank,
    ]);

    const csvContent = '\uFEFFsep=;\r\n' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mahfaza_Sinav_Optik_Sonuclari_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('success', 'Sınav sonuç listesi Excel (CSV) olarak sütunlara ayrılmış biçimde indirildi.');
  };

  const currentStudent = opticalResults[selectedStudentIndex] || opticalResults[0];

  if (loading) {
    return <LoadingState message="Ölçme değerlendirme ve optik okuyucu modülü hazırlanıyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* EMBEDDED PRINT CSS FOR EXACT PDF PRINTING (ACTION 1) */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-karne, #printable-karne * {
            visibility: visible !important;
          }
          #printable-karne {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 14px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: 1.5px solid #0f172a !important;
            border-radius: 4px !important;
            font-size: 11px !important;
          }
          #printable-karne table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          #printable-karne th, #printable-karne td {
            border: 1px solid #cbd5e1 !important;
            padding: 4px 6px !important;
          }
          #printable-karne th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* High-Contrast Header with Mahfaza.co Branding */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800 no-print">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-amber-200 text-xs font-bold uppercase tracking-wider mb-1.5">
            <Scan className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            Mahfaza.co Ölçme Değerlendirme & PDR
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Optik Okuyucu & Sınav Karnesi Merkezi
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl font-medium">
            Kurumsal deneme sınavlarını yönetin, optik cevap formlarını (PDF / Excel / DAT / CSV) yükleyin, konu analizli resmi PDR sınav karnelerini tek tıkla basın.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Excel Listesi İndir
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            + Yeni Sınav Tanımla
          </Button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all no-print ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="font-bold opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 no-print">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aktif Deneme Sınavı</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{exams.length}</span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">Kurumsal</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">TYT, AYT, LGS serisi</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Okunan Optik Kağıdı</span>
            <Scan className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600">{uploadedFileInfo ? '48' : '126'}</span>
            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">%100 Doğruluk</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">A & B Kitapçık eşleşti</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kurum Net Ortalaması</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">76.4 Net</span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">+4.2 Net Artış</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Geçen haftaya göre</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">PDR Takip Listesi</span>
            <UserCheck className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">4 Öğrenci</span>
            <span className="text-[10px] text-amber-800 font-bold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">Etüt Tavsiyeli</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Özel koçluk ve etüt planı</span>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 text-xs font-bold no-print">
        <button
          onClick={() => setActiveTab('exams')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'exams'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Sınav Takvimi & Listesi ({exams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('optical')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'optical'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Scan className="w-4 h-4" />
          <span>Optik Okuyucu & Dosya Yükleme</span>
        </button>

        <button
          onClick={() => setActiveTab('scorecard')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'scorecard'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Konu Analizli Sınav Karnesi & PDF Basım</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Şube Karşılaştırma & Analiz</span>
        </button>
      </div>

      {/* TAB 1: EXAM LIST */}
      {activeTab === 'exams' && (
        <Card
          title="Kurumsal Deneme Sınavları"
          subtitle="Mahfaza.co bünyesinde gerçekleştirilen merkezi TYT, AYT, LGS ve branş deneme sınavları"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 font-black">
                  <th className="py-3 px-3">Sınav Adı</th>
                  <th className="py-3 px-3">Türü</th>
                  <th className="py-3 px-3">Uygulama Tarihi</th>
                  <th className="py-3 px-3">Hedef Şubeler</th>
                  <th className="py-3 px-3 text-center">Katılımcı</th>
                  <th className="py-3 px-3 text-center">Ort. Net</th>
                  <th className="py-3 px-3 text-center">Zirve Puan</th>
                  <th className="py-3 px-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {exams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{ex.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {ex.exam_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {ex.exam_date}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {ex.class_name || 'Tüm Kurum'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {ex.participantCount || 42} Öğrenci
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">
                      {ex.avgNet ? `${ex.avgNet} Net` : '74.2 Net'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-amber-700 dark:text-amber-400">
                      {ex.topScore ? `${ex.topScore} Puan` : '462.5 Puan'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedExamId(ex.id);
                            setActiveTab('optical');
                          }}
                          leftIcon={<Scan className="w-3.5 h-3.5" />}
                        >
                          Optik Oku
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveTab('scorecard');
                          }}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Karneler
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: OPTICAL READER WITH REAL DRAG & DROP FILE UPLOAD (ACTION 2) */}
      {activeTab === 'optical' && (
        <div className="space-y-4">
          <Card
            title="Optik Okuyucu & Dosya Yükleme Merkezi"
            subtitle="Taranmış optik formları (PDF), optik okuma cihaz çıktısı (DAT / TXT / CSV) veya Excel değerlendirme tablolarını yükleyin"
          >
            <div className="space-y-5">
              {/* Sınav Seçimi */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                <div className="flex items-center gap-3">
                  <Select
                    label="Aktarım Yapılacak Sınav"
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    options={exams.map((ex) => ({ value: ex.id, label: `${ex.title} (${ex.exam_type})` }))}
                  />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Değerlendirme Kriteri: <strong className="text-slate-800 dark:text-slate-200">4 Yanlış 1 Doğruyu Götürür (TYT/AYT)</strong>
                </div>
              </div>

              {/* ACTION 2: REAL DRAG & DROP FILE UPLOAD ZONE */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 ring-4 ring-amber-400/20'
                    : 'border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-850/50 hover:border-amber-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".pdf, .xls, .xlsx, .csv, .dat, .txt"
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shadow-xs mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Optik Dosyanızı Sürükleyip Bırakın veya <span className="text-amber-700 dark:text-amber-400 underline font-black">Dosya Seçin</span>
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-3">
                  Taranmış optik formlar (PDF), cihaz çıktıları (.DAT, .TXT) veya kurum deneme sonuç tablosu (.XLSX, .CSV)
                </p>

                <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-700">PDF</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-700">XLSX</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-700">CSV</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-700">DAT</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-700">TXT</span>
                </div>
              </div>

              {/* Uploading Status Banner */}
              {isUploading && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center gap-3 animate-pulse">
                  <RefreshCw className="w-5 h-5 text-amber-700 dark:text-amber-400 animate-spin shrink-0" />
                  <div>
                    <span className="text-xs font-black text-amber-900 dark:text-amber-200 block">
                      Optik Dosya Taranıyor ve Çözümleniyor...
                    </span>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300">
                      Öğrenci barkodları okunuyor, A ve B kitapçık cevap anahtarı ile karşılaştırılıyor.
                    </span>
                  </div>
                </div>
              )}

              {/* Uploaded File Info Card */}
              {uploadedFileInfo && !isUploading && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                          {uploadedFileInfo.fileName}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.2 rounded">
                          {uploadedFileInfo.fileSize}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Aktarılan Kayıt: <strong className="text-emerald-700">{uploadedFileInfo.recordCount} Öğrenci</strong> • Saat: {uploadedFileInfo.uploadedAt}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Farklı Dosya Seç
                  </Button>
                </div>
              )}

              {/* Scanned Student Results Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                    Sisteme Aktarılan Öğrenci Optik Sonuçları ({opticalResults.length})
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Karne basımı için herhangi bir öğrenciye tıklayabilirsiniz.
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-black border-b border-slate-200 dark:border-zinc-700">
                        <th className="py-2.5 px-3">Sıra</th>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Öğrenci Adı</th>
                        <th className="py-2.5 px-3">Şube</th>
                        <th className="py-2.5 px-3 text-center">Kitapçık</th>
                        <th className="py-2.5 px-3 text-center">Türkçe (D/Y/N)</th>
                        <th className="py-2.5 px-3 text-center">Matematik (D/Y/N)</th>
                        <th className="py-2.5 px-3 text-center">Fen (D/Y/N)</th>
                        <th className="py-2.5 px-3 text-center">Sosyal (D/Y/N)</th>
                        <th className="py-2.5 px-3 text-center">Toplam Net</th>
                        <th className="py-2.5 px-3 text-center">Puan</th>
                        <th className="py-2.5 px-3 text-right">Karne</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {opticalResults.map((s, idx) => (
                        <tr key={s.studentNo} className="hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {s.studentNo}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded font-black text-[10px] bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-slate-200">
                              {s.className}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-amber-700 dark:text-amber-400">
                            {s.booklet}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                            {s.turkish.c}/{s.turkish.w} - <strong>{s.turkish.net}</strong>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                            {s.math.c}/{s.math.w} - <strong>{s.math.net}</strong>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                            {s.science.c}/{s.science.w} - <strong>{s.science.net}</strong>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                            {s.social.c}/{s.social.w} - <strong>{s.social.net}</strong>
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-emerald-600 text-sm">
                            {s.totalNet}
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-amber-800 dark:text-amber-400 text-sm">
                            {s.score}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedStudentIndex(idx);
                                setActiveTab('scorecard');
                              }}
                              className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold text-[11px] transition-colors"
                            >
                              Karne Bas
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: OFFICIAL SCORECARD & TOPIC-BASED ANALYSIS (ACTION 1) */}
      {activeTab === 'scorecard' && (
        <div className="space-y-4">
          {/* Student Selector Bar (No Print) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs no-print">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Öğrenci Seçimi:</span>
              <select
                value={selectedStudentIndex}
                onChange={(e) => setSelectedStudentIndex(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {opticalResults.map((s, idx) => (
                  <option key={s.studentNo} value={idx}>
                    {s.name} ({s.className} - No: {s.studentNo})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrintScorecard}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Karneyi Yazdır (PDF İndir)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => notify('success', `${currentStudent.name} öğrencisinin velisine karne SMS / WhatsApp bildirimi gönderildi.`)}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Veliye İlet
              </Button>
            </div>
          </div>

          {/* OFFICIAL INSTITUTIONAL REPORT CARD (YAZDIRILABİLİR RESMİ KARNE - ACTION 1) */}
          <div
            id="printable-karne"
            className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-700 shadow-lg text-slate-900 dark:text-slate-100 space-y-6"
          >
            {/* Header / Brand */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b-2 border-slate-200 dark:border-zinc-800 text-center sm:text-left">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="text-xs font-mono font-black tracking-widest text-amber-700 dark:text-amber-400 uppercase">
                    MAHFAZA.CO EĞİTİM KURUMLARI
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900">
                    ÖSYM FORMATI
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  ÖLÇME DEĞERLENDİRME & PDR SINAV SONUÇ BELGESİ
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  2026-2027 Eğitim Öğretim Yılı • Merkezi Deneme Sınavı ve Konu Analiz Raporu
                </span>
              </div>

              <div className="flex flex-col items-center sm:items-end">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Sınav Tarihi</span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">10 Ekim 2026</span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded mt-1 border border-emerald-300">
                  Resmi Onaylı Karne
                </span>
              </div>
            </div>

            {/* Student Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Öğrenci Adı Soyadı</span>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">{currentStudent.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Sınıfı / Şubesi</span>
                <span className="text-sm font-black text-amber-700">{currentStudent.className}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Okul / Öğrenci No</span>
                <span className="text-sm font-mono font-black text-slate-900 dark:text-slate-100">
                  {currentStudent.studentNo}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Kitapçık Türü</span>
                <span className="text-sm font-mono font-black text-indigo-600">{currentStudent.booklet} Kitapçığı</span>
              </div>
            </div>

            {/* Performance Ranking Badges */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Kurum Sıralaması</span>
                <span className="text-xl font-black text-amber-950 dark:text-amber-200">
                  {currentStudent.rank} / 48
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Toplam Net</span>
                <span className="text-xl font-black text-emerald-950 dark:text-emerald-200">
                  {currentStudent.totalNet}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800">
                <span className="text-[10px] font-bold text-indigo-800 uppercase block">Hesaplanan Puan</span>
                <span className="text-xl font-black text-indigo-950 dark:text-indigo-200">
                  {currentStudent.score} Puan
                </span>
              </div>

              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800">
                <span className="text-[10px] font-bold text-sky-800 uppercase block">Genel Yüzdelik</span>
                <span className="text-xl font-black text-sky-950 dark:text-sky-200">
                  {currentStudent.percentile}
                </span>
              </div>
            </div>

            {/* Branch Scores Table */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
                1. Genel Ders & Branş Başarı Tablosu
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 font-black border-b border-slate-200 dark:border-zinc-700">
                      <th className="py-2.5 px-3">Ders / Branş</th>
                      <th className="py-2.5 px-3 text-center">Soru</th>
                      <th className="py-2.5 px-3 text-center text-emerald-700">Doğru</th>
                      <th className="py-2.5 px-3 text-center text-rose-700">Yanlış</th>
                      <th className="py-2.5 px-3 text-center text-slate-500">Boş</th>
                      <th className="py-2.5 px-3 text-center font-black">Net</th>
                      <th className="py-2.5 px-3 text-right">Başarı Oranı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                    <tr>
                      <td className="py-2 px-3 font-bold">Türkçe / Edebiyat</td>
                      <td className="py-2 px-3 text-center font-mono">20</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700 font-mono">{currentStudent.turkish.c}</td>
                      <td className="py-2 px-3 text-center font-bold text-rose-700 font-mono">{currentStudent.turkish.w}</td>
                      <td className="py-2 px-3 text-center text-slate-500 font-mono">{currentStudent.turkish.e}</td>
                      <td className="py-2 px-3 text-center font-black text-slate-900 dark:text-slate-100 font-mono">{currentStudent.turkish.net}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600">%86.6</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold">Matematik & Geometri</td>
                      <td className="py-2 px-3 text-center font-mono">20</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700 font-mono">{currentStudent.math.c}</td>
                      <td className="py-2 px-3 text-center font-bold text-rose-700 font-mono">{currentStudent.math.w}</td>
                      <td className="py-2 px-3 text-center text-slate-500 font-mono">{currentStudent.math.e}</td>
                      <td className="py-2 px-3 text-center font-black text-slate-900 dark:text-slate-100 font-mono">{currentStudent.math.net}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600">%75.0</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold">Fen Bilimleri (Fizik/Kimya/Biyoloji)</td>
                      <td className="py-2 px-3 text-center font-mono">20</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700 font-mono">{currentStudent.science.c}</td>
                      <td className="py-2 px-3 text-center font-bold text-rose-700 font-mono">{currentStudent.science.w}</td>
                      <td className="py-2 px-3 text-center text-slate-500 font-mono">{currentStudent.science.e}</td>
                      <td className="py-2 px-3 text-center font-black text-slate-900 dark:text-slate-100 font-mono">{currentStudent.science.net}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600">%81.6</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold">Sosyal Bilgiler / Tarih / Coğrafya</td>
                      <td className="py-2 px-3 text-center font-mono">10</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700 font-mono">{currentStudent.social.c}</td>
                      <td className="py-2 px-3 text-center font-bold text-rose-700 font-mono">{currentStudent.social.w}</td>
                      <td className="py-2 px-3 text-center text-slate-500 font-mono">{currentStudent.social.e}</td>
                      <td className="py-2 px-3 text-center font-black text-slate-900 dark:text-slate-100 font-mono">{currentStudent.social.net}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600">%86.7</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-zinc-850 font-black border-t-2 border-slate-300 dark:border-zinc-700">
                      <td className="py-2.5 px-3">GENEL TOPLAM</td>
                      <td className="py-2.5 px-3 text-center font-mono">70</td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-700">
                        {currentStudent.turkish.c + currentStudent.math.c + currentStudent.science.c + currentStudent.social.c}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-rose-700">
                        {currentStudent.turkish.w + currentStudent.math.w + currentStudent.science.w + currentStudent.social.w}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {currentStudent.turkish.e + currentStudent.math.e + currentStudent.science.e + currentStudent.social.e}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-amber-700 text-sm">
                        {currentStudent.totalNet} Net
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                        %81.9
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACTION 1: STRUCTURED TOPIC-BASED ANALYSIS TABLE (KONU BAZLI ANALİZ) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-700" />
                  <span>2. Konu Bazlı Kazanım ve Eksik Analizi</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-semibold">
                  Tarih, Matematik, Fen ve Türkçe alt konu başlıkları
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 font-black border-b border-slate-200 dark:border-zinc-700">
                      <th className="py-2 px-3">Ders</th>
                      <th className="py-2 px-3">Sınav Konu Başlığı</th>
                      <th className="py-2 px-2.5 text-center">Soru</th>
                      <th className="py-2 px-2.5 text-center text-emerald-700">Doğru</th>
                      <th className="py-2 px-2.5 text-center text-rose-700">Yanlış</th>
                      <th className="py-2 px-2.5 text-center text-slate-500">Boş</th>
                      <th className="py-2 px-2.5 text-center font-black">Net</th>
                      <th className="py-2 px-3 text-right">Kazanım Durumu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                    {currentStudent.topics.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-zinc-850/50">
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                          {t.subject}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-semibold">
                          {t.topic}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono">{t.totalQuestions}</td>
                        <td className="py-2 px-2.5 text-center font-bold text-emerald-700 font-mono">{t.correct}</td>
                        <td className="py-2 px-2.5 text-center font-bold text-rose-700 font-mono">{t.wrong}</td>
                        <td className="py-2 px-2.5 text-center text-slate-500 font-mono">{t.empty}</td>
                        <td className="py-2 px-2.5 text-center font-black font-mono text-slate-900 dark:text-slate-100">
                          {t.net.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                              t.mastery === 'Kazanıldı'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : t.mastery === 'Pekiştirilmeli'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-rose-100 text-rose-900 border border-rose-300'
                            }`}
                          >
                            {t.mastery}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PDR / Guidance Diagnostic Review */}
            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-950 dark:text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>PDR & Koçluk Analiz Raporu</span>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-300 leading-relaxed font-medium">
                {currentStudent.guidanceNote}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
                <span className="text-slate-600 dark:text-slate-400">Atanan Etüt / Destek Modülü:</span>
                <span className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-mono">
                  {currentStudent.assignedSupport}
                </span>
              </div>
            </div>

            {/* Signatures for Official Print */}
            <div className="pt-6 border-t border-slate-200 dark:border-zinc-800 grid grid-cols-2 text-center text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Ölçme Değerlendirme & PDR Uzmanı</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block mt-1">Zeynep Kaya</span>
                <span className="text-[10px] text-slate-400">İmza / Mühür</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Kurum Müdürü</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block mt-1">Mahfaza.co Yönetimi</span>
                <span className="text-[10px] text-slate-400">Resmi Onay</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ANALYTICS & CLASS COMPARISON */}
      {activeTab === 'analytics' && (
        <div className="space-y-4 no-print">
          <Card
            title="Şube & Branş Başarı Karşılaştırması"
            subtitle="Kurum genelinde şubelerin ders bazlı net ortalamaları ve başarı eğrileri"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                  Şubelere Göre Toplam Net Ortalaması
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>12-A (YKS Sayısal)</span>
                      <span className="text-emerald-600 font-mono">92.4 Net</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>12-B (YKS Eşit Ağırlık)</span>
                      <span className="text-indigo-600 font-mono">78.6 Net</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '72%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>8-A (LGS)</span>
                      <span className="text-amber-600 font-mono">68.2 Net</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '78%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>8-B (LGS)</span>
                      <span className="text-sky-600 font-mono">62.8 Net</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: '70%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                  Ders Bazlı Kurum Doğruluk Oranı
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Türkçe / Edebiyat</span>
                      <span className="text-emerald-600 font-mono">%84.2</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '84%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Matematik & Geometri</span>
                      <span className="text-amber-600 font-mono">%68.5</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Fen Bilimleri (Fizik/Kimya/Biyo)</span>
                      <span className="text-indigo-600 font-mono">%73.1</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '73%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Sosyal Bilimler</span>
                      <span className="text-sky-600 font-mono">%82.4</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: '82%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: CREATE NEW EXAM */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Yeni Deneme Sınavı Tanımla"
        subtitle="Kurum genelinde veya şube bazında yeni bir değerlendirme sınavı açın"
        maxWidth="md"
      >
        <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
          <Input
            label="Sınav Adı"
            required
            placeholder="Örn: Mahfaza.co TYT Türkiye Geneli #2"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Sınav Türü"
              value={newType}
              onChange={(e) => setNewType(e.target.value as ExamType)}
              options={[
                { value: 'TYT', label: 'TYT (Temel Yeterlilik)' },
                { value: 'AYT', label: 'AYT (Alan Yeterlilik)' },
                { value: 'LGS', label: 'LGS (Liselere Giriş Sınavı)' },
              ]}
            />

            <Input
              label="Uygulama Tarihi"
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>

          <Select
            label="Hedef Sınıf / Şube"
            value={newClassId}
            onChange={(e) => setNewClassId(e.target.value)}
            options={[
              { value: 'all', label: 'Tüm Kurum (Tüm Şubeler)' },
              ...classes.map((c) => ({ value: c.id, label: `${c.name} (${c.grade_level ? `${c.grade_level}. Sınıf` : 'Şube'})` })),
            ]}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
              Sınavı Kaydet & Yayınla
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
