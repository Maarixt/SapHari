import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Copy, Trash2, Code, AlertTriangle, Bell, X } from 'lucide-react';
import { SnippetBus } from '@/features/snippets/snippetBus';

interface SnippetEvent {
  id: string;
  code: string;
  meta?: Record<string, any>;
  timestamp: Date;
}

interface SnippetStreamProps {
  className?: string;
  onClose?: () => void;
}

export const SnippetStream = ({ className, onClose }: SnippetStreamProps) => {
  const { toast } = useToast();
  const [snippets, setSnippets] = useState<SnippetEvent[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Subscribe to snippet events
    const unsubscribe = SnippetBus.on((code: string, meta?: Record<string, any>) => {
      const event: SnippetEvent = {
        id: `snippet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        code,
        meta,
        timestamp: new Date()
      };
      setSnippets(prev => [event, ...prev].slice(0, 50)); // Keep last 50 snippets
    });

    setIsListening(true);

    return () => {
      unsubscribe();
      setIsListening(false);
    };
  }, []);

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard",
        description: "Code snippet copied successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const clearSnippets = () => {
    setSnippets([]);
    toast({
      title: "Snippets cleared",
      description: "All snippets have been cleared"
    });
  };

  const getSnippetIcon = (meta?: Record<string, any>) => {
    const type = meta?.type;
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />;
      case 'device_config':
        return <Code className="h-4 w-4" />;
      case 'notification':
        return <Bell className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  const getSnippetVariant = (meta?: Record<string, any>) => {
    const type = meta?.type;
    switch (type) {
      case 'alert':
        return 'destructive';
      case 'device_config':
        return 'default';
      case 'notification':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Snippet Stream</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isListening ? "default" : "secondary"}>
              {isListening ? "Listening" : "Disconnected"}
            </Badge>
            {snippets.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSnippets}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
                title="Close snippet stream"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {snippets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Code className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No snippets yet</p>
            <p className="text-xs mt-1">
              Snippets will appear here when alert rules are triggered or code is generated
            </p>
          </div>
        ) : (
          <ScrollArea className="h-80 max-h-[60vh]">
            <div className="space-y-3">
              {snippets.map((snippet, index) => (
                <Card key={`${snippet.timestamp.getTime()}-${index}`} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSnippetIcon(snippet.meta)}
                        <Badge variant={getSnippetVariant(snippet.meta)}>
                          {snippet.meta?.type || 'snippet'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(snippet.timestamp)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(snippet.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Textarea
                      value={snippet.code}
                      readOnly
                      rows={Math.min(snippet.code.split('\n').length, 10)}
                      className="font-mono text-sm bg-muted/50"
                    />
                    {snippet.meta && Object.keys(snippet.meta).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <strong>Metadata:</strong> {JSON.stringify(snippet.meta, null, 2)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
