import { useState } from 'react';
import { Settings, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditWidgetDialog } from './EditWidgetDialog';
import { Widget } from '@/lib/types';

interface AlertWidgetProps {
  widget: Widget;
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
}

export const AlertWidget = ({ widget, onUpdate, onDelete }: AlertWidgetProps) => {
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const isTriggered = widget.state?.triggered || false;
  const lastTrigger = widget.state?.lastTrigger;
  const triggerLabel = widget.trigger === 1 ? 'Rising' : widget.trigger === 0 ? 'Falling' : undefined;

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this alert widget?')) return;

    try {
      const { error } = await supabase
        .from('widgets')
        .delete()
        .eq('id', widget.id);

      if (error) throw error;
      onDelete();
      toast({
        title: "Widget deleted",
        description: "Alert widget has been removed"
      });
    } catch (error: unknown) {
      console.error('Error deleting alert widget:', error);
      const description = error instanceof Error ? error.message : 'Failed to delete widget';
      toast({
        title: "Error",
        description,
        variant: "destructive"
      });
    }
  };

  const handleAcknowledge = () => {
    const updatedState = { ...widget.state, triggered: false };
    onUpdate({
      state: updatedState
    });

    supabase
      .from('widgets')
      .update({ state: updatedState })
      .eq('id', widget.id)
      .then(({ error }) => {
        if (error) {
          console.error('Error acknowledging alert:', error);
          toast({
            title: "Error",
            description: "Failed to acknowledge alert",
            variant: "destructive"
          });
        }
      });
  };

  return (
    <>
      <Card className={`bg-card border ${isTriggered ? 'border-red-500 bg-red-50 dark:bg-red-950' : 'border-iot-border'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium text-iot-text">{widget.label}</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-8 w-8 p-0 text-iot-muted hover:text-iot-text"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-iot-muted hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              <AlertTriangle 
                className={`h-8 w-8 ${isTriggered ? 'text-red-500' : 'text-iot-muted'}`}
              />
            </div>
            
            <div className="text-center">
              <Badge variant={isTriggered ? "destructive" : "secondary"}>
                {isTriggered ? "ALERT" : "OK"}
              </Badge>
            </div>

            {widget.message && (
              <div className="text-sm text-center text-iot-muted">
                {widget.message}
              </div>
            )}

            {isTriggered && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleAcknowledge}
                className="w-full"
              >
                Acknowledge
              </Button>
            )}

            {lastTrigger && (
              <div className="text-xs text-iot-muted text-center">
                Last: {new Date(lastTrigger).toLocaleString()}
              </div>
            )}
            
            <div className="text-xs text-iot-muted text-center flex flex-wrap justify-center gap-x-2 gap-y-1">
              <span>{widget.address}</span>
              {typeof widget.pin === 'number' && (
                <>
                  <span>•</span>
                  <span>GPIO {widget.pin}</span>
                </>
              )}
              {triggerLabel && (
                <>
                  <span>•</span>
                  <span>Trigger: {triggerLabel}</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <EditWidgetDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        widget={widget}
        onUpdate={onUpdate}
      />
    </>
  );
};