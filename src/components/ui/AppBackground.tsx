import { ReactNode, useState, useEffect } from 'react';
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
      {/* Base gradient layer - mint/teal theme */}
      <div 
        className="fixed inset-0 -z-50"
        style={{
          background: `
            linear-gradient(135deg, 
              hsl(var(--background)) 0%, 
              hsl(168 76% 97%) 30%, 
              hsl(199 89% 96%) 60%, 
              hsl(var(--background)) 100%
            )
          `
        }}
        aria-hidden="true"
      />
      
      {/* Dark mode gradient overlay */}
      <div 
        className="fixed inset-0 -z-50 dark:block hidden"
        style={{
          background: `
            linear-gradient(135deg, 
              hsl(222 47% 7%) 0%, 
              hsl(222 47% 9%) 30%, 
              hsl(199 80% 12%) 60%, 
              hsl(222 47% 7%) 100%
            )
          `
        }}
        aria-hidden="true"
      />
      
      {/* Subtle mesh/glow overlay - Teal/Mint themed */}
      <div 
        className="fixed inset-0 -z-40 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 10% 20%, hsl(168 76% 50% / 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 90% 80%, hsl(199 89% 48% / 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, hsl(168 76% 50% / 0.04) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, hsl(214 100% 50% / 0.04) 0%, transparent 40%)
          `
        }}
        aria-hidden="true"
      />
      
      {/* Dark mode glow overlay */}
      <div 
        className="fixed inset-0 -z-40 pointer-events-none dark:block hidden"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 10% 20%, hsl(168 76% 40% / 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 90% 80%, hsl(199 89% 48% / 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, hsl(168 76% 40% / 0.08) 0%, transparent 60%)
          `
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
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { w, h } = size;
  const p30x = 0.3 * w;
  const p40x = 0.4 * w;
  const p60x = 0.6 * w;
  const p70x = 0.7 * w;
  const p30y = 0.3 * h;
  const p40y = 0.4 * h;
  const p60y = 0.6 * h;
  const p70y = 0.7 * h;

  return (
    <svg 
      className="fixed inset-0 -z-30 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        {/* Electric pulse gradient for animation - Teal/Mint theme */}
        <linearGradient id="circuit-pulse-teal" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(168 76% 50%)" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(168 76% 50%)" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(168 76% 50%)" stopOpacity="0" />
        </linearGradient>
        
        {/* Static circuit color - Teal/Mint */}
        <linearGradient id="circuit-static-teal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(168 76% 50%)" stopOpacity="0.3" />
          <stop offset="50%" stopColor="hsl(199 89% 48%)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="hsl(168 76% 50%)" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Static circuit trace paths - numbers only (no calc/%) */}
      <g 
        stroke="url(#circuit-static-teal)" 
        strokeWidth="1.5" 
        fill="none"
        className="opacity-[0.12] dark:opacity-[0.18]"
      >
        {/* Top-left circuit cluster */}
        <path d="M 0 80 H 120 V 40 H 280 V 120 H 180" strokeDasharray="8 4" />
        <path d="M 40 0 V 60 H 160 V 180" strokeDasharray="12 6" />
        <path d="M 80 160 H 220 V 70 H 320" strokeDasharray="6 3" />
        
        {/* Top-right circuit cluster */}
        <path d={`M ${w} 40 H ${w - 180} V 130 H ${w - 320}`} strokeDasharray="10 5" />
        <path d={`M ${w - 80} 0 V 100 H ${w - 220} V 180`} strokeDasharray="8 4" />
        <path d={`M ${w - 60} 200 H ${w - 280} V 60`} strokeDasharray="6 3" />
        
        {/* Bottom-left circuit cluster */}
        <path d={`M 0 ${h - 120} H 180 V ${h - 60} H 360`} strokeDasharray="12 6" />
        <path d={`M 120 ${h} V ${h - 80} H 280`} strokeDasharray="8 4" />
        <path d={`M 60 ${h - 200} H 240 V ${h - 100}`} strokeDasharray="6 3" />
        
        {/* Bottom-right circuit cluster */}
        <path d={`M ${w} ${h - 80} H ${w - 220} V ${h - 180}`} strokeDasharray="10 5" />
        <path d={`M ${w - 40} ${h} V ${h - 130} H ${w - 180}`} strokeDasharray="8 4" />
        
        {/* Center diagonal traces */}
        <path d={`M ${p30x} ${p30y} L ${p40x} ${p40y} H ${p60x} L ${p70x} ${p30y}`} strokeDasharray="15 8" />
        <path d={`M ${p30x} ${p70y} L ${p40x} ${p60y} H ${p60x} L ${p70x} ${p70y}`} strokeDasharray="15 8" />
      </g>

      {/* Animated pulse overlay - only visible when motion is allowed */}
      <g 
        fill="none" 
        className="motion-reduce:hidden"
      >
        <path 
          d="M 0 80 H 120 V 40 H 280 V 120 H 180"
          stroke="hsl(168 76% 50%)"
          strokeWidth="2"
          strokeDasharray="20 180"
          className="opacity-40 dark:opacity-60"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="200"
            to="0"
            dur="4s"
            repeatCount="indefinite"
          />
        </path>
        <path 
          d={`M ${w} ${h - 80} H ${w - 220} V ${h - 180}`}
          stroke="hsl(199 89% 48%)"
          strokeWidth="2"
          strokeDasharray="15 150"
          className="opacity-40 dark:opacity-60"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="165"
            dur="5s"
            repeatCount="indefinite"
          />
        </path>
        <path 
          d={`M ${p30x} ${p30y} L ${p40x} ${p40y} H ${p60x} L ${p70x} ${p30y}`}
          stroke="hsl(168 76% 50%)"
          strokeWidth="2"
          strokeDasharray="10 120"
          className="opacity-30 dark:opacity-50"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="130"
            to="0"
            dur="6s"
            repeatCount="indefinite"
          />
        </path>
      </g>

      {/* Circuit nodes/connection points - Teal themed */}
      <g className="opacity-20 dark:opacity-30">
        <circle cx="120" cy="80" r="4" fill="hsl(168 76% 50%)" />
        <circle cx="280" cy="40" r="4" fill="hsl(199 89% 48%)" />
        <circle cx="180" cy="120" r="3" fill="hsl(168 76% 50%)" />
        <circle cx="160" cy="60" r="3" fill="hsl(199 89% 48%)" />
        <circle cx="220" cy="160" r="4" fill="hsl(168 76% 50%)" />
        <circle cx={p40x} cy={p40y} r="5" fill="hsl(168 76% 50%)" />
        <circle cx={p60x} cy={p40y} r="5" fill="hsl(199 89% 48%)" />
      </g>
    </svg>
  );
}

function GearOverlay() {
  return (
    <div className="fixed inset-0 -z-20 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Top-left gear - larger */}
      <svg 
        className="absolute -top-24 -left-24 w-80 h-80 text-teal-500 opacity-[0.06] dark:opacity-[0.10] motion-reduce:animate-none animate-spin-slow blur-[1px]"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <GearPath />
      </svg>

      {/* Top-right gear */}
      <svg 
        className="absolute -top-20 -right-20 w-56 h-56 text-cyan-500 opacity-[0.05] dark:opacity-[0.08] motion-reduce:animate-none animate-spin-slow-reverse blur-[0.5px]"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <GearPath />
      </svg>

      {/* Bottom-left gear */}
      <svg 
        className="absolute -bottom-28 -left-28 w-96 h-96 text-teal-600 opacity-[0.05] dark:opacity-[0.09] motion-reduce:animate-none animate-spin-slow-reverse blur-[1px]"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <GearPath />
      </svg>

      {/* Bottom-right gear */}
      <svg 
        className="absolute -bottom-16 -right-16 w-64 h-64 text-cyan-600 opacity-[0.06] dark:opacity-[0.10] motion-reduce:animate-none animate-spin-slow blur-[0.5px]"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <GearPath />
      </svg>
      
      {/* Center-left small gear */}
      <svg 
        className="absolute top-1/3 -left-8 w-32 h-32 text-teal-400 opacity-[0.04] dark:opacity-[0.07] motion-reduce:animate-none animate-spin-slow blur-[0.5px]"
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
