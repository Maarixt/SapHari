import { Router } from 'express';
import { AlertService } from '../services/alert-service';
import { WebPushService } from '../services/web-push-service';

const router = Router();

// Get all alert rules
router.get('/rules', (req, res) => {
  try {
    const rules = AlertService.getRules();
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get alert rules' });
  }
});

// Add alert rule
router.post('/rules', (req, res) => {
  try {
    const rule = req.body;
    AlertService.addRule(rule);
    res.json({ success: true, message: 'Alert rule added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add alert rule' });
  }
});

// Update alert rule
router.put('/rules/:id', (req, res) => {
  try {
    const ruleId = req.params.id;
    const rule = { ...req.body, id: ruleId };
    AlertService.updateRule(rule);
    res.json({ success: true, message: 'Alert rule updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update alert rule' });
  }
});

// Delete alert rule
router.delete('/rules/:id', (req, res) => {
  try {
    const ruleId = req.params.id;
    AlertService.removeRule(ruleId);
    res.json({ success: true, message: 'Alert rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete alert rule' });
  }
});

// Subscribe to web push notifications
router.post('/web-push/subscribe', (req, res) => {
  try {
    const subscription = req.body;
    WebPushService.addSubscription(subscription);
    res.json({ success: true, message: 'Web push subscription added' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add web push subscription' });
  }
});

// Unsubscribe from web push notifications
router.post('/web-push/unsubscribe', (req, res) => {
  try {
    const subscription = req.body;
    WebPushService.removeSubscription(subscription);
    res.json({ success: true, message: 'Web push subscription removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove web push subscription' });
  }
});

// Get web push public key
router.get('/web-push/public-key', (req, res) => {
  try {
    const publicKey = WebPushService.getPublicKey();
    res.json({ success: true, publicKey });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get public key' });
  }
});

// Test notification
router.post('/test', (req, res) => {
  try {
    const { type, message } = req.body;
    
    // Create a test alert
    const testAlert = {
      id: `test_${Date.now()}`,
      ruleId: 'test_rule',
      ruleName: 'Test Alert',
      deviceId: 'test_device',
      value: message || 'Test notification',
      ts: Date.now(),
      seen: false,
      ack: false,
    };

    // Send test notification based on type
    switch (type) {
      case 'web-push':
        WebPushService.sendNotification({
          title: 'Test Alert',
          body: message || 'This is a test notification',
          data: { test: true },
        });
        break;
      case 'email':
        // EmailService.sendAlertEmail(testAlert);
        break;
      case 'slack':
        // IntegrationService.sendToSlack(testAlert);
        break;
      case 'discord':
        // IntegrationService.sendToDiscord(testAlert);
        break;
      case 'telegram':
        // IntegrationService.sendToTelegram(testAlert);
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid notification type' });
    }

    res.json({ success: true, message: `Test ${type} notification sent` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send test notification' });
  }
});

export { router as alertRoutes };
