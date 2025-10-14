/**
 * Interactive 4-Leg Tactile Switch View Component
 * Handles mouse, touch, and keyboard interactions with visual feedback
 */

import React, { useRef, useState } from 'react';

interface TactSwitch4ViewProps {
  partId: string;
  onPressChange?: (pressed: boolean) => void;
  pressed?: boolean;
  bouncing?: boolean;
  className?: string;
}

export default function TactSwitch4View({ 
  partId, 
  onPressChange,
  pressed = false,
  bouncing = false,
  className = ''
}: TactSwitch4ViewProps) {
  const pressedRef = useRef(false);
  const [isPressed, setIsPressed] = useState(pressed);

  const setPressed = (p: boolean) => {
    if (p === pressedRef.current) return;
    pressedRef.current = p;
    setIsPressed(p);
    onPressChange?.(p);
  };

  const down: React.PointerEventHandler = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPressed(true);
  };

  const up: React.PointerEventHandler = (e) => {
    setPressed(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onPointerLeave: React.PointerEventHandler = (e) => {
    setPressed(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown: React.KeyboardEventHandler = (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      setPressed(true);
    }
  };

  const onKeyUp: React.KeyboardEventHandler = (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      setPressed(false);
    }
  };

  const currentPressed = isPressed || pressed;

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      className={`
        h-8 w-14 rounded-xl flex items-center justify-center relative
        transition-all duration-75 ease-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${currentPressed 
          ? 'bg-emerald-600 shadow-inner transform translate-y-[1px]' 
          : 'bg-slate-700 hover:bg-slate-600 shadow-md'
        }
        ${bouncing ? 'animate-pulse' : ''}
        ${className}
      `}
      title={`Tactile Switch (${partId}) - Press/hold or Spacebar when focused`}
    >
      <div className="text-white text-[10px] font-medium text-center">
        PUSH-BTN
      </div>
      {bouncing && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
      )}
    </div>
  );
}
