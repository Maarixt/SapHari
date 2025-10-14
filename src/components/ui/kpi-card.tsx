import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "./card";
import { Badge } from "./badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
    period?: string;
  };
  sparkline?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

const KPICard = React.forwardRef<HTMLDivElement, KPICardProps>(
  ({ title, value, icon, trend, sparkline, className, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'border-border/50',
      success: 'border-success/20 bg-success/5',
      warning: 'border-warning/20 bg-warning/5',
      destructive: 'border-destructive/20 bg-destructive/5',
    };

    const iconStyles = {
      default: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      destructive: 'text-destructive',
    };

    const getTrendIcon = () => {
      if (!trend) return null;
      switch (trend.direction) {
        case 'up':
          return <TrendingUp className="h-3 w-3" />;
        case 'down':
          return <TrendingDown className="h-3 w-3" />;
        case 'stable':
          return <Minus className="h-3 w-3" />;
        default:
          return null;
      }
    };

    const getTrendColor = () => {
      if (!trend) return 'text-muted-foreground';
      switch (trend.direction) {
        case 'up':
          return 'text-success';
        case 'down':
          return 'text-destructive';
        case 'stable':
          return 'text-muted-foreground';
        default:
          return 'text-muted-foreground';
      }
    };

    return (
      <Card
        ref={ref}
        className={cn(
          "kpi-card transition-all duration-200 hover:shadow-lg",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <CardHeader className="kpi-card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            {icon && (
              <div className={cn("p-2 rounded-lg bg-muted/50", iconStyles[variant])}>
                {icon}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="kpi-card-value text-3xl font-bold tracking-tight">
            {value}
          </div>
          
          {trend && (
            <div className={cn("kpi-card-trend flex items-center gap-1", getTrendColor())}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {Math.abs(trend.value)}%
              </span>
              {trend.period && (
                <span className="text-xs text-muted-foreground">
                  {trend.period}
                </span>
              )}
            </div>
          )}
          
          {sparkline && (
            <div className="h-12 w-full">
              {sparkline}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

KPICard.displayName = "KPICard";

export { KPICard };
