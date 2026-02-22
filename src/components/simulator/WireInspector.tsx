import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Wire } from './types';

interface WireInspectorProps {
  wire: Wire;
  onDelete: (wireId: string) => void;
  onResetRoute: (wireId: string) => void;
}

export function WireInspector({ wire, onDelete, onResetRoute }: WireInspectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">Wire</div>
        <div className="text-xs text-muted-foreground">ID: {wire.id}</div>
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          <div><strong>From:</strong> {wire.from.componentId}:{wire.from.pinId}</div>
          <div><strong>To:</strong> {wire.to.componentId}:{wire.to.pinId}</div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <Label className="text-xs">Actions</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResetRoute(wire.id)}
              title="Re-route wire with orthogonal path"
            >
              Reset route
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(wire.id)}
              title="Delete wire"
            >
              Delete wire
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
