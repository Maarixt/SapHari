import { cn } from "@/lib/utils";
import { Wifi, WifiOff, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  className?: string;
}

export const ConnectionStatus = ({ status, className }: ConnectionStatusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'connecting':
        return {
          icon: Loader2,
          text: 'Connecting...',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'Connection Error',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          icon: WifiOff,
          text: 'Disconnected',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon 
        className={cn(
          "h-3 w-3",
          status === 'connecting' && "animate-spin"
        )} 
      />
      {config.text}
    </Badge>
  );
};
