interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

// Warm color pool — no cool blues or grays
const colors = [
  'bg-orange-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-pink-400',
  'bg-teal-500',
  'bg-violet-400',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-indigo-400',
];

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

function colorForName(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length]!;
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} ${colorForName(name)} rounded-full flex items-center justify-center text-white font-semibold select-none shrink-0`}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
