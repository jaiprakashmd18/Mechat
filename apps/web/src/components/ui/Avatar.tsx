import Image from 'next/image';
import { cn, getInitials } from '@/lib/utils';
import type { UserStatus } from '@/types';

const SIZE_MAP = { sm: 32, md: 40, lg: 56 } as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZE_MAP;
  status?: UserStatus | null;
  className?: string;
}

export function Avatar({ name, src, size = 'md', status, className }: AvatarProps) {
  const px = SIZE_MAP[size];

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: px, height: px }}>
      {src ? (
        <Image src={src} alt={name} width={px} height={px} className="h-full w-full rounded-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-medium text-white"
          style={{ fontSize: px * 0.4 }}
        >
          {getInitials(name) || '?'}
        </div>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-slate-950',
            status === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600',
          )}
          style={{ width: px * 0.28, height: px * 0.28 }}
        />
      )}
    </div>
  );
}
