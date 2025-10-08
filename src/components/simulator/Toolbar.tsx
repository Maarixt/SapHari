import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Save, 
  Download,
  Settings,
  Trash2
} from 'lucide-react';

interface ToolbarProps {
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  onClear?: () => void;
  isRunning?: boolean;
}

export const Toolbar = ({ 
  onPlay, 
  onPause, 
  onStop, 
  onReset, 
  onSave, 
  onExport, 
  onSettings, 
  onClear,
  isRunning = false 
}: ToolbarProps) => {
  return (
    <div className="flex items-center gap-2 p-3 border-b bg-white">
      <div className="flex items-center gap-1">
        {!isRunning ? (
          <Button size="sm" onClick={onPlay}>
            <Play className="w-4 h-4 mr-1" />
            Run
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onPause}>
            <Pause className="w-4 h-4 mr-1" />
            Pause
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onStop}>
          <Square className="w-4 h-4 mr-1" />
          Stop
        </Button>
        <Button size="sm" variant="outline" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={onSave}>
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onExport}>
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>
        <Button size="sm" variant="outline" onClick={onSettings}>
          <Settings className="w-4 h-4 mr-1" />
          Settings
        </Button>
        <Button size="sm" variant="outline" onClick={onClear}>
          <Trash2 className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
};
