import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppBackgroundProps {
  children: ReactNode;
  className?: string;
}

/**
 * AppBackground - Engineering-themed animated background
 * 
 * Features:
 * - Subtle gradient base (light: white→mint, dark: navy→charcoal)
 * - Animated circuit traces with electric pulse
 * - Rotating gear icons in corners
 * - Respects prefers-reduced-motion
 * - Non-interactive (pointer-events: none)
 */
export function AppBackground({ children, className }: AppBackgroundProps) {
  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)}>
      {/* Base gradient layer */}
      <div 
        className="fixed inset-0 -z-20 bg-gradient-to-br from-background via-background to-primary/5 dark:from-background dark:via-background dark:to-primary/10"
        aria-hidden="true"
      />
      
      {/* Subtle mesh/glow overlay */}
      <div 
        className="fixed inset-0 -z-15 opacity-30 dark:opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 20%, hsl(var(--primary) / 0.08) 0%, transparent 50%),
                           radial-gradient(ellipse at 80% 80%, hsl(var(--primary) / 0.06) 0%, transparent 50%),
                           radial-gradient(ellipse at 50% 50%, hsl(var(--primary) / 0.03) 0%, transparent 70%)`
        }}
        aria-hidden="true"
      />

      {/* Circuit trace overlay */}
      <CircuitOverlay />

      {/* Rotating gears in corners */}
      <GearOverlay />

      {/* Content layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

function CircuitOverlay() {
  return (
    <svg 
      className="fixed inset-0 -z-10 w-full h-full pointer-events-none opacity-[0.06] dark:opacity-[0.08]"
      aria-hidden="true"
    >
      <defs>
        {/* Electric pulse gradient for animation */}
        <linearGradient id="circuit-pulse" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from="-1 0"
            to="1 0"
            dur="3s"
            repeatCount="indefinite"
            className="motion-reduce:hidden"
          />
        </linearGradient>
        
        {/* Static circuit color */}
        <linearGradient id="circuit-static" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Circuit trace paths */}
      <g stroke="url(#circuit-static)" strokeWidth="1" fill="none">
        {/* Top-left circuit cluster */}
        <path d="M 0 100 H 150 V 50 H 300 V 150 H 200" />
        <path d="M 50 0 V 80 H 180 V 200" />
        <path d="M 100 180 H 250 V 80 H 350" />
        
        {/* Top-right circuit cluster */}
        <path d="M 100% 50 H calc(100% - 200px) V 150 H calc(100% - 350px)" />
        <path d="M calc(100% - 100px) 0 V 120 H calc(100% - 250px) V 200" />
        
        {/* Bottom-left circuit cluster */}
        <path d="M 0 calc(100% - 150px) H 200 V calc(100% - 80px) H 400" />
        <path d="M 150 100% V calc(100% - 100px) H 300" />
        
        {/* Bottom-right circuit cluster */}
        <path d="M 100% calc(100% - 100px) H calc(100% - 250px) V calc(100% - 200px)" />
        <path d="M calc(100% - 50px) 100% V calc(100% - 150px) H calc(100% - 200px)" />
      </g>

      {/* Animated pulse overlay - only visible when motion is allowed */}
      <g 
        stroke="url(#circuit-pulse)" 
        strokeWidth="2" 
        fill="none" 
        className="motion-reduce:opacity-0"
        style={{ opacity: 0.4 }}
      >
        <path d="M 0 100 H 150 V 50 H 300 V 150 H 200">
          <animate
            attributeName="stroke-dashoffset"
            from="1000"
            to="0"
            dur="8s"
            repeatCount="indefinite"
          />
        </path>
        <path d="M 100% calc(100% - 100px) H calc(100% - 250px) V calc(100% - 200px)">
          <animate
            attributeName="stroke-dashoffset"
            from="500"
            to="0"
            dur="6s"
            repeatCount="indefinite"
          />
        </path>
      </g>

      {/* Circuit nodes/connection points */}
      <g fill="hsl(var(--primary))" className="opacity-60">
        <circle cx="150" cy="100" r="3" />
        <circle cx="300" cy="50" r="3" />
        <circle cx="200" cy="150" r="3" />
        <circle cx="180" cy="80" r="3" />
        <circle cx="250" cy="180" r="3" />
      </g>
    </svg>
  );
}

function GearOverlay() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Top-left gear */}
      <svg 
        className="absolute -top-20 -left-20 w-64 h-64 text-primary opacity-[0.05] dark:opacity-[0.08] motion-reduce:animate-none animate-spin-slow blur-[0.5px]"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <GearPath />
      </svg>

      {/* Top-right gear */}
      <svg 
        className="absolute -top-16 -right-16 w-48 h-48 text-primary opacity-[0.04] dark:opacity-[0.06] motion-reduce:animate-none animate-spin-slow-reverse blur-[0.5px]"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <GearPath />
      </svg>

      {/* Bottom-left gear */}
      <svg 
        className="absolute -bottom-24 -left-24 w-72 h-72 text-primary opacity-[0.04] dark:opacity-[0.07] motion-reduce:animate-none animate-spin-slow-reverse blur-[0.5px]"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <GearPath />
      </svg>

      {/* Bottom-right gear */}
      <svg 
        className="absolute -bottom-12 -right-12 w-56 h-56 text-primary opacity-[0.05] dark:opacity-[0.08] motion-reduce:animate-none animate-spin-slow blur-[0.5px]"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <GearPath />
      </svg>
    </div>
  );
}

function GearPath() {
  return (
    <path d="M50 10 L54 10 L56 18 L62 16 L66 12 L70 16 L66 22 L68 28 L76 26 L80 30 L76 36 L82 42 L90 40 L92 46 L84 50 L84 54 L92 54 L92 60 L84 60 L82 66 L90 70 L88 76 L80 74 L76 80 L82 86 L78 90 L72 84 L66 88 L68 96 L62 98 L58 90 L54 92 L54 100 L46 100 L46 92 L42 90 L38 98 L32 96 L34 88 L28 84 L22 90 L18 86 L24 80 L20 74 L12 76 L10 70 L18 66 L16 60 L8 60 L8 54 L16 54 L16 50 L8 46 L10 40 L18 42 L24 36 L20 30 L24 26 L32 28 L34 22 L30 16 L34 12 L38 16 L44 18 L46 10 Z M50 35 A15 15 0 1 0 50 65 A15 15 0 1 0 50 35 Z" />
  );
}

export default AppBackground;
