interface TabbyLogoProps {
  size?: number;
  className?: string;
}

export function TabbyLogo({ size = 48, className = '' }: TabbyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Cat ears */}
      <path d="M14 8L20 22H8L14 8Z" fill="#6366F1" />
      <path d="M50 8L56 22H44L50 8Z" fill="#6366F1" />
      <path d="M14 12L18 22H10L14 12Z" fill="#818CF8" />
      <path d="M50 12L54 22H46L50 12Z" fill="#818CF8" />
      {/* Head */}
      <ellipse cx="32" cy="32" rx="20" ry="18" fill="#6366F1" />
      {/* Inner face */}
      <ellipse cx="32" cy="34" rx="14" ry="12" fill="#818CF8" />
      {/* Eyes */}
      <ellipse cx="25" cy="30" rx="3" ry="3.5" fill="white" />
      <ellipse cx="39" cy="30" rx="3" ry="3.5" fill="white" />
      <ellipse cx="25" cy="30" rx="1.5" ry="2" fill="#1E1B4B" />
      <ellipse cx="39" cy="30" rx="1.5" ry="2" fill="#1E1B4B" />
      {/* Nose */}
      <path d="M30 35L32 37L34 35" fill="#E0E7FF" />
      {/* Whiskers */}
      <line x1="10" y1="33" x2="22" y2="35" stroke="#C7D2FE" strokeWidth="1" />
      <line x1="10" y1="37" x2="22" y2="37" stroke="#C7D2FE" strokeWidth="1" />
      <line x1="42" y1="35" x2="54" y2="33" stroke="#C7D2FE" strokeWidth="1" />
      <line x1="42" y1="37" x2="54" y2="37" stroke="#C7D2FE" strokeWidth="1" />
      {/* Mouth / smile */}
      <path d="M28 38Q32 42 36 38" stroke="#C7D2FE" strokeWidth="1" fill="none" />
      {/* Receipt/check held at bottom */}
      <rect x="24" y="44" width="16" height="14" rx="1" fill="white" stroke="#A5B4FC" strokeWidth="1" />
      <line x1="27" y1="48" x2="37" y2="48" stroke="#C7D2FE" strokeWidth="1.5" />
      <line x1="27" y1="51" x2="35" y2="51" stroke="#C7D2FE" strokeWidth="1.5" />
      <line x1="27" y1="54" x2="33" y2="54" stroke="#C7D2FE" strokeWidth="1.5" />
      {/* Dollar sign on receipt */}
      <text x="35" y="55" fontSize="6" fill="#6366F1" fontWeight="bold" fontFamily="sans-serif">$</text>
      {/* Tabby stripes on forehead */}
      <path d="M26 22Q32 18 38 22" stroke="#4F46E5" strokeWidth="1.5" fill="none" />
      <path d="M28 25Q32 22 36 25" stroke="#4F46E5" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
