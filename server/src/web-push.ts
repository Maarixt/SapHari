import { WebPushService } from './services/web-push-service';

export function setupWebPush() {
  console.log('📱 Web Push service initialized');
  console.log(`🔑 Public key: ${WebPushService.getPublicKey()}`);
}
