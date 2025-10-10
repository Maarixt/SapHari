import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeviceWithRole } from '@/lib/types';

interface EditDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: DeviceWithRole;
  onSave: (updates: { id: string; name: string }) => void;
}

export const EditDeviceDialog = ({ open, onOpenChange, device, onSave }: EditDeviceDialogProps) => {
  const [name, setName] = useState(device.name);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ id: device.id, name: name.trim() });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Device</DialogTitle>
          <DialogDescription>
            Update the device name. <strong>Device ID and key cannot be changed after creation</strong> as they are used for device authentication.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device-name">Device Name</Label>
            <Input id="device-name" value={name} onChange={(e)=>setName(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};