import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: any;
  onUpdate: (updates: any) => void;
}

export const EditWidgetDialog = ({ open, onOpenChange, widget, onUpdate }: EditWidgetDialogProps) => {
  const { toast } = useToast();
  const [label, setLabel] = useState(widget.label);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('widgets')
        .update({ label })
        .eq('id', widget.id);
      
      if (error) throw error;
      
      onUpdate({ label });
      onOpenChange(false);
      toast({ title: "Widget updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Widget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <Button type="submit">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};