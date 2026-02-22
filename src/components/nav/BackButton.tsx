import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

function getFallbackForPathname(pathname: string): string {
  if (pathname.startsWith('/app/devices')) return '/app/devices';
  if (pathname.startsWith('/app/settings')) return '/app/settings';
  if (pathname.startsWith('/app/alerts')) return '/app/alerts';
  if (pathname.startsWith('/app/org')) return '/app/org/members';
  if (pathname.startsWith('/app/automations')) return '/app/automations';
  if (pathname.startsWith('/master/feedback') || pathname.startsWith('/master/qa')) return '/master';
  if (pathname.startsWith('/app')) return '/app/devices';
  return '/app/devices';
}

interface BackButtonProps {
  fallback?: string;
  onBack?: () => void;
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function BackButton({
  fallback,
  onBack,
  children,
  className,
  variant = 'ghost',
  size = 'sm',
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const resolvedFallback = fallback ?? getFallbackForPathname(location.pathname);

  const handleClick = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(resolvedFallback, { replace: true });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {children ?? 'Back'}
    </Button>
  );
}
