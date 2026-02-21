import React from 'react';

interface PixelIconProps {
  size?: number;
  className?: string;
}

export const PxFolder: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <rect x="1" y="3" width="5" height="2" fill="#FFFF00" />
    <rect x="1" y="5" width="14" height="9" fill="#FFFF00" />
    <rect x="1" y="5" width="14" height="1" fill="#FFFF80" />
    <rect x="1" y="3" width="1" height="11" fill="#FFFF80" />
    <rect x="14" y="5" width="1" height="9" fill="#C0A000" />
    <rect x="1" y="13" width="14" height="1" fill="#C0A000" />
    <rect x="0" y="3" width="1" height="11" fill="#000" />
    <rect x="6" y="3" width="1" height="2" fill="#000" />
    <rect x="0" y="14" width="16" height="1" fill="#000" />
    <rect x="15" y="5" width="1" height="9" fill="#000" />
    <rect x="6" y="5" width="9" height="1" fill="#000" />
    <rect x="0" y="3" width="7" height="1" fill="#000" />
  </svg>
);

export const PxFolderOpen: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <rect x="1" y="3" width="5" height="2" fill="#FFFF00" />
    <rect x="1" y="5" width="14" height="4" fill="#FFFF00" />
    <rect x="0" y="9" width="13" height="5" fill="#FFFF80" />
    <rect x="3" y="9" width="12" height="5" fill="#FFFF00" />
    <rect x="0" y="3" width="7" height="1" fill="#000" />
    <rect x="0" y="14" width="16" height="1" fill="#000" />
    <rect x="15" y="9" width="1" height="5" fill="#000" />
    <rect x="0" y="3" width="1" height="11" fill="#000" />
  </svg>
);

export const PxHome: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <path d="M8 1L1 7V15H6V10H10V15H15V7L8 1Z" fill="#C0C0C0" stroke="#000" strokeWidth="0.5" />
    <rect x="1" y="7" width="14" height="1" fill="#FFFFFF" />
    <rect x="6" y="10" width="4" height="5" fill="#808000" />
    <path d="M8 1L1 7H15L8 1Z" fill="#800000" stroke="#000" strokeWidth="0.5" />
  </svg>
);

export const PxCart: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <path d="M1 1H3L4 3H14L12 9H5L3 3" fill="none" stroke="#000" strokeWidth="1" />
    <rect x="4" y="3" width="10" height="1" fill="#FFFF00" />
    <rect x="4" y="4" width="9" height="1" fill="#FFFF00" />
    <rect x="4" y="5" width="9" height="1" fill="#FFFF80" />
    <rect x="5" y="6" width="8" height="1" fill="#FFFF80" />
    <rect x="5" y="7" width="7" height="1" fill="#FFFF00" />
    <rect x="5" y="8" width="7" height="1" fill="#FFFF00" />
    <circle cx="6" cy="12" r="1.5" fill="#000" />
    <circle cx="11" cy="12" r="1.5" fill="#000" />
  </svg>
);

export const PxUser: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <circle cx="8" cy="5" r="3" fill="#C0C0C0" stroke="#000" strokeWidth="0.5" />
    <path d="M3 14C3 10 5 9 8 9C11 9 13 10 13 14" fill="#000080" stroke="#000" strokeWidth="0.5" />
    <rect x="6" y="4" width="1" height="1" fill="#000" />
    <rect x="9" y="4" width="1" height="1" fill="#000" />
  </svg>
);

export const PxShield: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <path d="M8 1L2 4V8C2 11 5 14 8 15C11 14 14 11 14 8V4L8 1Z" fill="#008000" stroke="#000" strokeWidth="0.5" />
    <path d="M6 8L7.5 10L10 6" fill="none" stroke="#FFF" strokeWidth="1.5" />
  </svg>
);

export const PxLightning: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <path d="M9 1L4 9H7L6 15L12 7H9L9 1Z" fill="#FFFF00" stroke="#000" strokeWidth="0.5" />
  </svg>
);

export const PxUsers: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <circle cx="5" cy="5" r="2.5" fill="#C0C0C0" stroke="#000" strokeWidth="0.5" />
    <circle cx="11" cy="5" r="2.5" fill="#C0C0C0" stroke="#000" strokeWidth="0.5" />
    <path d="M1 14C1 11 3 9 5 9C6 9 7 9.5 8 10C9 9.5 10 9 11 9C13 9 15 11 15 14" fill="#000080" stroke="#000" strokeWidth="0.5" />
  </svg>
);

export const PxStar: React.FC<PixelIconProps & { filled?: boolean }> = ({ size = 16, className = '', filled = false }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <path d="M8 1L10 6H15L11 9L12.5 14L8 11L3.5 14L5 9L1 6H6L8 1Z" fill={filled ? '#FFFF00' : 'none'} stroke="#000" strokeWidth="0.5" />
  </svg>
);

export const PxWarning: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <path d="M8 1L1 14H15L8 1Z" fill="#FFFF00" stroke="#000" strokeWidth="0.5" />
    <rect x="7" y="5" width="2" height="5" fill="#000" />
    <rect x="7" y="11" width="2" height="2" fill="#000" />
  </svg>
);

export const PxInfo: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <circle cx="8" cy="8" r="7" fill="#000080" stroke="#000" strokeWidth="0.5" />
    <rect x="7" y="4" width="2" height="2" fill="#FFF" />
    <rect x="7" y="7" width="2" height="5" fill="#FFF" />
  </svg>
);

export const PxMail: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <rect x="1" y="3" width="14" height="10" fill="#FFF" stroke="#000" strokeWidth="0.5" />
    <path d="M1 3L8 8L15 3" fill="none" stroke="#000" strokeWidth="0.5" />
    <rect x="1" y="3" width="14" height="2" fill="#C0C0C0" />
    <path d="M1 3L8 8L15 3" fill="none" stroke="#000" strokeWidth="0.5" />
  </svg>
);

export const PxQuestion: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <circle cx="8" cy="8" r="7" fill="#008000" stroke="#000" strokeWidth="0.5" />
    <path d="M6 5C6 4 7 3 8 3C9 3 10 4 10 5C10 6 9 6.5 8.5 7L8 7.5V9" fill="none" stroke="#FFF" strokeWidth="1.5" />
    <rect x="7" y="10" width="2" height="2" fill="#FFF" />
  </svg>
);

export const PxGrid: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <rect x="1" y="1" width="4" height="4" fill="#000080" stroke="#000" strokeWidth="0.5" />
    <rect x="6" y="1" width="4" height="4" fill="#000080" stroke="#000" strokeWidth="0.5" />
    <rect x="11" y="1" width="4" height="4" fill="#000080" stroke="#000" strokeWidth="0.5" />
    <rect x="1" y="6" width="4" height="4" fill="#000080" stroke="#000" strokeWidth="0.5" />
    <rect x="6" y="6" width="4" height="4" fill="#000080" stroke="#000" strokeWidth="0.5" />
    <rect x="11" y="6" width="4" height="4" fill="#000080" stroke="#000" strokeWidth="0.5" />
    <rect x="1" y="11" width="4" height="4" fill="#000080" stroke="#000" strokeWidth="0.5" />
    <rect x="6" y="11" width="4" height="4" fill="#000080" stroke="#000" strokeWidth="0.5" />
    <rect x="11" y="11" width="4" height="4" fill="#000080" stroke="#000" strokeWidth="0.5" />
  </svg>
);

export const PxArrowRight: React.FC<PixelIconProps> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <rect x="2" y="7" width="9" height="2" fill="currentColor" />
    <path d="M9 4L14 8L9 12" fill="currentColor" />
  </svg>
);

export const PxArrowDown: React.FC<PixelIconProps> = ({ size = 12, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <rect x="7" y="2" width="2" height="9" fill="currentColor" />
    <path d="M4 9L8 14L12 9" fill="currentColor" />
  </svg>
);

export const PxComputer: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <rect x="1" y="1" width="14" height="10" fill="#C0C0C0" stroke="#000" strokeWidth="0.5" />
    <rect x="2" y="2" width="12" height="7" fill="#000080" />
    <rect x="5" y="11" width="6" height="2" fill="#C0C0C0" stroke="#000" strokeWidth="0.5" />
    <rect x="3" y="13" width="10" height="2" fill="#C0C0C0" stroke="#000" strokeWidth="0.5" />
    <rect x="2" y="2" width="12" height="1" fill="#0000FF" />
  </svg>
);

export const PxChat: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <rect x="1" y="2" width="14" height="9" rx="0" fill="#FFFF80" stroke="#000" strokeWidth="0.5" />
    <path d="M4 11L4 14L7 11" fill="#FFFF80" stroke="#000" strokeWidth="0.5" />
    <rect x="3" y="5" width="6" height="1" fill="#000" />
    <rect x="3" y="7" width="8" height="1" fill="#000" />
  </svg>
);

export const PxTrophy: React.FC<PixelIconProps> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <path d="M4 2H12V7C12 10 10 12 8 12C6 12 4 10 4 7V2Z" fill="#FFFF00" stroke="#000" strokeWidth="0.5" />
    <rect x="7" y="12" width="2" height="2" fill="#C0C0C0" stroke="#000" strokeWidth="0.5" />
    <rect x="5" y="14" width="6" height="1" fill="#C0C0C0" stroke="#000" strokeWidth="0.5" />
    <path d="M4 4H2V6C2 7 3 8 4 8" fill="#FFFF00" stroke="#000" strokeWidth="0.5" />
    <path d="M12 4H14V6C14 7 13 8 12 8" fill="#FFFF00" stroke="#000" strokeWidth="0.5" />
  </svg>
);

export const PxPlus: React.FC<PixelIconProps> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <rect x="7" y="2" width="2" height="12" fill="currentColor" />
    <rect x="2" y="7" width="12" height="2" fill="currentColor" />
  </svg>
);

export const PxCheck: React.FC<PixelIconProps> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <path d="M3 8L6 11L13 4" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const PxEmpty: React.FC<PixelIconProps> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
    <rect x="2" y="2" width="12" height="12" fill="#C0C0C0" stroke="#000" strokeWidth="0.5" />
    <path d="M4 4L12 12M12 4L4 12" stroke="#800000" strokeWidth="1" />
  </svg>
);