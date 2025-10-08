import { SimComponent } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { COLORS } from './library/parts';

interface InspectorProps {
  selectedComponent?: SimComponent;
  onUpdateComponent: (updates: Partial<SimComponent>) => void;
}

export const Inspector = ({ selectedComponent, onUpdateComponent }: InspectorProps) => {
  if (!selectedComponent) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Inspector</div>
        <p className="text-sm text-muted-foreground">Select a component to edit its properties</p>
      </div>
    );
  }

  const handlePropUpdate = (key: string, value: any) => {
    onUpdateComponent({
      props: {
        ...selectedComponent.props,
        [key]: value
      }
    });
  };

  const renderComponentInspector = () => {
    switch (selectedComponent.type) {
      case 'led':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="led-color">Color</Label>
              <Select
                value={selectedComponent.props?.color || 'red'}
                onValueChange={(value) => handlePropUpdate('color', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map(color => (
                    <SelectItem key={color} value={color}>
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'resistor':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="resistor-ohms">Resistance (Ω)</Label>
              <Input
                id="resistor-ohms"
                type="number"
                value={selectedComponent.props?.ohms || 220}
                onChange={(e) => handlePropUpdate('ohms', parseInt(e.target.value) || 220)}
              />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-3">
            <div>
              <Label>State</Label>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={selectedComponent.props?.pressed ? "default" : "outline"}
                  onClick={() => handlePropUpdate('pressed', !selectedComponent.props?.pressed)}
                >
                  {selectedComponent.props?.pressed ? 'Pressed' : 'Not Pressed'}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'buzzer':
        return (
          <div className="space-y-3">
            <div>
              <Label>State</Label>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={selectedComponent.props?.active ? "default" : "outline"}
                  onClick={() => handlePropUpdate('active', !selectedComponent.props?.active)}
                >
                  {selectedComponent.props?.active ? 'Active' : 'Inactive'}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'pot':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="pot-value">Value (0-4095)</Label>
              <Slider
                id="pot-value"
                min={0}
                max={4095}
                step={1}
                value={[selectedComponent.props?.value || 0]}
                onValueChange={([value]) => handlePropUpdate('value', value)}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {selectedComponent.props?.value || 0} / 4095
              </div>
            </div>
            <div>
              <Label htmlFor="pot-max">Max Value</Label>
              <Input
                id="pot-max"
                type="number"
                value={selectedComponent.props?.max || 4095}
                onChange={(e) => handlePropUpdate('max', parseInt(e.target.value) || 4095)}
              />
            </div>
            <div>
              <Label htmlFor="pot-addr">Address</Label>
              <Input
                id="pot-addr"
                value={selectedComponent.props?.addr || ''}
                onChange={(e) => handlePropUpdate('addr', e.target.value)}
                placeholder="e.g., P1"
              />
            </div>
          </div>
        );

      case 'pir':
        return (
          <div className="space-y-3">
            <div>
              <Label>Motion Detected</Label>
              <Switch
                checked={selectedComponent.props?.motion || false}
                onCheckedChange={(checked) => handlePropUpdate('motion', checked)}
              />
            </div>
            <div>
              <Label htmlFor="pir-sensitivity">Sensitivity</Label>
              <Slider
                id="pir-sensitivity"
                min={0}
                max={1}
                step={0.1}
                value={[selectedComponent.props?.sensitivity || 0.5]}
                onValueChange={([value]) => handlePropUpdate('sensitivity', value)}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {Math.round((selectedComponent.props?.sensitivity || 0.5) * 100)}%
              </div>
            </div>
            <div>
              <Label htmlFor="pir-addr">Address</Label>
              <Input
                id="pir-addr"
                value={selectedComponent.props?.addr || ''}
                onChange={(e) => handlePropUpdate('addr', e.target.value)}
                placeholder="e.g., G1"
              />
            </div>
          </div>
        );

      case 'ultrasonic':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="ultrasonic-distance">Distance (cm)</Label>
              <Slider
                id="ultrasonic-distance"
                min={0}
                max={400}
                step={1}
                value={[selectedComponent.props?.distance || 0]}
                onValueChange={([value]) => handlePropUpdate('distance', value)}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {selectedComponent.props?.distance || 0} cm
              </div>
            </div>
            <div>
              <Label htmlFor="ultrasonic-range">Max Range (cm)</Label>
              <Input
                id="ultrasonic-range"
                type="number"
                value={selectedComponent.props?.range || 400}
                onChange={(e) => handlePropUpdate('range', parseInt(e.target.value) || 400)}
              />
            </div>
            <div>
              <Label htmlFor="ultrasonic-addr">Address</Label>
              <Input
                id="ultrasonic-addr"
                value={selectedComponent.props?.addr || ''}
                onChange={(e) => handlePropUpdate('addr', e.target.value)}
                placeholder="e.g., A1"
              />
            </div>
          </div>
        );

      case 'ds18b20':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="temp-value">Temperature (°C)</Label>
              <Slider
                id="temp-value"
                min={-40}
                max={85}
                step={0.1}
                value={[selectedComponent.props?.temperature || 25]}
                onValueChange={([value]) => handlePropUpdate('temperature', value)}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {selectedComponent.props?.temperature || 25}°C
              </div>
            </div>
            <div>
              <Label htmlFor="temp-unit">Unit</Label>
              <Select
                value={selectedComponent.props?.unit || 'C'}
                onValueChange={(value) => handlePropUpdate('unit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C">Celsius</SelectItem>
                  <SelectItem value="F">Fahrenheit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="temp-addr">Address</Label>
              <Input
                id="temp-addr"
                value={selectedComponent.props?.addr || ''}
                onChange={(e) => handlePropUpdate('addr', e.target.value)}
                placeholder="e.g., T1"
              />
            </div>
          </div>
        );

      case 'servo':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="servo-angle">Angle (0-180°)</Label>
              <Slider
                id="servo-angle"
                min={0}
                max={180}
                step={1}
                value={[selectedComponent.props?.angle || 90]}
                onValueChange={([value]) => handlePropUpdate('angle', value)}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                {selectedComponent.props?.angle || 90}°
              </div>
            </div>
            <div>
              <Label htmlFor="servo-min">Min Angle</Label>
              <Input
                id="servo-min"
                type="number"
                value={selectedComponent.props?.min || 0}
                onChange={(e) => handlePropUpdate('min', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="servo-max">Max Angle</Label>
              <Input
                id="servo-max"
                type="number"
                value={selectedComponent.props?.max || 180}
                onChange={(e) => handlePropUpdate('max', parseInt(e.target.value) || 180)}
              />
            </div>
            <div>
              <Label htmlFor="servo-addr">Address</Label>
              <Input
                id="servo-addr"
                value={selectedComponent.props?.addr || ''}
                onChange={(e) => handlePropUpdate('addr', e.target.value)}
                placeholder="e.g., S1"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No editable properties for this component type.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">{selectedComponent.type.toUpperCase()}</div>
        <div className="text-xs text-muted-foreground">ID: {selectedComponent.id}</div>
      </div>
      
      {renderComponentInspector()}
      
      {/* Quick editing for common components */}
      {selectedComponent.type === 'led' && (
        <div className="pt-3 border-t">
          <div className="text-sm font-medium mb-2">Quick LED Color</div>
          <div className="grid grid-cols-6 gap-1">
            {COLORS.map(c => (
              <button 
                key={c} 
                className={`h-6 border rounded ${selectedComponent.props?.color === c ? 'ring-2 ring-blue-500' : ''}`}
                style={{ background: c }}
                onClick={() => onUpdateComponent({ 
                  props: { ...selectedComponent.props, color: c } 
                })}
              />
            ))}
          </div>
        </div>
      )}

      {selectedComponent.type === 'resistor' && (
        <div className="pt-3 border-t">
          <div className="text-sm font-medium mb-2">Quick Resistance</div>
          <div className="grid grid-cols-3 gap-1">
            {[220, 330, 470, 1e3, 2.2e3, 4.7e3, 10e3, 22e3, 47e3, 100e3].map(ohms => (
              <button
                key={ohms}
                className={`h-6 text-xs border rounded ${selectedComponent.props?.ohms === ohms ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                onClick={() => onUpdateComponent({ 
                  props: { ...selectedComponent.props, ohms } 
                })}
              >
                {ohms >= 1000 ? `${ohms/1000}k` : ohms}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedComponent.type === 'wire' && (
        <div className="pt-3 border-t">
          <div className="text-sm font-medium mb-2">Quick Wire Color</div>
          <div className="grid grid-cols-4 gap-1">
            {COLORS.map(c => (
              <button 
                key={c} 
                className={`h-6 border rounded ${selectedComponent.props?.color === c ? 'ring-2 ring-blue-500' : ''}`}
                style={{ background: c }}
                onClick={() => onUpdateComponent({ 
                  props: { ...selectedComponent.props, color: c } 
                })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="pt-3 border-t">
        <div className="text-xs text-muted-foreground">
          Position: ({Math.round(selectedComponent.x)}, {Math.round(selectedComponent.y)})
        </div>
        <div className="text-xs text-muted-foreground">
          Pins: {selectedComponent.pins.length}
        </div>
      </div>
    </div>
  );
};
