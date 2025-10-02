import { useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditWidgetDialog } from './EditWidgetDialog';

interface Widget {
  id: string;
  type: 'alert';
  label: string;
  address: string;
  pin: number;
  trigger: number;
  message: string;
  state?: any;
}

interface AlertWidgetProps {
  widget: Widget;
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
}

export const AlertWidget = ({ widget, onUpdate, onDelete }: AlertWidgetProps) => {
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('widgets')
        .delete()
        .eq('id', widget.id);

      if (error) throw error;
      onDelete();
    } catch (error) {
      console.error('Error deleting widget:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete widget',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{widget.label}</h3>
            <p className="text-sm text-muted-foreground">
              {widget.address} • GPIO {widget.pin} • {widget.trigger === 1 ? 'HIGH' : 'LOW'}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {widget.message}
      </CardContent>
      <EditWidgetDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        widget={widget}
        onUpdate={onUpdate}
      />
    </Card>
  );
};
