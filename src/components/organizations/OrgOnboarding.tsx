import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganizations, OrgType } from '@/hooks/useOrganizations';
import { toast } from 'sonner';
import { Building2, Home, Tractor, Briefcase, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PendingInvites } from './PendingInvites';

const orgTypes: { value: OrgType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'house', label: 'House', description: 'Smart home automation', icon: <Home className="h-8 w-8" /> },
  { value: 'farm', label: 'Farm', description: 'Agricultural monitoring', icon: <Tractor className="h-8 w-8" /> },
  { value: 'business', label: 'Business', description: 'Commercial IoT', icon: <Briefcase className="h-8 w-8" /> },
  { value: 'other', label: 'Other', description: 'Custom project', icon: <Building2 className="h-8 w-8" /> },
];

export function OrgOnboarding() {
  const { createOrganization, pendingInvites } = useOrganizations();
  const [step, setStep] = useState<'type' | 'name'>('type');
  const [selectedType, setSelectedType] = useState<OrgType | null>(null);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTypeSelect = (type: OrgType) => {
    setSelectedType(type);
    setStep('name');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !name.trim()) return;

    setIsLoading(true);
    try {
      await createOrganization(name.trim(), selectedType);
      toast.success('Organization created! Let\'s add your first device.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Pending invites */}
        {pendingInvites.length > 0 && <PendingInvites />}

        {/* Main onboarding card */}
        <Card className="border-2">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to SapHari</CardTitle>
            <CardDescription className="text-base">
              Create your first organization to start managing your IoT devices
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'type' ? (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {orgTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleTypeSelect(type.value)}
                    className={cn(
                      "p-6 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5",
                      "flex flex-col items-center gap-3 text-center"
                    )}
                  >
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                      {type.icon}
                    </div>
                    <div>
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-6 mt-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  {orgTypes.find(t => t.value === selectedType)?.icon}
                  <div>
                    <div className="font-medium capitalize">{selectedType}</div>
                    <div className="text-sm text-muted-foreground">
                      {orgTypes.find(t => t.value === selectedType)?.description}
                    </div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('type')}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('type')}
                    >
                      Change
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    placeholder={selectedType === 'house' ? 'My Smart Home' : 'Enter a name...'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                    className="text-lg h-12"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={!name.trim() || isLoading}
                >
                  {isLoading ? 'Creating...' : (
                    <>
                      Create Organization
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
