import { jsPDF } from 'jspdf';
import { CoachParentMeeting, Profile } from '../types/index';

interface ParentMeetingReportData {
  meeting: CoachParentMeeting;
  student?: Profile | null;
  coachName?: string;
  isYksStudent?: boolean;
}

// Helper to safely format Turkish characters for standard PDF fonts
function sanitizeText(str?: string | null): string {
  if (!str) return 'Belirtilmedi';
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

export function generateParentMeetingPDF(data: ParentMeetingReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { meeting, student } = data;

  const studentName = student
    ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email
    : meeting.student_name || 'Danisan Ogrenci';

  const meetingDateFormatted = meeting.meeting_date
    ? new Date(meeting.meeting_date).toLocaleDateString('tr-TR')
    : new Date().toLocaleDateString('tr-TR');

  const renderHeader = (pageNumber: number) => {
    // Header Bar (Mahfaza Dark Charcoal)
    doc.setFillColor(24, 24, 27); // zinc-900
    doc.rect(0, 0, 210, 34, 'F');

    // Gold accent bar
    doc.setFillColor(217, 119, 6); // amber-600
    doc.rect(0, 34, 210, 1.5, 'F');

    // Title & Logo
    doc.setTextColor(251, 191, 36); // amber-400
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MAHFAZA.CO', 14, 13);

    doc.setTextColor(244, 244, 245); // zinc-100
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    doc.text('VELI GORUSME FORMU VE AKADEMIK RAPORU', 14, 21);

    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.text(
      `Gorusme Tarihi: ${meetingDateFormatted}  |  Koc: ${sanitizeText(data.coachName || 'Atanmis Koc')}  |  Sayfa ${pageNumber}`,
      14,
      28
    );
  };

  renderHeader(1);

  let y = 44;

  // SECTION 1: MEETING & PARTICIPANT INFORMATION
  doc.setTextColor(24, 24, 27);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('1. GORUSME VE KATILIMCI BILGILERI', 14, y);
  y += 2;

  doc.setDrawColor(212, 212, 216);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(63, 63, 70);

  const meetingTypeLabel =
    meeting.meeting_type === 'online'
      ? 'Online (Google Meet / Zoom)'
      : meeting.meeting_type === 'phone'
      ? 'Telefon Gorusmesi'
      : 'Yuz Yuze Gorusme';

  const leftInfo = [
    `Danisan Ogrenci: ${sanitizeText(studentName)}`,
    `Gorusulen Veli: ${sanitizeText(meeting.parent_name || 'Veli')}`,
    `Iletisim Numarasi: ${sanitizeText(meeting.parent_phone || 'Kayitli telefon yok')}`,
  ];

  const rightInfo = [
    `Gorusme Turu: ${meetingTypeLabel}`,
    `Gorusme Saati: ${meeting.meeting_time || '16:00'}`,
    `Hedef Program: ${data.isYksStudent !== false ? 'YKS (TYT-AYT) Calisma Grubu' : 'Akademik Gelisim Portfoyu'}`,
  ];

  leftInfo.forEach((line, idx) => {
    doc.text(line, 14, y + idx * 5);
  });
  rightInfo.forEach((line, idx) => {
    doc.text(line, 105, y + idx * 5);
  });
  y += 18;

  // SECTION 2: MEETING SUBJECT & FACTUAL OBSERVATIONS
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('2. GORUSME KONULARI VE KOC DEGERLENDIRMESI', 14, y);
  y += 2;
  doc.line(14, y, 196, y);
  y += 6;

  // Academic Observation Box
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('Akademik Durum ve Deneme Performansi:', 14, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(63, 63, 70);
  const academicNotes = meeting.academic_evaluation || 'Ogrencinin deneme netleri ve haftalik calisma disiplini hedeflenen program cercevesinde takip edilmektedir.';
  const splitAcademic = doc.splitTextToSize(sanitizeText(academicNotes), 182);
  doc.text(splitAcademic, 14, y);
  y += splitAcademic.length * 4 + 3;

  // Parent Observations Box
  if (meeting.raw_notes || meeting.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.text('Veli Geri Bildirimi ve Ev Calisma Ortami:', 14, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(63, 63, 70);
    const splitNotes = doc.splitTextToSize(sanitizeText(meeting.raw_notes || meeting.notes), 182);
    doc.text(splitNotes, 14, y);
    y += splitNotes.length * 4 + 3;
  }

  // Action items Box
  if (meeting.action_plan || meeting.action_items) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.text('Alinan Kararlar ve Haftalik Aksiyon Plani:', 14, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(63, 63, 70);
    const splitAction = doc.splitTextToSize(sanitizeText(meeting.action_plan || meeting.action_items), 182);
    doc.text(splitAction, 14, y);
    y += splitAction.length * 4 + 3;
  }

  // Next meeting date
  if (meeting.next_meeting_date) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6);
    doc.text(
      `Planlanan Sonraki Veli Gorusme Tarihi: ${new Date(meeting.next_meeting_date).toLocaleDateString('tr-TR')}`,
      14,
      y
    );
    y += 6;
  }

  // SECTION 3: PHYSICAL HANDWRITTEN BRANCH TEACHER EVALUATION FORM
  // Move to page 2 if remaining height on page 1 is not enough for at least 2 teachers
  if (y > 155) {
    doc.addPage();
    renderHeader(2);
    y = 44;
  } else {
    y += 4;
  }

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('3. BRANS OGRETMENLERI GORUSLERI (EL YAZISI ILE DOLDURULACAK KISIM)', 14, y);
  y += 2;
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(113, 113, 122);
  doc.text(
    'Bu alan veli gorusmesi oncesinde brans ogretmenlerine fiziksel olarak verilip el yazisi ile doldurulmak uzere tasarlanmistir.',
    14,
    y
  );
  y += 5;

  // Provide 5 blank areas for teachers (especially important for YKS subjects)
  const teacherCount = 5;
  for (let i = 1; i <= teacherCount; i++) {
    if (y > 240) {
      doc.addPage();
      renderHeader(3);
      y = 44;
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
    doc.text('Gorus & Oneriler:', 14, y);
    y += 3.5;

    // 4 ruled lines for teacher handwriting
    doc.setDrawColor(212, 212, 216);
    doc.line(14, y, 196, y);
    y += 4.5;
    doc.line(14, y, 196, y);
    y += 4.5;
    doc.line(14, y, 196, y);
    y += 4.5;
    doc.line(14, y, 196, y);
    y += 6;
  }

  // Check page height before signatures
  if (y > 255) {
    doc.addPage();
    renderHeader(doc.getNumberOfPages());
    y = 44;
  } else {
    y = Math.max(y + 2, 258);
  }

  // SIGNATURE SECTION
  doc.setDrawColor(212, 212, 216);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('Koc Imzasi: ___________________________', 20, y);
  doc.text('Veli Imzasi: ___________________________', 115, y);

  // Footer Note
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(161, 161, 170);
  doc.text(
    'Mahfaza.co Akademik Isletim Sistemi  |  Bu form veli gorusme tutanagi ve resmi arsiv niteligindedir.',
    14,
    285
  );

  // Safe filename and trigger download
  const safeStudent = sanitizeText(studentName).replace(/[^a-zA-Z0-9]/g, '_');
  const safeDate = meetingDateFormatted.replace(/\./g, '-');
  const filename = `Mahfaza_Veli_Gorusmesi_${safeStudent}_${safeDate}.pdf`;

  doc.save(filename);
}
