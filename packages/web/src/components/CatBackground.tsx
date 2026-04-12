import { ReactNode } from 'react';

interface CatBackgroundProps {
  children: ReactNode;
  className?: string;
}

// Inline SVG for a faint cat face silhouette pattern
const catFaceSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <g opacity="0.04" fill="%236366F1">
    <!-- Ears -->
    <path d="M25 20L30 32H20L25 20Z"/>
    <path d="M55 20L60 32H50L55 20Z"/>
    <!-- Head -->
    <ellipse cx="40" cy="40" rx="18" ry="16"/>
    <!-- Eyes -->
    <ellipse cx="34" cy="38" rx="2.5" ry="3" fill="white"/>
    <ellipse cx="46" cy="38" rx="2.5" ry="3" fill="white"/>
  </g>
</svg>
`.trim();

const encodedSvg = `url("data:image/svg+xml,${encodeURIComponent(catFaceSvg)}")`;

export function CatBackground({ children, className = '' }: CatBackgroundProps) {
  return (
    <div
      className={`min-h-screen ${className}`}
      style={{
        backgroundImage: encodedSvg,
        backgroundSize: '120px 120px',
      }}
    >
      {children}
    </div>
  );
}
