interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const colors = [
  'bg-red-400',
  'bg-orange-400',
  'bg-amber-400',
  'bg-green-400',
  'bg-teal-400',
  'bg-blue-400',
  'bg-indigo-400',
  'bg-purple-400',
  'bg-pink-400',
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
      className={`${sizeClasses[size]} ${colorForName(name)} rounded-full flex items-center justify-center text-white font-semibold select-none`}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
