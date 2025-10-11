// Role Management Dialog Component
import React, { useState, useEffect } from 'react';
import { useRoles } from '../../hooks/useRoles';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { 
  UserPlus, 
  UserMinus, 
  Shield, 
  ShieldCheck, 
  Users, 
  AlertCircle,
  Loader2,
  Search,
  Mail
} from 'lucide-react';

interface RoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleManagementDialog({ open, onOpenChange }: RoleManagementDialogProps) {
  const {
    getAllUsersWithRoles,
    grantRole,
    revokeRole,
    getUserByEmail,
    getAvailableRolesToGrant,
    canGrantRole,
    isLoading,
    error
  } = useRoles();

  const [users, setUsers] = useState<any[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load users on mount
  useEffect(() => {
    if (open) {
      loadUsers();
      loadAvailableRoles();
    }
  }, [open]);

  // Load all users with roles
  const loadUsers = async () => {
    try {
      const usersData = await getAllUsersWithRoles();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // Load available roles
  const loadAvailableRoles = async () => {
    try {
      const roles = await getAvailableRolesToGrant();
      setAvailableRoles(roles);
    } catch (error) {
      console.error('Failed to load available roles:', error);
    }
  };

  // Search for user by email
  const searchUser = async () => {
    if (!searchEmail.trim()) return;

    setIsSearching(true);
    try {
      const user = await getUserByEmail(searchEmail.trim());
      if (user) {
        setSelectedUser(user);
        setSearchEmail('');
      } else {
        alert('User not found');
      }
    } catch (error) {
      console.error('Failed to search user:', error);
      alert('Failed to search user');
    } finally {
      setIsSearching(false);
    }
  };

  // Grant role to user
  const handleGrantRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      const canGrant = await canGrantRole(selectedRole, selectedUser.id);
      if (!canGrant) {
        alert('You do not have permission to grant this role');
        return;
      }

      await grantRole({
        user_id: selectedUser.id,
        role: selectedRole as any,
        tenant_id: selectedTenantId || undefined
      });

      alert('Role granted successfully');
      setSelectedUser(null);
      setSelectedRole('');
      setSelectedTenantId('');
      await loadUsers();
    } catch (error) {
      console.error('Failed to grant role:', error);
      alert('Failed to grant role');
    }
  };

  // Revoke role from user
  const handleRevokeRole = async (userId: string, role: string, tenantId?: string) => {
    if (!confirm(`Are you sure you want to revoke the ${role} role from this user?`)) {
      return;
    }

    try {
      await revokeRole(userId, role, tenantId);
      alert('Role revoked successfully');
      await loadUsers();
    } catch (error) {
      console.error('Failed to revoke role:', error);
      alert('Failed to revoke role');
    }
  };

  // Get role badge variant
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'master':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'master':
        return <Shield className="h-4 w-4" />;
      case 'admin':
        return <ShieldCheck className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Role Management</span>
          </DialogTitle>
          <DialogDescription>
            Manage user roles and permissions for your SapHari system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Grant Role Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Grant Role to User</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-email">Search User by Email</Label>
                <div className="flex space-x-2">
                  <Input
                    id="search-email"
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="user@example.com"
                    disabled={isSearching}
                  />
                  <Button 
                    onClick={searchUser} 
                    disabled={isSearching || !searchEmail.trim()}
                    size="sm"
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {selectedUser && (
                <div className="space-y-2">
                  <Label>Selected User</Label>
                  <div className="flex items-center space-x-2 p-2 border rounded">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">{selectedUser.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(null)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role-select">Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(role)}
                            <span className="capitalize">{role}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant-id">Tenant ID (Optional)</Label>
                  <Input
                    id="tenant-id"
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    placeholder="tenant-123"
                  />
                </div>
              </div>
            )}

            {selectedUser && selectedRole && (
              <Button onClick={handleGrantRole} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Granting...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Grant Role
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Users List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">All Users</h3>
            
            {users.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No users found.
              </p>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Primary Role</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role: any) => (
                              <Badge 
                                key={role.id} 
                                variant={getRoleBadge(role.role)}
                                className="flex items-center space-x-1"
                              >
                                {getRoleIcon(role.role)}
                                <span className="capitalize">{role.role}</span>
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadge(user.primary_role)}>
                            {user.primary_role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.tenant_id || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {user.roles.map((role: any) => (
                              <Button
                                key={role.id}
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevokeRole(user.id, role.role, role.tenant_id)}
                                disabled={isLoading}
                              >
                                <UserMinus className="h-3 w-3 mr-1" />
                                Revoke {role.role}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
