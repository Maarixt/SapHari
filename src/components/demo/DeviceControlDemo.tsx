import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GpioSwitch } from '@/components/widgets/GpioSwitch';
import { LedIndicator } from '@/components/widgets/LedIndicator';
import { TempMini } from '@/components/widgets/TempMini';
import { DevicePresence } from '@/components/widgets/DevicePresence';
import { SensorDisplay } from '@/components/widgets/SensorDisplay';
import { GpioStatus } from '@/components/widgets/GpioStatus';
import { DeviceStore } from '@/state/deviceStore';
import { useAllDevices } from '@/hooks/useDeviceStore';

interface DeviceControlDemoProps {
  onBack?: () => void;
}

export function DeviceControlDemo({ onBack }: DeviceControlDemoProps) {
  const devices = useAllDevices();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 mb-4">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="btn-outline-enhanced">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        <h2 className="text-lg font-semibold">Device Control Demo</h2>
      </div>
      
      <div className="bg-neutral-900 rounded-lg p-4">
        <p className="text-sm text-neutral-400 mb-4">
          This demo shows the ghost toggle prevention system. Toggle switches and watch how:
        </p>
        <ul className="text-sm text-neutral-400 space-y-1 mb-4">
          <li>• Switches show optimistic state immediately (responsive UX)</li>
          <li>• Final state comes from device-reported state (authoritative)</li>
          <li>• If device is offline, switches are disabled</li>
          <li>• If command fails/timeouts, optimistic state reverts</li>
          <li>• All widgets automatically reflect device state changes</li>
          <li>• Alerts fire only on reported state changes (not UI clicks)</li>
        </ul>
      </div>

      {Object.keys(devices).length === 0 ? (
        <div className="text-center py-8 text-neutral-400">
          <p>No devices connected yet.</p>
          <p className="text-sm mt-2">Connect an ESP32 device to see the demo in action.</p>
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).simulateDeviceFlow) {
                  (window as any).simulateDeviceFlow();
                }
              }}
              className="btn-outline-enhanced"
            >
              🧪 Run Simulation
            </Button>
            <p className="text-xs mt-2 text-neutral-500">
              Click to simulate a device flow without hardware
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(devices).map(([deviceId, device]) => (
            <div key={deviceId} className="bg-neutral-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">{deviceId}</h3>
                <DevicePresence deviceId={deviceId} />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-neutral-400">
                  Last seen: {new Date(device.lastSeen).toLocaleTimeString()}
                </p>
                
                {/* Reactive Widgets Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-neutral-300">Reactive Widgets</h4>
                  
                  {/* Temperature Display */}
                  <div className="flex items-center gap-4">
                    <TempMini deviceId={deviceId} />
                    <SensorDisplay deviceId={deviceId} sensorKey="humidity" label="Humidity" unit="%" />
                    <SensorDisplay deviceId={deviceId} sensorKey="pressure" label="Pressure" unit=" hPa" precision={0} />
                  </div>
                  
                  {/* LED Indicators for GPIO pins */}
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-neutral-400">LEDs:</span>
                    {[2, 4, 5, 12].map(pin => (
                      <div key={pin} className="flex items-center gap-1">
                        <LedIndicator deviceId={deviceId} pin={pin} />
                        <span className="text-xs text-neutral-500">{pin}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* GPIO Status */}
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-400">GPIO Status:</span>
                    <div className="flex gap-4 flex-wrap">
                      {[2, 4, 5, 12, 13, 14, 15, 16].map(pin => (
                        <GpioStatus key={pin} deviceId={deviceId} pin={pin} />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Control Switches */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-neutral-300">Control Switches</h4>
                  <div className="flex gap-2 flex-wrap">
                    {[2, 4, 5, 12, 13, 14, 15, 16].map(pin => (
                      <GpioSwitch key={pin} deviceId={deviceId} pin={pin} />
                    ))}
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-neutral-500">
                  <p>GPIO States: {JSON.stringify(device.gpio)}</p>
                  <p>Sensors: {JSON.stringify(device.sensors)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
