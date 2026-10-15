import { jsPDF } from 'jspdf';
import { CoachParentMeeting, Profile } from '../types/index';
import {
  triggerReliablePdfDownload,
  drawPremiumCorporateHeader,
  drawSectionHeader,
  MAHFAZA_LOGO_BASE64,
} from './student360PdfGenerator';

export { MAHFAZA_LOGO_BASE64 };

export interface ParentMeetingReportData {
  meeting: CoachParentMeeting;
  student?: Profile | null;
  coachName?: string;
  isYksStudent?: boolean;
}

// Helper to safely format Turkish characters for standard PDF fonts
export function sanitizeText(str?: string | null): string {
  if (!str) return '';
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

  const totalPages = 1;

  const renderHeader = (pageNumber: number) => {
    drawPremiumCorporateHeader(
      doc,
      'VELI GORUSME TUTANAGI VE AKADEMIK DEGERLENDIRME RAPORU',
      `Gorusme Tarihi: ${meetingDateFormatted}   |   Danisman Koc: ${sanitizeText(data.coachName || 'Atanmis Koc')}   |   Sayfa ${pageNumber} / ${totalPages}`
    );
  };

  const renderFooter = (pageNumber: number) => {
    doc.setDrawColor(184, 134, 11);
    doc.line(14, 278, 196, 278);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text('MAHFAZA.CO KURUMSAL AKADEMIK RAPORLAMA SISTEMI', 14, 283);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 113, 122);
    doc.text(`Veli Gorusme Arsivi  |  Sayfa ${pageNumber} / ${totalPages}`, 148, 283);
  };

  renderHeader(1);
  renderFooter(1);

  let y = 48;

  // SECTION 1: MEETING & PARTICIPANT INFORMATION TABLE
  y = drawSectionHeader(doc, '1. GORUSME KIMLIK VE KATILIMCI BILGILERI', y);

  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.25);
  doc.rect(14, y - 2, 182, 22, 'FD');

  const meetingTypeLabel =
    meeting.meeting_type === 'online'
      ? 'Online (Google Meet / Zoom)'
      : meeting.meeting_type === 'phone'
      ? 'Telefon Gorusmesi'
      : 'Yuz Yuze Kurumsal Gorusme';

  const leftInfo = [
    ['Danisan Ogrenci:', sanitizeText(studentName)],
    ['Gorusulen Veli:', sanitizeText(meeting.parent_name || 'Ogrenci Velisi')],
    ['Iletisim Bilgisi:', sanitizeText(meeting.parent_phone || 'Kayitli telefon yok')],
  ];

  const rightInfo = [
    ['Gorusme Formati:', meetingTypeLabel],
    ['Tarih ve Saat:', `${meetingDateFormatted} - ${meeting.meeting_time || '16:00'}`],
    ['Gorusme Statu:', sanitizeText(meeting.status || 'Planlandi')],
  ];

  doc.setFontSize(8.5);
  leftInfo.forEach(([label, val], idx) => {
    const rowY = y + 3 + idx * 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text(label, 18, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 39, 42);
    doc.text(val.slice(0, 35), 48, rowY);
  });

  rightInfo.forEach(([label, val], idx) => {
    const rowY = y + 3 + idx * 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text(label, 108, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 39, 42);
    doc.text(val.slice(0, 34), 140, rowY);
  });

  y += 28;

  // SECTION 2: STRUCTURED EVALUATION BLOCKS
  y = drawSectionHeader(doc, '2. AKADEMIK GOZLEMLER VE GORUSME NOTLARI', y);

  const renderEvaluationBox = (boxTitle: string, content: string) => {
    const lines = doc.splitTextToSize(sanitizeText(content), 174);
    const boxHeight = Math.max(13, lines.length * 4.3 + 8);

    if (y + boxHeight > 235) {
      doc.addPage();
      renderHeader(2);
      renderFooter(2);
      y = 48;
    }

    // Box Header Strip
    doc.setFillColor(244, 244, 246);
    doc.setDrawColor(212, 212, 216);
    doc.rect(14, y - 2, 182, boxHeight, 'FD');

    doc.setFillColor(184, 134, 11);
    doc.rect(14, y - 2, 2.5, boxHeight, 'F');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text(boxTitle, 19, y + 2.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(39, 39, 42);
    doc.text(lines, 19, y + 7.5);

    y += boxHeight + 4;
  };

  if (meeting.teacher_opinions) {
    renderEvaluationBox('Brans Ogretmenleri Gorus Özeti:', meeting.teacher_opinions);
  }

  renderEvaluationBox(
    'Akademik Durum ve Deneme Performansi:',
    meeting.academic_evaluation ||
      'Ogrencinin deneme netleri ve haftalik calisma disiplini hedeflenen program cercevesinde takip edilmektedir.'
  );

  const rawOrNotes = meeting.raw_notes || meeting.notes;
  if (rawOrNotes) {
    renderEvaluationBox('Veli Geri Bildirimi ve Ev Calisma Ortami:', rawOrNotes);
  }

  if (meeting.psychological_status) {
    renderEvaluationBox('Ogrenci Motivasyon ve Odaklanma Durumu:', meeting.psychological_status);
  }

  const actionPlanText = meeting.action_plan || meeting.action_items;
  if (actionPlanText) {
    renderEvaluationBox('Alinan Kararlar ve Haftalik Aksiyon Plani:', actionPlanText);
  }

  // Next meeting date banner
  if (meeting.next_meeting_date) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(184, 134, 11);
    doc.rect(14, y - 1, 182, 8, 'FD');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text(
      `PLANLANAN SONRAKI VELI GORUSME TARIHI: ${new Date(meeting.next_meeting_date).toLocaleDateString('tr-TR')}`,
      18,
      y + 4.2
    );
    y += 12;
  }

  // SIGNATURES SECTION
  const sigY = Math.max(y + 4, 246);
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.3);
  doc.line(14, sigY, 196, sigY);

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
  doc.text('Imza: _______________________', 20, sigY + 18);
  doc.text('Imza: _______________________', 116, sigY + 18);

  const safeStudent = sanitizeText(studentName).replace(/[^a-zA-Z0-9]/g, '_');
  const safeDate = meetingDateFormatted.replace(/\./g, '-');
  const filename = `Mahfaza_Veli_Gorusmesi_${safeStudent}_${safeDate}.pdf`;

  triggerReliablePdfDownload(doc, filename);
}
