import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ size = 'md', withText = true }: { size?: 'sm' | 'md' | 'lg'; withText?: boolean }) {
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 32 : 24;
  const boxSize = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className="flex items-center gap-2.5">
      <div className={cn('flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30', boxSize)}>
        <MessageCircle size={iconSize} strokeWidth={2.25} />
      </div>
      {withText && <span className={cn('font-semibold tracking-tight', textSize)}>MeCHAT</span>}
    </div>
  );
}
