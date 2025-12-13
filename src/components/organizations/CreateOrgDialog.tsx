import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganizations, OrgType } from '@/hooks/useOrganizations';
import { toast } from 'sonner';
import { Building2, Home, Tractor, Briefcase } from 'lucide-react';

interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const orgTypes: { value: OrgType; label: string; icon: React.ReactNode }[] = [
  { value: 'house', label: 'House', icon: <Home className="h-4 w-4" /> },
  { value: 'farm', label: 'Farm', icon: <Tractor className="h-4 w-4" /> },
  { value: 'business', label: 'Business', icon: <Briefcase className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <Building2 className="h-4 w-4" /> },
];

export function CreateOrgDialog({ open, onOpenChange }: CreateOrgDialogProps) {
  const { createOrganization } = useOrganizations();
  const [name, setName] = useState('');
  const [type, setType] = useState<OrgType>('house');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await createOrganization(name.trim(), type);
      toast.success('Organization created successfully');
      onOpenChange(false);
      setName('');
      setType('house');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Create Organization
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              placeholder="My Smart Home"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as OrgType)} disabled={isLoading}>
              <SelectTrigger id="org-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orgTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      {t.icon}
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
