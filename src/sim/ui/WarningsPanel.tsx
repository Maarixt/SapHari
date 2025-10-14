/**
 * Warnings Panel for Circuit Simulation
 * Displays real-time warnings and errors from the simulation engine
 */

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Info, 
  X, 
  RefreshCw, 
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Warning } from '../core/types';

interface WarningsPanelProps {
  warnings: Warning[];
  onClearWarnings?: () => void;
  onDismissWarning?: (warningId: string) => void;
  className?: string;
}

interface WarningGroup {
  severity: 'info' | 'warning' | 'error';
  count: number;
  warnings: Warning[];
}

export const WarningsPanel: React.FC<WarningsPanelProps> = ({
  warnings,
  onClearWarnings,
  onDismissWarning,
  className = ''
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['error', 'warning']));
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  // Group warnings by severity
  const groupedWarnings = warnings.reduce((groups, warning) => {
    const severity = warning.severity;
    if (!groups[severity]) {
      groups[severity] = [];
    }
    groups[severity].push(warning);
    return groups;
  }, {} as Record<string, Warning[]>);

  const warningGroups: WarningGroup[] = [
    {
      severity: 'error' as const,
      count: groupedWarnings.error?.length || 0,
      warnings: groupedWarnings.error || []
    },
    {
      severity: 'warning' as const,
      count: groupedWarnings.warning?.length || 0,
      warnings: groupedWarnings.warning || []
    },
    {
      severity: 'info' as const,
      count: groupedWarnings.info?.length || 0,
      warnings: groupedWarnings.info || []
    }
  ].filter(group => group.count > 0);

  // Filter warnings based on current filter
  const filteredGroups = warningGroups.filter(group => 
    filter === 'all' || group.severity === filter
  );

  const toggleGroup = (severity: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(severity)) {
      newExpanded.delete(severity);
    } else {
      newExpanded.add(severity);
    }
    setExpandedGroups(newExpanded);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string): "default" | "destructive" => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  const getWarningDescription = (warning: Warning) => {
    let description = warning.message;
    
    if (warning.componentId) {
      description += ` (Component: ${warning.componentId})`;
    }
    if (warning.netId) {
      description += ` (Net: ${warning.netId})`;
    }
    
    return description;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const totalWarnings = warnings.length;
  const errorCount = groupedWarnings.error?.length || 0;
  const warningCount = groupedWarnings.warning?.length || 0;
  const infoCount = groupedWarnings.info?.length || 0;

  if (totalWarnings === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4" />
            Warnings
            <Badge variant="outline" className="ml-auto">
              0
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground text-sm py-4">
            No warnings detected
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4" />
            Warnings
            <Badge variant="outline">
              {totalWarnings}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter(filter === 'all' ? 'error' : 'all')}
              className="h-6 px-2"
            >
              <Filter className="h-3 w-3" />
            </Button>
            {onClearWarnings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearWarnings}
                className="h-6 px-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Summary badges */}
        <div className="flex gap-2">
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {errorCount} Error{errorCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {warningCount} Warning{warningCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {infoCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {infoCount} Info
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {filteredGroups.map((group) => (
              <div key={group.severity}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroup(group.severity)}
                  className="w-full justify-start h-8 px-2"
                >
                  {expandedGroups.has(group.severity) ? (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronRight className="h-3 w-3 mr-1" />
                  )}
                  {getSeverityIcon(group.severity)}
                  <span className="ml-1 capitalize">{group.severity}s</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {group.count}
                  </Badge>
                </Button>
                
                {expandedGroups.has(group.severity) && (
                  <div className="ml-4 space-y-1">
                    {group.warnings.map((warning) => (
                      <Alert key={warning.id} variant={getSeverityColor(warning.severity)}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <AlertTitle className="text-xs font-medium">
                              {warning.code}
                            </AlertTitle>
                            <AlertDescription className="text-xs mt-1">
                              {getWarningDescription(warning)}
                            </AlertDescription>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatTimestamp(warning.timestamp)}
                            </div>
                          </div>
                          {onDismissWarning && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDismissWarning(warning.id)}
                              className="h-6 w-6 p-0 ml-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default WarningsPanel;
