import { ReactNode } from 'react';
import { RequireMaster } from '@/components/auth/RequireRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Crown, Activity, Users, Cpu, Database, TestTube } from 'lucide-react';

interface MasterLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function MasterLayout({ children, title, subtitle }: MasterLayoutProps) {
  return (
    <RequireMaster>
      <div className="min-h-screen bg-background">
        {/* Master Header */}
        <div className="border-b bg-muted/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-6 w-6 text-yellow-600" />
                  <h1 className="text-2xl font-bold">Master Dashboard</h1>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Master Access
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Live Monitoring</span>
                </div>
              </div>
            </div>
            
            {(title || subtitle) && (
              <div className="mt-2">
                {title && <h2 className="text-xl font-semibold">{title}</h2>}
                {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Master Content */}
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </div>
    </RequireMaster>
  );
}

// Master status indicator component
export function MasterStatusIndicator() {
  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-yellow-800">
            Master Dashboard Active
          </span>
          <Badge variant="outline" className="text-xs">
            Real-time
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Master navigation component
export function MasterNavigation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Master Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MasterNavItem
            icon={Users}
            title="Users"
            description="Manage users and roles"
            href="/master/users"
          />
          <MasterNavItem
            icon={Cpu}
            title="Devices"
            description="Monitor all devices"
            href="/master/devices"
          />
          <MasterNavItem
            icon={Database}
            title="Analytics"
            description="System analytics"
            href="/master/analytics"
          />
          <MasterNavItem
            icon={Activity}
            title="Live Feed"
            description="Real-time events"
            href="/master/feed"
          />
          <MasterNavItem
            icon={TestTube}
            title="QA Tests"
            description="Test checklist"
            href="/master/qa"
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface MasterNavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}

function MasterNavItem({ icon: Icon, title, description, href }: MasterNavItemProps) {
  return (
    <a
      href={href}
      className="group p-4 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </a>
  );
}
