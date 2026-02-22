import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  MessageSquare,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Reply,
  Search,
} from 'lucide-react';
import { BackButton } from '@/components/nav/BackButton';
import { MasterLayout } from '@/components/master/MasterLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type FeedbackType = 'bug' | 'feature' | 'general';
type ReviewFilter = 'all' | 'unreviewed' | 'reviewed';

interface BetaFeedbackRow {
  id: string;
  user_id: string;
  feedback_type: FeedbackType;
  message: string;
  page_url: string | null;
  user_agent: string | null;
  created_at: string;
  reviewed: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reply_text: string | null;
  replied_at: string | null;
  replied_by: string | null;
}

interface FeedbackWithEmail extends BetaFeedbackRow {
  email: string | null;
}

const MESSAGE_TRUNCATE = 80;

function formatDate(iso: string) {
  try {
    return format(new Date(iso), 'MMM d, yyyy HH:mm');
  } catch {
    return iso;
  }
}

export default function MasterFeedback() {
  const { toast } = useToast();
  const [list, setList] = useState<FeedbackWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<FeedbackWithEmail | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('beta_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;
      const rows = (feedbackData ?? []) as BetaFeedbackRow[];

      if (rows.length === 0) {
        setList([]);
        return;
      }

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailByUserId = new Map<string, string | null>();
      for (const p of profileData ?? []) {
        emailByUserId.set(p.id, p.email ?? null);
      }

      const withEmail: FeedbackWithEmail[] = rows.map((r) => ({
        ...r,
        email: emailByUserId.get(r.user_id) ?? null,
      }));
      setList(withEmail);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feedback');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  useEffect(() => {
    const channel = supabase
      .channel('master-feedback')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beta_feedback' },
        () => {
          fetchFeedback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFeedback]);

  const handleReviewedToggle = async (row: FeedbackWithEmail, checked: boolean) => {
    setTogglingId(row.id);
    const prev = list.find((r) => r.id === row.id);
    const prevReviewed = prev?.reviewed ?? row.reviewed;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updates = checked
        ? {
            reviewed: true,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id ?? null,
          }
        : {
            reviewed: false,
            reviewed_at: null,
            reviewed_by: null,
          };

      const { error: updateError } = await supabase
        .from('beta_feedback')
        .update(updates)
        .eq('id', row.id);

      if (updateError) throw updateError;

      setList((prevList) =>
        prevList.map((r) =>
          r.id === row.id ? { ...r, ...updates } : r
        )
      );
    } catch (e) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Could not update reviewed status',
        variant: 'destructive',
      });
      setList((prevList) =>
        prevList.map((r) =>
          r.id === row.id ? { ...r, reviewed: prevReviewed } : r
        )
      );
    } finally {
      setTogglingId(null);
    }
  };

  const openReply = (row: FeedbackWithEmail) => {
    setReplyTarget(row);
    setReplyText(row.reply_text ?? '');
    setReplyOpen(true);
  };

  const submitReply = async () => {
    if (!replyTarget) return;
    setReplySubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const replyPayload = {
        reply_text: replyText.trim() || null,
        replied_at: replyText.trim() ? now : null,
        replied_by: replyText.trim() ? user?.id ?? null : null,
      };
      const { error: updateError } = await supabase
        .from('beta_feedback')
        .update(replyPayload)
        .eq('id', replyTarget.id);

      if (updateError) throw updateError;

      setList((prevList) =>
        prevList.map((r) =>
          r.id === replyTarget.id ? { ...r, ...replyPayload } : r
        )
      );
      toast({ title: 'Reply saved', description: 'Feedback reply has been saved.' });
      setReplyOpen(false);
      setReplyTarget(null);
      setReplyText('');
    } catch (e) {
      toast({
        title: 'Reply failed',
        description: e instanceof Error ? e.message : 'Could not save reply',
        variant: 'destructive',
      });
    } finally {
      setReplySubmitting(false);
    }
  };

  const filtered = list.filter((row) => {
    if (reviewFilter === 'unreviewed' && row.reviewed) return false;
    if (reviewFilter === 'reviewed' && !row.reviewed) return false;
    if (typeFilter !== 'all' && row.feedback_type !== typeFilter) return false;
    if (emailSearch.trim()) {
      const email = (row.email ?? '').toLowerCase();
      if (!email.includes(emailSearch.trim().toLowerCase())) return false;
    }
    return true;
  });

  const unreviewedCount = list.filter((r) => !r.reviewed).length;

  return (
    <MasterLayout
      title="Feedback"
      subtitle="Beta feedback from users. Mark as reviewed and reply as needed."
    >
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <BackButton fallback="/master" variant="ghost" size="sm">
              Back to Dashboard
            </BackButton>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {list.length} total
              </Badge>
              {unreviewedCount > 0 && (
                <Badge variant="default">
                  {unreviewedCount} unreviewed
                </Badge>
              )}
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Beta Feedback
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={reviewFilter}
                  onValueChange={(v) => setReviewFilter(v as ReviewFilter)}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unreviewed">Unreviewed</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v as FeedbackType | 'all')}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by email..."
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchFeedback} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading && list.length === 0 ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Loading feedback...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-destructive">
                  <AlertTriangle className="h-10 w-10" />
                  <p>{error}</p>
                  <Button variant="outline" onClick={fetchFeedback}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  {list.length === 0
                    ? 'No feedback yet.'
                    : 'No feedback matches the current filters.'}
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-border/50">
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Message</TableHead>
                        <TableHead className="font-semibold">Created</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Reviewed</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row) => (
                        <TableRow key={row.id} className="hover:bg-muted/50">
                          <TableCell className="text-muted-foreground">
                            {row.email ?? row.user_id.slice(0, 8) + '…'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {row.feedback_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            {row.message.length > MESSAGE_TRUNCATE ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="line-clamp-2 cursor-default">
                                    {row.message.slice(0, MESSAGE_TRUNCATE)}…
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-sm">
                                  {row.message}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="line-clamp-2">{row.message}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {formatDate(row.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {row.reviewed && (
                                <Badge variant="secondary" className="text-xs">
                                  Reviewed
                                </Badge>
                              )}
                              {row.reply_text && (
                                <Badge variant="outline" className="text-xs">
                                  Replied
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={row.reviewed}
                              disabled={togglingId === row.id}
                              onCheckedChange={(checked) =>
                                handleReviewedToggle(row, checked)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReply(row)}
                              className="gap-1"
                            >
                              <Reply className="h-3 w-3" />
                              Reply
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Reply to feedback</DialogTitle>
              <DialogDescription>
                {replyTarget?.email
                  ? `Reply to ${replyTarget.email}`
                  : 'Your reply will be stored and can be emailed to the user.'}
              </DialogDescription>
            </DialogHeader>
            {replyTarget && (
              <>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Original feedback</p>
                  <p className="line-clamp-3">{replyTarget.message}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reply-text">Your reply</Label>
                  <Textarea
                    id="reply-text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplyOpen(false)} disabled={replySubmitting}>
                Cancel
              </Button>
              <Button onClick={submitReply} disabled={replySubmitting}>
                {replySubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save reply'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </MasterLayout>
  );
}
