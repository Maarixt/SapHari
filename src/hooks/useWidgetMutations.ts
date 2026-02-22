import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useWidgetMutations(deviceId: string) {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const deleteWidget = useCallback(
    async (widgetId: string): Promise<void> => {
      setDeletingIds((prev) => new Set(prev).add(widgetId));
      try {
        const { error } = await supabase.from('widgets').delete().eq('id', widgetId);
        if (error) throw error;
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(widgetId);
          return next;
        });
      }
    },
    [deviceId]
  );

  const isDeleting = useCallback(
    (widgetId: string) => deletingIds.has(widgetId),
    [deletingIds]
  );

  return { deleteWidget, isDeleting };
}
