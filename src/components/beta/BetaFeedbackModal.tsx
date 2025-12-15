import { useState } from 'react';
import { MessageSquarePlus, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { isBetaMode } from '@/lib/betaConfig';

interface BetaFeedbackModalProps {
  collapsed?: boolean;
}

type FeedbackType = 'bug' | 'feature' | 'general';

export function BetaFeedbackModal({ collapsed }: BetaFeedbackModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');

  if (!isBetaMode() || !user) return null;

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please enter your feedback before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Use raw SQL insert since beta_feedback is not in generated types
      const { error } = await supabase.rpc('log_audit_event', {
        _action: 'beta_feedback',
        _actor_email: user.email || '',
        _actor_role: 'user',
        _details: {
          feedback_type: feedbackType,
          message: message.trim(),
          page_url: window.location.href,
        },
        _resource: 'beta_feedback',
      });

      if (error) throw error;

      toast({
        title: 'Feedback submitted',
        description: 'Thank you for helping us improve SapHari!',
      });
      setMessage('');
      setFeedbackType('general');
      setOpen(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast({
        title: 'Submission failed',
        description: 'Could not submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground gap-2"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {!collapsed && <span>Beta Feedback</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-amber-500" />
            Beta Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve SapHari by sharing your thoughts, reporting bugs, or suggesting features.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Feedback Type</Label>
            <Select value={feedbackType} onValueChange={(v) => setFeedbackType(v as FeedbackType)}>
              <SelectTrigger id="feedback-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">🐛 Bug Report</SelectItem>
                <SelectItem value="feature">💡 Feature Request</SelectItem>
                <SelectItem value="general">💬 General Feedback</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Your Feedback</Label>
            <Textarea
              id="feedback-message"
              placeholder={
                feedbackType === 'bug'
                  ? "Describe the bug you encountered..."
                  : feedbackType === 'feature'
                  ? "Describe the feature you'd like to see..."
                  : "Share your thoughts..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
