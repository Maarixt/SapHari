// src/components/simulator/icons/ComponentIcons.tsx
import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

// Category Icons
export const InputDevicesIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const OutputDevicesIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 12L12 8L16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const PowerSupplyIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M7 6V4C7 3.4 7.4 3 8 3H16C16.6 3 17 3.4 17 4V6" stroke="currentColor" strokeWidth="2"/>
    <path d="M10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
  </svg>
);

export const ConnectionIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="8" cy="12" r="2" fill="currentColor"/>
    <circle cx="16" cy="12" r="2" fill="currentColor"/>
  </svg>
);

// Input Device Icons
export const PushButtonIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
    <path d="M4 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const ToggleSwitchIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="8" width="20" height="8" rx="4" stroke="currentColor" strokeWidth="2"/>
    <circle cx="8" cy="12" r="3" fill="currentColor"/>
    <path d="M2 4H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 4H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const PotentiometerIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 10L12 6L16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <path d="M4 10H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const LDRIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 8L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 8L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <path d="M4 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const PIRSensorIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 9V12L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 10H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const UltrasonicIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="8" width="16" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 4V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 4V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 16V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 16V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="8" cy="12" r="1" fill="currentColor"/>
    <circle cx="16" cy="12" r="1" fill="currentColor"/>
  </svg>
);

export const TouchSensorIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M10 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 16H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 10H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const IRReceiverIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M2 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <path d="M8 8L16 16" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M16 8L8 16" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

export const MicrophoneIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 1C10.3 1 9 2.3 9 4V12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12V4C15 2.3 13.7 1 12 1Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M19 10V12C19 16.4 15.4 20 11 20H13C17.4 20 21 16.4 21 12V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 20V24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 24H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 10H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const JoystickIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="8" width="16" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
    <path d="M4 6H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Output Device Icons
export const LEDIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="4" fill="currentColor"/>
    <path d="M4 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const RGBLEDIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="4" fill="url(#rgbGradient)"/>
    <path d="M4 8H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="rgbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff0000"/>
        <stop offset="33%" stopColor="#00ff00"/>
        <stop offset="66%" stopColor="#0000ff"/>
        <stop offset="100%" stopColor="#ff00ff"/>
      </linearGradient>
    </defs>
  </svg>
);

export const BuzzerIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
    <path d="M4 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 4L10 6L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 4L14 6L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const RelayIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 18V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 18V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <path d="M4 10H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 14H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const DCMotorIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="8" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 9V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const ServoIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="8" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 2V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 6L12 2L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 10H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 14H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const StepperIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 8H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const LCDDisplayIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="6" y="8" width="12" height="8" rx="1" fill="currentColor" opacity="0.3"/>
    <path d="M8 10H16" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M8 12H16" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M8 14H16" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M4 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 4H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const OLEDDisplayIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="5" y="7" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="7" y="9" width="10" height="6" rx="1" fill="currentColor" opacity="0.3"/>
    <path d="M9 11H15" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M9 13H15" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M5 5H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 5H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const SevenSegmentIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 6H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 18H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 12V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 12V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const NeoPixelIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="8" width="16" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="16" cy="12" r="1.5" fill="currentColor"/>
    <path d="M4 6H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Power Supply Icons
export const BatteryPackIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M20 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 2H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 2H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const USBPowerIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="8" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 16V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 16V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 2H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 2H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const BreadboardPowerIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M6 8H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 10H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 12H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 14H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 16H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 2H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 2H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const VoltageRegulatorIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 8H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const JumperWiresIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 12L20 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="4" cy="12" r="2" fill="currentColor"/>
    <circle cx="20" cy="12" r="2" fill="currentColor"/>
    <path d="M2 8H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 8H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M2 16H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 16H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Connection & Interface Icons
export const BreadboardIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 6H20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M4 8H20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M4 10H20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M4 12H20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M4 14H20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M4 16H20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M4 18H20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M6 4V20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M8 4V20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M10 4V20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M12 4V20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M14 4V20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M16 4V20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M18 4V20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

export const ESP32BoardIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="6" y="8" width="12" height="8" rx="1" fill="currentColor" opacity="0.1"/>
    <path d="M8 10H16" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M8 12H16" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <path d="M8 14H16" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <circle cx="6" cy="10" r="1" fill="currentColor"/>
    <circle cx="6" cy="12" r="1" fill="currentColor"/>
    <circle cx="6" cy="14" r="1" fill="currentColor"/>
    <circle cx="18" cy="10" r="1" fill="currentColor"/>
    <circle cx="18" cy="12" r="1" fill="currentColor"/>
    <circle cx="18" cy="14" r="1" fill="currentColor"/>
    <path d="M4 2H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 2H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const I2CExpanderIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 8H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 16H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="6" cy="10" r="1" fill="currentColor"/>
    <circle cx="6" cy="14" r="1" fill="currentColor"/>
    <circle cx="18" cy="10" r="1" fill="currentColor"/>
    <circle cx="18" cy="14" r="1" fill="currentColor"/>
    <path d="M4 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 4H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const SPIInterfaceIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 8H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 16H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="6" cy="9" r="1" fill="currentColor"/>
    <circle cx="6" cy="12" r="1" fill="currentColor"/>
    <circle cx="6" cy="15" r="1" fill="currentColor"/>
    <circle cx="18" cy="9" r="1" fill="currentColor"/>
    <circle cx="18" cy="12" r="1" fill="currentColor"/>
    <circle cx="18" cy="15" r="1" fill="currentColor"/>
    <path d="M4 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 4H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const BluetoothIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6.5 6.5L17.5 17.5L12 23V1L17.5 6.5L6.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 8H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const WiFiIndicatorIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M5 12.55A11 11 0 0 1 12 10C19 10 19 12 19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 15.55A7 7 0 0 1 12 14C16 14 16 15 16 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M11 18.55A3 3 0 0 1 12 18C13 18 13 18 13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="20" r="1" fill="currentColor"/>
    <path d="M4 8H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const USBSerialIcon: React.FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="8" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 16V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 16V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 2H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 2H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M2 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Icon mapping for easy access
export const iconMap = {
  // Categories
  'input': InputDevicesIcon,
  'output': OutputDevicesIcon,
  'power': PowerSupplyIcon,
  'connection': ConnectionIcon,
  
  // Input Devices
  'push-button': PushButtonIcon,
  'toggle-switch': ToggleSwitchIcon,
  'potentiometer': PotentiometerIcon,
  'ldr': LDRIcon,
  'pir-sensor': PIRSensorIcon,
  'ultrasonic': UltrasonicIcon,
  'touch-sensor': TouchSensorIcon,
  'ir-receiver': IRReceiverIcon,
  'microphone': MicrophoneIcon,
  'joystick': JoystickIcon,
  
  // Output Devices
  'led': LEDIcon,
  'rgb-led': RGBLEDIcon,
  'buzzer': BuzzerIcon,
  'relay': RelayIcon,
  'dc-motor': DCMotorIcon,
  'servo': ServoIcon,
  'stepper': StepperIcon,
  'lcd-display': LCDDisplayIcon,
  'oled-display': OLEDDisplayIcon,
  'seven-segment': SevenSegmentIcon,
  'neopixel': NeoPixelIcon,
  
  // Power Supply
  'battery-pack': BatteryPackIcon,
  'usb-power': USBPowerIcon,
  'breadboard-power': BreadboardPowerIcon,
  'voltage-regulator': VoltageRegulatorIcon,
  'jumper-wires': JumperWiresIcon,
  
  // Connection & Interface
  'breadboard': BreadboardIcon,
  'esp32-board': ESP32BoardIcon,
  'i2c-expander': I2CExpanderIcon,
  'spi-interface': SPIInterfaceIcon,
  'bluetooth': BluetoothIcon,
  'wifi-indicator': WiFiIndicatorIcon,
  'usb-serial': USBSerialIcon,
};

export default iconMap;
