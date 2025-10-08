import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Stage, Layer } from 'react-konva';
import { useEffect, useMemo, useRef, useState } from 'react';
import { makeESP32 } from './library/esp32';
import { makeLED, makeResistor, makeButton, makeBuzzer, COLORS } from './library/parts';
import { SimState, SimComponent, Wire } from './types';
import { nanoid } from 'nanoid';
import { useMQTT } from '@/hooks/useMQTT';
import { SimComponentNode } from './SimComponentNode';
import { EnhancedWireNode } from './EnhancedWireNode';
import { EnhancedComponentPalette } from './EnhancedComponentPalette';
import { Inspector } from './Inspector';
import { isPinUsed, canConnectPin } from './helpers';
import { simulateStep, getNetInfo, buildNets } from './engine';
import { useSimulatorMQTT } from './mqttBridge';
import { startLoop } from './runLoop';
import { toast } from 'sonner';
import { saveCircuit, loadCircuits, loadCircuit } from './supabase';
import Editor from '@monaco-editor/react';
import { runSimScript, stopSimScript } from './scriptRuntime';
import { generateSketchFromState } from './sketchGenerator';
import { cleanupBuzzerAudio } from './runLoop';
import { GridBackground } from './GridBackground';

interface SimulatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFullscreen?: boolean;
}

export const SimulatorModal = ({ open, onOpenChange, initialFullscreen = false }: SimulatorModalProps) => {
  const [state, setState] = useState<SimState>({ 
    components: [], 
    wires: [], 
    running: false,
    selectedId: undefined
  });
  const [activeWireStart, setActiveWireStart] = useState<{compId: string; pinId: string} | null>(null);
  const [wireColor, setWireColor] = useState('red');
  const [simId] = useState(() => `sim-${nanoid(8)}`); // Stable simulator ID
  const [tab, setTab] = useState<'sketch' | 'simjs'>('sketch');
  const [simCode, setSimCode] = useState(`// Example Simulator JS
loop(() => {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
});`);
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const stageRef = useRef<any>(null);
  const { publishMessage, onMessage, brokerSettings } = useMQTT();

  // MQTT Bridge
  useSimulatorMQTT(state, setState, simId);

  // Handle component drag end
  const handleComponentDragEnd = (compId: string, x: number, y: number) => {
    // Snap to 10px grid
    const snappedX = Math.round(x / 10) * 10;
    const snappedY = Math.round(y / 10) * 10;
    
    setState(s => ({
      ...s,
      components: s.components.map(c => 
        c.id === compId ? { ...c, x: snappedX, y: snappedY } : c
      )
    }));
  };

  // Component selection and deletion
  const selectComponent = (id: string) => {
    setState(s => ({ 
      ...s, 
      components: s.components.map(c => ({ ...c, selected: c.id === id })) 
    }));
  };

  const deleteComponent = (id: string) => {
    // Clean up buzzer audio for deleted component
    cleanupBuzzerAudio([id]);
    
    setState(s => ({
      ...s,
      components: s.components.filter(c => c.id !== id),
      wires: s.wires.filter(w => w.from.componentId !== id && w.to.componentId !== id)
    }));
  };

  // Wire selection and deletion
  const selectWire = (id: string) => {
    setState(s => ({ 
      ...s, 
      wires: s.wires.map(w => ({ ...w, selected: w.id === id })) 
    }));
  };

  const deleteWire = (id: string) => {
    setState(s => ({ 
      ...s, 
      wires: s.wires.filter(w => w.id !== id) 
    }));
  };

  const addComponent = (component: SimComponent) => {
    setState(s => ({
      ...s,
      components: [...s.components, component]
    }));
  };

  // Start wiring with pin blocking and toast notifications
  const beginWire = (compId: string, pinId: string) => {
    if (activeWireStart && (activeWireStart.compId !== compId || activeWireStart.pinId !== pinId)) {
      // Check if target pin can be connected (allow multiple on power/ground)
      const toComp = state.components.find(c => c.id === compId);
      const toPin = toComp?.pins.find(p => p.id === pinId);
      if (toPin && !canConnectPin(state, compId, pinId)) {
        toast.error(`GPIO pin ${pinId} is already connected!`);
        setActiveWireStart(null);
        return;
      }
      
      // Complete wire
      const newWire: Wire = {
        id: 'w-' + nanoid(6),
        from: activeWireStart,
        to: { componentId: compId, pinId },
        color: wireColor,
        selected: false
      };
      setState(s => ({ ...s, wires: [...s.wires, newWire] }));
      setActiveWireStart(null);
      toast.success(`Wire connected: ${activeWireStart.compId}:${activeWireStart.pinId} → ${compId}:${pinId}`);
    } else {
      // Start a new wire
      setActiveWireStart({ compId, pinId });
    }
  };

  // Initialize demo components
  useEffect(() => {
    if (open && state.components.length === 0) {
      try {
        const esp32 = makeESP32(100, 100);
        const led = makeLED('red', 200, 100);
        setState(s => ({ ...s, components: [esp32, led] }));
      } catch (error) {
        console.error('Failed to initialize demo components:', error);
      }
    }
  }, [open]);

  // Simulation loop
  useEffect(() => {
    if (!state.running) return;
    
    const stopLoop = startLoop(
      () => state,
      setState,
      publishMessage,
      simId
    );
    
    return stopLoop;
  }, [state.running, publishMessage, simId]);

  // Keyboard delete for selected components and wires
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      setState(s => {
        const selComponent = s.components.find(c => c.selected);
        const selWire = s.wires.find(w => w.selected);
        
        if (selComponent) {
          // Delete component and all connected wires
          return {
            ...s,
            components: s.components.filter(c => c.id !== selComponent.id),
            wires: s.wires.filter(w => w.from.componentId !== selComponent.id && w.to.componentId !== selComponent.id)
          };
        }
        
        if (selWire) {
          // Delete selected wire
          return { ...s, wires: s.wires.filter(w => w.id !== selWire.id) };
        }
        
        return s;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Listen for short circuit warnings
  useEffect(() => {
    const onShortCircuit = (e: CustomEvent) => {
      toast.error('⚠️ Short circuit detected! Power and ground connected on same net.');
    };
    window.addEventListener('sim:shortCircuit', onShortCircuit as EventListener);
    return () => window.removeEventListener('sim:shortCircuit', onShortCircuit as EventListener);
  }, []);

  // Save circuit to Supabase
  const saveCircuitToSupabase = async () => {
    try {
      const name = prompt('Enter circuit name:');
      if (!name) return;
      
      await saveCircuit(name, state);
      toast.success(`Circuit "${name}" saved successfully!`);
    } catch (error) {
      console.error('Failed to save circuit:', error);
      toast.error('Failed to save circuit');
    }
  };

  // Load circuit from Supabase
  const loadCircuitFromSupabase = async () => {
    try {
      const circuits = await loadCircuits();
      if (circuits.length === 0) {
        toast.info('No saved circuits found');
        return;
      }
      
      // Show circuit selection dialog (simplified for now)
      const circuitNames = circuits.map(c => c.name);
      const selectedName = prompt(`Select circuit:\n${circuitNames.join('\n')}`);
      
      if (selectedName) {
        const selectedCircuit = circuits.find(c => c.name === selectedName);
        if (selectedCircuit) {
          setState(s => ({
            ...s,
            components: selectedCircuit.json.components || [],
            wires: selectedCircuit.json.wires || []
          }));
          // Restore wire color from the first wire if available
          if (selectedCircuit.json.wires && selectedCircuit.json.wires.length > 0) {
            setWireColor(selectedCircuit.json.wires[0].color);
          }
          toast.success(`Circuit "${selectedName}" loaded successfully!`);
        }
      }
    } catch (error) {
      toast.error(`Failed to load circuits: ${error}`);
    }
  };

  // Connect to MQTT
  const connectMQTT = () => {
    if (brokerSettings.connected) {
      console.log(`Simulator ${simId} connected to MQTT`);
      // Publish initial status
      publishMessage(`saphari/${simId}/status/online`, '1', { retain: true });
    } else {
      console.log('Connecting to MQTT...');
      // MQTT connection logic would go here
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isFullscreen ? "max-w-none w-screen h-screen p-0 overflow-hidden" : "max-w-[1100px] h-[80vh] p-0 overflow-hidden"}>
        <DialogHeader className="px-4 py-2 border-b flex items-center justify-between">
          <DialogTitle>ESP32 Circuit Simulator</DialogTitle>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            >
              {leftSidebarOpen ? 'Hide Parts' : 'Show Parts'}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            >
              {rightSidebarOpen ? 'Hide Code' : 'Show Code'}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* Left Toolbar */}
          {leftSidebarOpen && (
            <EnhancedComponentPalette
              onAddComponent={addComponent}
              wireColor={wireColor}
              onWireColorChange={setWireColor}
              onRunToggle={() => setState(s => ({ ...s, running: !s.running }))}
              running={state.running}
              selectedComponent={state.components.find(c => c.selected)}
              onUpdateComponent={(updates) => {
                setState(s => ({
                  ...s,
                  components: s.components.map(c => 
                    c.selected ? { ...c, ...updates } : c
                  )
                }));
              }}
            />
          )}

          {/* Canvas */}
          <div className="flex-1 relative min-h-0">
            <Stage
              ref={stageRef}
              width={isFullscreen ? window.innerWidth - (leftSidebarOpen ? 192 : 0) - (rightSidebarOpen ? 384 : 0) : 600} 
              height={isFullscreen ? window.innerHeight - 120 : window.innerHeight * 0.7} 
              className="bg-neutral-900"
              onClick={(e) => {
                // Deselect components and wires when clicking on empty space
                if (e.target === e.target.getStage()) {
                  setState(s => ({
                    ...s,
                    components: s.components.map(c => ({ ...c, selected: false })),
                    wires: s.wires.map(w => ({ ...w, selected: false }))
                  }));
                }
              }}
            >
              <Layer>
                {/* Grid Background */}
                <GridBackground 
                  width={isFullscreen ? window.innerWidth - (leftSidebarOpen ? 192 : 0) - (rightSidebarOpen ? 384 : 0) : 600}
                  height={isFullscreen ? window.innerHeight - 120 : window.innerHeight * 0.7}
                  gridSize={20}
                  color="#374151"
                />
                
                {/* Components */}
                {state.components.map(c => (
                  <SimComponentNode 
                    key={c.id} 
                    comp={c} 
                    onPinClick={beginWire}
                    onSelect={selectComponent}
                    onDelete={deleteComponent}
                    onDragEnd={handleComponentDragEnd}
                  />
                ))}

                {/* Wires */}
                {state.wires.map(w => (
                  <EnhancedWireNode 
                    key={w.id} 
                    wire={w} 
                    state={state} 
                    onSelect={selectWire}
                    onDelete={deleteWire}
                    isValidConnection={true}
                  />
                ))}
              </Layer>
            </Stage>
          </div>

          {/* Right Coding Panel */}
          {rightSidebarOpen && (
            <div className="w-96 border-l flex flex-col h-full">
              {/* Fixed Tab Header */}
              <div className="flex border-b bg-muted/30">
                <button 
                  className={`px-3 py-2 text-sm flex-1 ${tab === 'sketch' ? 'bg-muted border-b-2 border-primary' : ''}`} 
                  onClick={() => setTab('sketch')}
                >
                  Sketch
                </button>
                <button 
                  className={`px-3 py-2 text-sm flex-1 ${tab === 'simjs' ? 'bg-muted border-b-2 border-primary' : ''}`} 
                  onClick={() => setTab('simjs')}
                >
                  Simulator JS
                </button>
              </div>
              
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 hover:scrollbar-thumb-gray-500">
                {tab === 'sketch' ? (
                  <div className="p-3">
                    <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{generateSketchFromState(state)}</pre>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex-1">
                      <Editor
                        height="100%"
                        defaultLanguage="javascript"
                        value={simCode}
                        onChange={(v) => setSimCode(v ?? '')}
                        options={{ 
                          minimap: { enabled: false }, 
                          fontSize: 12,
                          scrollBeyondLastLine: false,
                          automaticLayout: true
                        }}
                      />
                    </div>
                    <div className="p-2 border-t bg-muted/30">
                      <Button size="sm" onClick={() => runSimScript(simCode)}>Run Script</Button>
                      <Button size="sm" variant="outline" className="ml-2" onClick={stopSimScript}>Stop</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-3 flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveCircuitToSupabase}>Save</Button>
            <Button size="sm" variant="outline" onClick={loadCircuitFromSupabase}>Load</Button>
            <Button size="sm" variant="outline" onClick={connectMQTT}>
              Connect to MQTT
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {state.components.length} components, {state.wires.length} wires
            {state.components.some(c => c.selected) && (
              <div className="text-xs mt-1 text-blue-500">
                {state.components.filter(c => c.selected).length} component(s) selected - Press Delete to remove
              </div>
            )}
            {state.wires.some(w => w.selected) && (
              <div className="text-xs mt-1 text-red-500">
                {state.wires.filter(w => w.selected).length} wire(s) selected - Press Delete to remove
              </div>
            )}
            {state.running && (
              <div className="text-xs mt-1">
                Simulator ID: {simId}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};