interface TabbyLogoProps {
  size?: number;
  className?: string;
}

export function TabbyLogo({ size = 48, className = '' }: TabbyLogoProps) {
  // Height is proportional: viewBox is 48w × 58h
  const height = Math.round(size * (58 / 48));
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 48 58"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tab/receipt body with cat-ear peaks at top corners */}
      <path
        d="M 4,16 L 10,4 L 16,16 L 32,16 L 38,4 L 44,16 L 44,52 Q 44,56 40,56 L 8,56 Q 4,56 4,52 Z"
        fill="#F97316"
      />

      {/* Cat face — big round friendly eyes */}
      {/* Left eye */}
      <ellipse cx="16" cy="22" rx="4" ry="4" fill="white" />
      <ellipse cx="16" cy="22" rx="1.4" ry="2.2" fill="#1C1917" />

      {/* Right eye */}
      <ellipse cx="32" cy="22" rx="4" ry="4" fill="white" />
      <ellipse cx="32" cy="22" rx="1.4" ry="2.2" fill="#1C1917" />

      {/* Nose */}
      <ellipse cx="24" cy="27.5" rx="1.2" ry="0.9" fill="white" opacity="0.75" />

      {/* Whiskers — 3 per side */}
      <line x1="13" y1="25.5" x2="4" y2="23" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <line x1="13" y1="27.5" x2="4" y2="27.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <line x1="13" y1="29.5" x2="4" y2="31.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />

      <line x1="35" y1="25.5" x2="44" y2="23" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <line x1="35" y1="27.5" x2="44" y2="27.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <line x1="35" y1="29.5" x2="44" y2="31.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />

      {/* Receipt lines — thinner and shorter */}
      <line x1="15" y1="36" x2="33" y2="36" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="42" x2="29" y2="42" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="48" x2="23" y2="48" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
