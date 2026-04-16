import { ReactNode } from 'react';

type Variant = 'green' | 'red' | 'gray' | 'orange';

const variantClasses: Record<Variant, string> = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-stone-100 text-stone-600',
  orange: 'bg-orange-100 text-orange-700',
};

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
}

export function Badge({ variant = 'gray', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
