import { useState } from 'react';
import { subscribePush } from '@/utils/pushSubscribe';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';

export function PushToggle(){
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onEnable(){
    setLoading(true);
    try{
      const res = await fetch('/api/vapid'); 
      const { publicKey } = await res.json();
      await subscribePush(publicKey);
      setEnabled(true);
    }catch(e){ 
      console.error('Failed to enable web push:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button 
      className="px-3 py-2 rounded-lg border border-neutral-700" 
      onClick={onEnable} 
      disabled={enabled || loading}
      variant="outline"
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Enabling...
        </>
      ) : enabled ? (
        <>
          <Bell className="h-4 w-4 mr-2" />
          Web Push Enabled
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4 mr-2" />
          Enable Web Push
        </>
      )}
    </Button>
  );
}
