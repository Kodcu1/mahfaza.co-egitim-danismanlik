import { jsPDF } from 'jspdf';
import { Profile, StudentXPData, ExamResult } from '../types/index';
import {
  MAHFAZA_LOGO_BASE64,
  drawPremiumCorporateHeader,
  drawSectionHeader,
  sanitizeText,
  triggerReliablePdfDownload,
} from './student360PdfGenerator';

export { MAHFAZA_LOGO_BASE64 };

export interface PortfolioReportItem {
  student: Profile;
  xpData?: StudentXPData | null;
  exams?: ExamResult[];
  packageName?: string;
}

export interface PortfolioReportData {
  coachName: string;
  students: PortfolioReportItem[];
}

export function generatePortfolioPDF(data: PortfolioReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const reportDate = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  drawPremiumCorporateHeader(
    doc,
    'DANISAN PORTFOYU GENEL AKADEMIK PERFORMANS RAPORU',
    `Rapor Tarihi: ${reportDate}   |   Danisman Koc: ${sanitizeText(data.coachName || 'Atanmis Koc')}   |   Toplam Ogrenci: ${data.students.length}`
  );

  let y = 48;
  y = drawSectionHeader(doc, '1. PORTFOY OGRENCI LISTESI VE PERFORMANS OZETI', y);

  // Table Header in Gold #B8860B
  doc.setFillColor(184, 134, 11);
  doc.rect(14, y - 2, 182, 6.5, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Ogrenci Ad Soyad', 17, y + 2.3);
  doc.text('Paket Seviyesi', 78, y + 2.3);
  doc.text('Seri (Streak)', 118, y + 2.3);
  doc.text('Toplam XP', 148, y + 2.3);
  doc.text('Son Net', 175, y + 2.3);
  y += 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  data.students.forEach((item, idx) => {
    if (y > 240) {
      doc.addPage();
      drawPremiumCorporateHeader(
        doc,
        'DANISAN PORTFOYU GENEL AKADEMIK PERFORMANS RAPORU',
        `Rapor Tarihi: ${reportDate}   |   Danisman Koc: ${sanitizeText(data.coachName || 'Atanmis Koc')}`
      );
      y = 48;
    }

    doc.setFillColor(idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 251 : 255);
    doc.setDrawColor(228, 228, 231);
    doc.rect(14, y - 2, 182, 6.5, 'FD');

    const fullName = sanitizeText(
      `${item.student.first_name || ''} ${item.student.last_name || ''}`.trim() || item.student.email
    );
    const pkg = sanitizeText(item.packageName || item.student.package_tier || 'Standart');
    const streak = `${item.xpData?.current_streak_days ?? 0} Gun`;
    const totalXp = `${item.xpData?.lifetime_xp ?? 0} XP`;
    const latestNet =
      item.exams && item.exams.length > 0 && item.exams[0].total_net != null
        ? `${item.exams[0].total_net} Net`
        : '-';

    doc.setTextColor(39, 39, 42);
    doc.text(fullName.slice(0, 32), 17, y + 2.2);
    doc.text(pkg.slice(0, 20), 78, y + 2.2);
    doc.text(streak, 118, y + 2.2);
    doc.text(totalXp, 148, y + 2.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 134, 11);
    doc.text(latestNet, 175, y + 2.2);
    doc.setFont('helvetica', 'normal');

    y += 6.5;
  });

  const sigY = Math.max(y + 12, 246);
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

  doc.setDrawColor(184, 134, 11);
  doc.line(14, 278, 196, 278);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(184, 134, 11);
  doc.text('MAHFAZA.CO KURUMSAL AKADEMIK RAPORLAMA SISTEMI', 14, 283);

  const safeCoach = sanitizeText(data.coachName || 'Koc').replace(/[^a-zA-Z0-9]/g, '_');
  triggerReliablePdfDownload(doc, `Mahfaza_Portfoy_Raporu_${safeCoach}.pdf`);
}
