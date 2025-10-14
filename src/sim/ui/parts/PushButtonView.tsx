/**
 * Interactive Push Button View Component
 * Handles mouse, touch, and keyboard interactions
 */

import React, { useRef, useState } from 'react';

interface PushButtonViewProps {
  partId: string;
  onPressChange?: (pressed: boolean) => void;
  pressed?: boolean;
  bouncing?: boolean;
  className?: string;
}

export default function PushButtonView({ 
  partId, 
  onPressChange,
  pressed = false,
  bouncing = false,
  className = ''
}: PushButtonViewProps) {
  const pressedRef = useRef(false);
  const [isPressed, setIsPressed] = useState(pressed);

  const setPressed = (pressed: boolean) => {
    if (pressed === pressedRef.current) return;
    pressedRef.current = pressed;
    setIsPressed(pressed);
    onPressChange?.(pressed);
  };

  const onPointerDown: React.PointerEventHandler = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPressed(true);
  };

  const onPointerUp: React.PointerEventHandler = (e) => {
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
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      className={`
        rounded-xl px-3 py-1 select-none cursor-pointer
        transition-all duration-75 ease-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${currentPressed 
          ? 'bg-emerald-600 shadow-inner transform translate-y-[2px]' 
          : 'bg-slate-700 hover:bg-slate-600 shadow-md'
        }
        ${bouncing ? 'animate-pulse' : ''}
        ${className}
      `}
      title={`Push Button (${partId}) - Hold to keep pressed; Spacebar when focused`}
    >
      <div className="text-white text-xs font-medium text-center">
        PUSH-BUTTON
      </div>
      {bouncing && (
        <div className="text-xs text-yellow-200 text-center mt-1">
          BOUNCING
        </div>
      )}
    </div>
  );
}
