import { jsPDF } from 'jspdf';
import { Profile, StudentXPData, ExamResult, AttendanceRecord, CoachTask, BranchTeacherFeedback } from '../types/index';
import { getMahfazaLogoPngBase64, MAHFAZA_STATIC_PNG_BASE64 } from './logoConstants';

export interface Student360ReportData {
  student: Profile;
  coachName?: string;
  xpData?: StudentXPData | null;
  examResults?: ExamResult[];
  attendanceRecords?: AttendanceRecord[];
  tasks?: CoachTask[];
  branchFeedbacks?: BranchTeacherFeedback[];
  academicSummary?: string;
  coachNotes?: string;
}

// Valid Base64 PNG placeholder for MAHFAZA.CO Gold Emblem Logo
export const MAHFAZA_LOGO_BASE64 = MAHFAZA_STATIC_PNG_BASE64;

// Helper to render crisp high-DPI Base64 PNG logo via HTML5 Canvas or fallback to Base64 constant
export function getMahfazaLogoBase64(): string {
  return getMahfazaLogoPngBase64();
}

// Helper to safely format Turkish characters for standard PDF fonts
export function sanitizeText(str?: string | null): string {
  if (!str) return 'Veri bulunmuyor';
  return str
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C');
}

export function triggerReliablePdfDownload(doc: jsPDF, filename: string): void {
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 300);
  } catch {
    doc.save(filename);
  }
}

export function drawPremiumCorporateHeader(
  doc: jsPDF,
  reportSubtitle: string,
  metaLine: string
): void {
  // Page outer subtle corporate frame
  doc.setDrawColor(184, 134, 11); // Gold #B8860B
  doc.setLineWidth(0.4);
  doc.rect(8, 8, 194, 281);

  // Dark Gray / Obsidian Header Banner
  doc.setFillColor(28, 28, 32); // Dark Gray
  doc.rect(8, 8, 194, 30, 'F');

  // Gold Accent Bar (#B8860B)
  doc.setFillColor(184, 134, 11);
  doc.rect(8, 38, 194, 2, 'F');

  // Insert Base64 Logo via jsPDF addImage with vector fallback
  const logoBase64 = getMahfazaLogoBase64();
  try {
    doc.addImage(logoBase64, 'PNG', 14, 13, 18, 18);
  } catch {
    doc.setFillColor(184, 134, 11);
    doc.roundedRect(14, 13, 18, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('M', 21, 24.5);
  }

  // Brand Title
  doc.setTextColor(218, 165, 32); // Gold highlight
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('MAHFAZA.CO', 36, 19);

  // Subtitle
  doc.setTextColor(244, 244, 245);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(reportSubtitle, 36, 25.5);

  // Metadata Line
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 210);
  doc.text(metaLine, 36, 32);
}

export function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(42, 42, 48); // Dark Gray header bar
  doc.rect(14, y - 4.5, 182, 7, 'F');

  // Left Gold accent strip (#B8860B)
  doc.setFillColor(184, 134, 11);
  doc.rect(14, y - 4.5, 3, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, y + 0.5);

  return y + 7;
}

export function generateStudent360PDF(data: Student360ReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const studentName =
    data.student.first_name && data.student.last_name
      ? `${data.student.first_name} ${data.student.last_name}`
      : data.student.full_name || data.student.email;

  const reportDate = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const renderHeader = (pageNumber: number) => {
    drawPremiumCorporateHeader(
      doc,
      'OGRENCI 360 AKADEMIK PERFORMANS VE GELISIM KARNESI',
      `Rapor Tarihi: ${reportDate}   |   Danisman Koc: ${sanitizeText(data.coachName || 'Atanmis Koc')}   |   Sayfa ${pageNumber}`
    );
  };

  let currentPage = 1;
  renderHeader(currentPage);

  let y = 48;

  // SECTION 1: STUDENT PROFILE INFORMATION
  y = drawSectionHeader(doc, '1. OGRENCI KIMLIK VE AKADEMIK HEDEF BILGILERI', y);

  // Boxed table for Student Identity
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.25);
  doc.rect(14, y - 2, 182, 22, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(39, 39, 42);

  const profileLeft = [
    ['Ogrenci Ad Soyad:', sanitizeText(studentName)],
    ['Kayitli E-Posta:', data.student.email || 'Veri bulunmuyor'],
    ['Portfoy Statu:', 'Aktif Akademik Danisan'],
  ];

  const profileRight = [
    ['Hedef Puan Turu:', sanitizeText(data.student.target_program || 'SAY / YKS Derece Programi')],
    ['Hedef Universite:', sanitizeText(data.student.target_university || 'Bogazici / ITU Hedef Portfoyu')],
    ['Sinif / Seviye:', '12. Sinif / YKS Hazirlik'],
  ];

  profileLeft.forEach(([label, val], idx) => {
    const rowY = y + 3 + idx * 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text(label, 18, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 39, 42);
    doc.text(val, 52, rowY);
  });

  profileRight.forEach(([label, val], idx) => {
    const rowY = y + 3 + idx * 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text(label, 108, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 39, 42);
    doc.text(val.slice(0, 32), 140, rowY);
  });

  y += 28;

  // SECTION 2: XP & MOTIVATION PERFORMANCE
  y = drawSectionHeader(doc, '2. DISIPLIN, SERI (STREAK) VE XP PERFORMANS GOSTERGELERI', y);

  const lifetimeXp = data.xpData?.lifetime_xp ?? 0;
  const walletXp = data.xpData?.wallet_xp ?? 0;
  const streak = data.xpData?.current_streak_days ?? 0;
  const todayEarned = data.xpData?.today_earned_xp ?? 0;

  const kpiBoxes = [
    { label: 'TOPLAM KAZANIM', value: `${lifetimeXp} XP` },
    { label: 'CUZDAN BAKIYESI', value: `${walletXp} XP` },
    { label: 'KESINTISIZ SERI', value: `${streak} Gun` },
    { label: 'GUNLUK TEMPO', value: `${todayEarned} / 150 XP` },
  ];

  kpiBoxes.forEach((box, i) => {
    const boxX = 14 + i * 46;
    doc.setFillColor(248, 248, 250);
    doc.setDrawColor(212, 212, 216);
    doc.rect(boxX, y - 2, 44, 15, 'FD');

    doc.setFillColor(184, 134, 11);
    doc.rect(boxX, y - 2, 44, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text(box.label, boxX + 3, y + 3);

    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text(box.value, boxX + 3, y + 9.5);
  });

  y += 21;

  // SECTION 3: EXAM PERFORMANCE & NET SCORES
  y = drawSectionHeader(doc, '3. DENEME SINAVLARI VE BRANS NET ANALIZ TABLOSU', y);

  if (data.examResults && data.examResults.length > 0) {
    // Table Header
    doc.setFillColor(184, 134, 11); // Gold #B8860B table header
    doc.rect(14, y - 2, 182, 6.5, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Deneme Sinavi Adi', 17, y + 2.3);
    doc.text('Kategori', 86, y + 2.3);
    doc.text('Turkce', 110, y + 2.3);
    doc.text('Matematik', 130, y + 2.3);
    doc.text('Fen / Sos.', 154, y + 2.3);
    doc.text('Toplam Net', 176, y + 2.3);
    y += 6.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    data.examResults.slice(0, 6).forEach((ex, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.setDrawColor(228, 228, 231);
      doc.rect(14, y - 2, 182, 6, 'FD');

      const title = sanitizeText(ex.exam_name || ex.exam?.title || 'Kurumsal Deneme Sinavi');
      const examType = ex.exam?.exam_type || 'TYT';
      const turk = ex.turkish_net != null ? String(ex.turkish_net) : '-';
      const mat = ex.math_net != null ? String(ex.math_net) : '-';
      const fenSos = `${ex.science_net != null ? ex.science_net : '-'} / ${ex.social_net != null ? ex.social_net : '-'}`;
      const total = ex.total_net != null ? `${ex.total_net} Net` : '-';

      doc.setTextColor(39, 39, 42);
      doc.text(title.slice(0, 36), 17, y + 2);
      doc.text(examType, 86, y + 2);
      doc.text(turk, 112, y + 2);
      doc.text(mat, 134, y + 2);
      doc.text(fenSos, 155, y + 2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(184, 134, 11);
      doc.text(total, 176, y + 2);
      doc.setFont('helvetica', 'normal');
      y += 6;
    });
    y += 6;
  } else {
    doc.setFillColor(250, 250, 252);
    doc.setDrawColor(228, 228, 231);
    doc.rect(14, y - 2, 182, 10, 'FD');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 113, 122);
    doc.text('Henuz sisteme islenmis deneme sinavi sonucu bulunmamaktadir.', 18, y + 4);
    y += 14;
  }

  // Check page height before tasks
  if (y > 215) {
    currentPage += 1;
    doc.addPage();
    renderHeader(currentPage);
    y = 48;
  }

  // SECTION 4: ASSIGNED TASKS & HOMEWORK SUMMARY
  y = drawSectionHeader(doc, '4. KOCLUK GOREVLERI VE HAFTALIK SORUMLULUK TAKIBI', y);

  if (data.tasks && data.tasks.length > 0) {
    const completedTasks = data.tasks.filter((t) => t.status === 'verified' || t.status === 'completed').length;
    const pendingTasks = data.tasks.filter((t) => t.status === 'pending' || t.status === 'submitted').length;

    doc.setFillColor(248, 248, 250);
    doc.setDrawColor(184, 134, 11);
    doc.rect(14, y - 2, 182, 7, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(39, 39, 42);
    doc.text(
      `Toplam Atanan Gorev: ${data.tasks.length}   |   Tamamlanan: ${completedTasks}   |   Devam Eden / Bekleyen: ${pendingTasks}`,
      18,
      y + 2.5
    );
    y += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    data.tasks.slice(0, 5).forEach((t, idx) => {
      const isDone = t.status === 'verified' || t.status === 'completed';
      const statusText = isDone ? 'TAMAMLANDI' : 'BEKLIYOR';
      const dueDate = t.due_date ? new Date(t.due_date).toLocaleDateString('tr-TR') : 'Belirtilmedi';

      doc.setFillColor(idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 251);
      doc.setDrawColor(228, 228, 231);
      doc.rect(14, y - 2, 182, 6, 'FD');

      doc.setTextColor(39, 39, 42);
      doc.text(`${idx + 1}. ${sanitizeText(t.title).slice(0, 55)}`, 17, y + 2);
      doc.text(`Teslim: ${dueDate}`, 122, y + 2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isDone ? 22 : 184, isDone ? 101 : 134, isDone ? 52 : 11);
      doc.text(`${statusText} (+${t.xp_reward} XP)`, 160, y + 2);
      doc.setFont('helvetica', 'normal');
      y += 6;
    });
    y += 6;
  } else {
    doc.setFillColor(250, 250, 252);
    doc.setDrawColor(228, 228, 231);
    doc.rect(14, y - 2, 182, 10, 'FD');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 113, 122);
    doc.text('Aktif donem icin kayitli kocluk gorevi bulunmamaktadir.', 18, y + 4);
    y += 14;
  }

  // Check page height before coach evaluation
  if (y > 220) {
    currentPage += 1;
    doc.addPage();
    renderHeader(currentPage);
    y = 48;
  }

  // SECTION 5: COACH EVALUATION & ACADEMIC ACTION PLAN
  y = drawSectionHeader(doc, '5. KOC DEGERLENDIRMESI VE AKADEMIK YOL HARITASI', y);

  const notes =
    data.coachNotes ||
    data.academicSummary ||
    'Ogrenci hedeflenen calisma temposuna uyum saglamakta olup deneme netlerini artirmak uzere haftalik odaklanma plani uygulanmaktadir.';
  const splitNotes = doc.splitTextToSize(sanitizeText(notes), 174);
  const boxHeight = Math.max(16, splitNotes.length * 4.5 + 6);

  doc.setFillColor(252, 251, 247);
  doc.setDrawColor(184, 134, 11);
  doc.rect(14, y - 2, 182, boxHeight, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(39, 39, 42);
  doc.text(splitNotes, 18, y + 3);
  y += boxHeight + 10;

  // SIGNATURES SECTION
  if (y > 250) {
    currentPage += 1;
    doc.addPage();
    renderHeader(currentPage);
    y = 52;
  }

  const sigY = Math.max(y, 248);
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.3);
  doc.line(14, sigY, 196, sigY);

  // Signature Boxes
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(212, 212, 216);
  doc.rect(14, sigY + 3, 86, 20, 'FD');
  doc.rect(110, sigY + 3, 86, 20, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('DANISMAN KOC IMZASI', 20, sigY + 9);
  doc.text('KURUM MUDURU IMZASI', 116, sigY + 9);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(113, 113, 122);
  doc.text(`Imza: _______________________`, 20, sigY + 18);
  doc.text(`Imza: _______________________`, 116, sigY + 18);

  // Footer Note & Confidentiality Notice
  doc.setDrawColor(184, 134, 11);
  doc.line(14, 278, 196, 278);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(184, 134, 11);
  doc.text('MAHFAZA.CO KURUMSAL AKADEMIK RAPORLAMA SISTEMI', 14, 283);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(113, 113, 122);
  doc.text('Resmi Belgedir  |  Gizlilik Derecesi: Kurum Ici', 138, 283);

  // Trigger real file download
  const safeFilename = `Mahfaza_Student360_${data.student.first_name || 'Ogrenci'}_${data.student.last_name || data.student.id.slice(0, 6)}.pdf`.replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );

  triggerReliablePdfDownload(doc, safeFilename);
}
