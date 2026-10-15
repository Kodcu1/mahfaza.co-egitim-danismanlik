import React from 'react';

// Rich SVG Data URI representing the Ottoman-inspired Black & Gold MAHFAZA.CO Emblem
const MAHFAZA_SVG_MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="35%" stop-color="#D97706" />
      <stop offset="70%" stop-color="#B45309" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <radialGradient id="obsidianGrad" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#27272A" />
      <stop offset="100%" stop-color="#09090B" />
    </radialGradient>
  </defs>
  <!-- Outer Gold Shield Rounded Frame -->
  <rect x="4" y="4" width="192" height="192" rx="42" fill="url(#goldGrad)" />
  <!-- Inner Obsidian Core -->
  <rect x="12" y="12" width="176" height="176" rx="35" fill="url(#obsidianGrad)" />
  <!-- Ottoman Geometric 8-Point Star Motif Filigree -->
  <g stroke="url(#goldGrad)" stroke-width="2.5" fill="none" opacity="0.45">
    <rect x="34" y="34" width="132" height="132" rx="16" />
    <rect x="34" y="34" width="132" height="132" rx="16" transform="rotate(45 100 100)" />
    <circle cx="100" cy="100" r="68" stroke-width="2" stroke-dasharray="6 4" />
  </g>
  <!-- Inner Gold Crest Ring -->
  <circle cx="100" cy="100" r="56" fill="#121215" stroke="url(#goldGrad)" stroke-width="4" />
  <!-- Corner Ottoman Arabesque Diamonds -->
  <polygon points="100,18 106,26 100,34 94,26" fill="url(#goldGrad)" />
  <polygon points="100,166 106,174 100,182 94,174" fill="url(#goldGrad)" />
  <polygon points="18,100 26,106 34,100 26,94" fill="url(#goldGrad)" />
  <polygon points="166,100 174,106 182,100 174,94" fill="url(#goldGrad)" />
  <!-- Royal Serif Monogram M -->
  <text x="100" y="123" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="74" fill="url(#goldGrad)" letter-spacing="2">M</text>
</svg>`;

export const MAHFAZA_LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(MAHFAZA_SVG_MARKUP)}`;

// Generate a PNG Base64 data URL on the fly via HTML5 Canvas for jsPDF compatibility, with static PNG fallback
export const MAHFAZA_STATIC_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8f+bMfwAI3gOdf6N3SAAAAABJRU5ErkJggg==';

export function getMahfazaLogoPngBase64(): string {
  try {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Outer Gold Frame
        const goldGrad = ctx.createLinearGradient(0, 0, 200, 200);
        goldGrad.addColorStop(0, '#FDE68A');
        goldGrad.addColorStop(0.4, '#D97706');
        goldGrad.addColorStop(0.8, '#B45309');
        goldGrad.addColorStop(1, '#F59E0B');

        ctx.fillStyle = goldGrad;
        ctx.beginPath();
        ctx.roundRect(4, 4, 192, 192, 40);
        ctx.fill();

        // Inner Obsidian Background
        ctx.fillStyle = '#121215';
        ctx.beginPath();
        ctx.roundRect(12, 12, 176, 176, 32);
        ctx.fill();

        // Rotated Ottoman Geometric Star Squares
        ctx.save();
        ctx.translate(100, 100);
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 3;
        ctx.strokeRect(-54, -54, 108, 108);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-54, -54, 108, 108);
        ctx.restore();

        // Inner Medallion Circle
        ctx.fillStyle = '#18181B';
        ctx.beginPath();
        ctx.arc(100, 100, 56, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = goldGrad;
        ctx.lineWidth = 5;
        ctx.stroke();

        // Serif 'M' Monogram
        ctx.fillStyle = goldGrad;
        ctx.font = 'bold 82px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', 100, 105);

        return canvas.toDataURL('image/png');
      }
    }
  } catch {
    // Fallback
  }
  return MAHFAZA_STATIC_PNG_BASE64;
}

interface MahfazaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const MahfazaLogo: React.FC<MahfazaLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-16 h-16 rounded-2xl',
  }[size];

  return (
    <img
      src={MAHFAZA_LOGO_DATA_URI}
      alt="Mahfaza.co Logo"
      className={`${sizeClasses} object-contain shrink-0 shadow-sm select-none ${className}`}
    />
  );
};
