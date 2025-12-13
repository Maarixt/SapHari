import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Building2, Home, Tractor, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOrganizations, Organization, OrgType } from '@/hooks/useOrganizations';
import { CreateOrgDialog } from './CreateOrgDialog';

const typeIcons: Record<OrgType, React.ReactNode> = {
  house: <Home className="h-4 w-4" />,
  farm: <Tractor className="h-4 w-4" />,
  business: <Briefcase className="h-4 w-4" />,
  other: <Building2 className="h-4 w-4" />,
};

interface OrgSwitcherProps {
  collapsed?: boolean;
}

export function OrgSwitcher({ collapsed }: OrgSwitcherProps) {
  const { organizations, currentOrg, setCurrentOrg } = useOrganizations();
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (collapsed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-10 h-10"
        onClick={() => setOpen(true)}
      >
        {currentOrg ? typeIcons[currentOrg.type as OrgType] : <Building2 className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2 truncate">
              {currentOrg ? (
                <>
                  {typeIcons[currentOrg.type as OrgType]}
                  <span className="truncate">{currentOrg.name}</span>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  <span>Select organization</span>
                </>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search organizations..." />
            <CommandList>
              <CommandEmpty>No organization found.</CommandEmpty>
              <CommandGroup heading="Organizations">
                {organizations.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.name}
                    onSelect={() => {
                      setCurrentOrg(org);
                      setOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {typeIcons[org.type as OrgType]}
                      <span className="truncate">{org.name}</span>
                    </span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        currentOrg?.id === org.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Organization
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateOrgDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </>
  );
}
