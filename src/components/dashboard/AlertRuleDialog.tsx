import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

interface AlertRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AlertRuleDialog = ({ open, onOpenChange }: AlertRuleDialogProps) => {
  const { toast } = useToast();

  const handleComingSoon = () => {
    toast({
      title: "Feature coming soon",
      description: "Alert rules will be available in a future update."
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alert Rules</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Alert rules coming soon!</p>
            <p className="text-xs mt-1">
              Set up automated notifications based on sensor values.
            </p>
          </div>

          <Button
            onClick={handleComingSoon}
            className="w-full"
            variant="outline"
          >
            Learn More
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};