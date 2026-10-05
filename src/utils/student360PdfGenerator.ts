import { jsPDF } from 'jspdf';
import { Profile, StudentXPData, ExamResult, AttendanceRecord, CoachTask, BranchTeacherFeedback } from '../types/index';

interface Student360ReportData {
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

// Helper to safely format Turkish characters for standard PDF fonts
function sanitizeText(str?: string | null): string {
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

export function generateStudent360PDF(data: Student360ReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const studentName = data.student.first_name && data.student.last_name
    ? `${data.student.first_name} ${data.student.last_name}`
    : data.student.full_name || data.student.email;

  const reportDate = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const renderHeader = (pageNumber: number) => {
    // Background / Header Bar (Mahfaza Dark Charcoal)
    doc.setFillColor(24, 24, 27); // zinc-900
    doc.rect(0, 0, 210, 36, 'F');

    // Gold accent line
    doc.setFillColor(217, 119, 6); // amber-600
    doc.rect(0, 36, 210, 1.5, 'F');

    // Title
    doc.setTextColor(251, 191, 36); // amber-400
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('MAHFAZA.CO', 14, 14);

    doc.setTextColor(244, 244, 245); // zinc-100
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('OGRENCI 360 GELISIM VE AKADEMIK PERFORMANS RAPORU', 14, 22);

    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.text(`Rapor Tarihi: ${reportDate}  |  Koc: ${sanitizeText(data.coachName || 'Atanmis Koc')}  |  Sayfa ${pageNumber}`, 14, 30);
  };

  renderHeader(1);

  let y = 46;

  // SECTION 1: STUDENT PROFILE INFORMATION
  doc.setTextColor(24, 24, 27);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. OGRENCI KIMLIK VE HEDEF BILGILERI', 14, y);
  y += 2;

  doc.setDrawColor(212, 212, 216);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(63, 63, 70);

  const profileLeft = [
    `Ad Soyad: ${sanitizeText(studentName)}`,
    `E-posta: ${data.student.email || 'Veri bulunmuyor'}`,
    `Rol / Durum: Ogrenci (Aktif Danisan)`,
  ];

  const profileRight = [
    `Hedef Alan: SAY / YKS Hedef Portfoyu`,
    `Hedef Universite / Bolum: Bogazici Univ. Bilgisayar Muh.`,
    `Akademik Seviye: 12. Sinif`,
  ];

  profileLeft.forEach((line, idx) => {
    doc.text(line, 14, y + idx * 5);
  });
  profileRight.forEach((line, idx) => {
    doc.text(line, 105, y + idx * 5);
  });
  y += 18;

  // SECTION 2: XP & MOTIVATION PERFORMANCE
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('2. OYUNLASTIRMA VE MOTIVASYON DURUMU (XP)', 14, y);
  y += 2;
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(63, 63, 70);

  if (data.xpData) {
    const lifetimeXp = data.xpData.lifetime_xp ?? 'Veri bulunmuyor';
    const walletXp = data.xpData.wallet_xp ?? 'Veri bulunmuyor';
    const streak = data.xpData.current_streak_days ?? 'Veri bulunmuyor';
    const todayEarned = data.xpData.today_earned_xp ?? 'Veri bulunmuyor';

    doc.text(`Toplam Kazanilan (Lifetime XP): ${lifetimeXp} XP`, 14, y);
    doc.text(`Harcanabilir Cuzdan (Wallet XP): ${walletXp} XP`, 105, y);
    y += 5;
    doc.text(`Mevcut Calisma Serisi (Streak): ${streak} Gun`, 14, y);
    doc.text(`Bugun Kazanilan XP: ${todayEarned} XP (Gunluk Limit: 150)`, 105, y);
    y += 8;
  } else {
    doc.text('XP ve motivasyon verisi: Veri bulunmuyor', 14, y);
    y += 8;
  }

  // SECTION 3: EXAM PERFORMANCE & NET SCORES
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('3. DENEME SINAVLARI VE NET PERFORMANSI', 14, y);
  y += 2;
  doc.line(14, y, 196, y);
  y += 6;

  if (data.examResults && data.examResults.length > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(244, 244, 245);
    doc.rect(14, y - 4, 182, 6, 'F');
    doc.text('Sinav Basligi', 16, y);
    doc.text('Tur', 80, y);
    doc.text('Turkce', 105, y);
    doc.text('Matematik', 125, y);
    doc.text('Fen / Sos.', 150, y);
    doc.text('Toplam Net', 175, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    data.examResults.slice(0, 5).forEach((ex) => {
      const title = sanitizeText(ex.exam?.title || 'Deneme Sinavi');
      const examType = ex.exam?.exam_type || 'TYT';
      const turk = ex.turkish_net != null ? String(ex.turkish_net) : '-';
      const mat = ex.math_net != null ? String(ex.math_net) : '-';
      const fenSos = `${ex.science_net != null ? ex.science_net : '-'}/${ex.social_net != null ? ex.social_net : '-'}`;
      const total = ex.total_net != null ? `${ex.total_net} Net` : 'Veri bulunmuyor';

      doc.text(title.slice(0, 35), 16, y);
      doc.text(examType, 80, y);
      doc.text(turk, 105, y);
      doc.text(mat, 125, y);
      doc.text(fenSos, 150, y);
      doc.text(total, 175, y);
      y += 5;
    });
    y += 3;
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Deneme sinavi performans verisi: Veri bulunmuyor', 14, y);
    y += 8;
  }

  // SECTION 4: BRANCH TEACHER EVALUATIONS (Physical Handwritten Form for Teachers)
  // Check height: Start on page 2 if needed so all teacher sections fit cleanly
  if (y > 160) {
    doc.addPage();
    renderHeader(2);
    y = 46;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('4. BRANS OGRETMENLERI DEGERLENDIRMELERI (EL YAZISI FORMU)', 14, y);
  y += 2;
  doc.line(14, y, 196, y);
  y += 6;

  // Render 4 clean physical handwriting sections for branch teachers
  for (let i = 1; i <= 4; i++) {
    if (y > 250) {
      doc.addPage();
      renderHeader(3);
      y = 46;
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.text(
      `${i}. Brans: ______________________________      Ogretmen: ______________________________`,
      14,
      y
    );
    y += 4.5;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 113, 122);
    doc.text('Akademik Degerlendirme ve Oneriler:', 14, y);
    y += 4;

    // 3 clean ruled lines for teacher handwriting
    doc.setDrawColor(212, 212, 216);
    doc.line(14, y, 196, y);
    y += 5;
    doc.line(14, y, 196, y);
    y += 5;
    doc.line(14, y, 196, y);
    y += 6.5;
  }

  // Check page height before tasks
  if (y > 230) {
    doc.addPage();
    renderHeader(2);
    y = 46;
  }

  // SECTION 5: ASSIGNED TASKS & HOMEWORK SUMMARY
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('5. KOC GOREVLERI VE ODEV DURUMU', 14, y);
  y += 2;
  doc.line(14, y, 196, y);
  y += 6;

  if (data.tasks && data.tasks.length > 0) {
    const completedTasks = data.tasks.filter((t) => t.status === 'verified' || t.status === 'completed').length;
    const pendingTasks = data.tasks.filter((t) => t.status === 'pending' || t.status === 'submitted').length;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Toplam Atanan Gorev: ${data.tasks.length}  |  Tamamlanan: ${completedTasks}  |  Bekleyen: ${pendingTasks}`, 14, y);
    y += 5;

    doc.setFontSize(8);
    data.tasks.slice(0, 3).forEach((t) => {
      const statusText = (t.status === 'verified' || t.status === 'completed') ? '[TAMAMLANDI]' : '[BEKLIYOR]';
      const dueDate = t.due_date ? new Date(t.due_date).toLocaleDateString('tr-TR') : 'Belirtilmedi';
      doc.text(`- ${sanitizeText(t.title)} (${dueDate}) ${statusText} (+${t.xp_reward} XP)`, 16, y);
      y += 4.5;
    });
    y += 3;
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Gorev kayit durumu: Veri bulunmuyor', 14, y);
    y += 8;
  }

  // Check page height before coach evaluation
  if (y > 230) {
    doc.addPage();
    renderHeader(2);
    y = 46;
  }

  // SECTION 6: COACH EVALUATION & ACADEMIC ACTION PLAN
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('6. KOC DEGERLENDIRMESI VE AKADEMIK STRATEJI', 14, y);
  y += 2;
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(63, 63, 70);

  const notes = data.coachNotes || data.academicSummary || 'Ogrenci hedeflenen calisma temposuna uyum saglamakta olup deneme netlerini artirmak uzere haftalik odaklanma plani uygulanmaktadir.';
  const splitNotes = doc.splitTextToSize(sanitizeText(notes), 182);
  doc.text(splitNotes, 14, y);
  y += splitNotes.length * 4.5 + 4;

  // Footer Note & Confidentiality Notice
  doc.setDrawColor(212, 212, 216);
  doc.line(14, 280, 196, 280);

  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122); // zinc-500
  doc.text('Mahfaza.co Akademik Isletim Sistemi  |  Bu belge kisisel gelisim takibi amaciyla uretilmistir. Gizlidir.', 14, 285);

  // Trigger real file download
  const safeFilename = `Mahfaza_Student360_${(data.student.first_name || 'Ogrenci')}_${(data.student.last_name || data.student.id.slice(0, 6))}.pdf`
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  doc.save(safeFilename);
}
