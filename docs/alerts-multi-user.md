# Enhancing SapHari Dashboard with Alerts and Multi-User Support

This document outlines a plan to extend the SapHari MQTT dashboard with real-time notifications and multi-user access control.

## 1. Alert Notifications

### Real-time Alerts and Summaries
- Trigger immediate emails when a sensor changes to a critical state (e.g. water leak sensor HIGH).
- Offer optional daily or weekly summary reports aggregating recent alerts and key sensor data.

### Notification Channel
- Use email as the default channel for notifications. Email is free, widely supported, and allows rich message content.
- Other channels such as SMS, WhatsApp or Telegram can be added later if needed.

### Dashboard Configuration
- Add an **Alerts** section to the UI.
- For each alert, store the pin or sensor address, trigger condition, and message text.
- Optional settings like repeat behaviour or cooldown periods can be added later.

### Sending Notifications
Two possible delivery models:
1. **Device-side**: ESP32 monitors sensors and sends emails via SMTP or a service such as IFTTT.
2. **Server-side** *(recommended)*: the device publishes sensor data, while a cloud service evaluates alert rules and sends emails to the appropriate users.

The server-side model scales better for multiple users and keeps credentials off the device.

## 2. User Accounts and Roles

### Authentication
- Introduce email/password login so each user has a unique account and email address for alerts.
- Store device configuration per user in a backend or managed service (e.g. Firebase, Supabase).

### Sharing Devices
- Allow device owners to invite other users via email and assign a role:
  - **Viewer** – read-only access to dashboards.
  - **Controller** – can operate widgets but not change configuration.
  - **Editor/Admin** – full access including adding widgets and editing devices.
- The UI should enable or disable controls based on the current user's role.

## 3. Integrating Alert Logic

### Device vs. Server Responsibilities
- Devices remain focused on sensor reading and control operations.
- The server holds alert rules, performs notifications, and can compile scheduled summaries.

### Snippet Generator
- Continue generating firmware snippets for device configuration.
- Include a commented list of alerts or an `AlertMap` structure if devices must publish alert topics.

## 4. Roadmap
1. Implement basic email alerts for a single user.
2. Add user authentication and store device data per user.
3. Introduce device sharing with roles.
4. Expand alert notifications to multiple recipients and add scheduled summaries.

These features will evolve the dashboard from a single-user tool into a collaborative IoT platform with proactive monitoring.
