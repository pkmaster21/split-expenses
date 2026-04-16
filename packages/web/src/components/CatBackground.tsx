import { CSSProperties, ReactNode } from 'react';

interface CatBackgroundProps {
  children: ReactNode;
  className?: string;
}

function makePawSvg(opacity: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><g transform="rotate(45 40 40)" opacity="${opacity}" fill="%23F97316"><ellipse cx="40" cy="50" rx="11" ry="9"/><ellipse cx="25" cy="34" rx="5" ry="4"/><ellipse cx="35" cy="28" rx="5" ry="4"/><ellipse cx="46" cy="28" rx="5" ry="4"/><ellipse cx="56" cy="34" rx="5" ry="4"/></g></svg>`;
}

function pawBgStyle(opacity: number, size: number): CSSProperties {
  return {
    backgroundColor: '#FAFAF8',
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(makePawSvg(opacity))}")`,
    backgroundSize: `${size}px ${size}px`,
    backgroundAttachment: 'fixed',
  };
}

// Subtle tiled wallpaper for logged-in app pages
export const appPageStyle: CSSProperties = pawBgStyle(0.022, 160);

export function CatBackground({ children, className = '' }: CatBackgroundProps) {
  return (
    <div
      className={`min-h-screen ${className}`}
      style={pawBgStyle(0.038, 160)}
    >
      {children}
    </div>
  );
}
