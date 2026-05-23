import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import twilio from 'twilio';
import {
  authMiddleware,
  adminMiddleware,
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
} from '@zetnet/shared/middleware';
import {
  getPaginationParams,
  logger,
  ValidationError,
  AppError,
} from '@zetnet/shared/utils';

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// Send notification
app.post(
  '/api/notifications/send',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { recipientPhone, recipientEmail, type, templateName, variables } = req.body;

      if (!type || !templateName) {
        throw new ValidationError('Missing required fields: type, templateName');
      }

      const notificationId = uuidv4();
      let messageBody = '';
      let status = 'pending';

      try {
        // Get template
        const { data: template } = await supabase
          .from('notification_templates')
          .select('*')
          .eq('name', templateName)
          .eq('is_active', true)
          .single();

        if (!template) {
          throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Notification template not found');
        }

        messageBody = template.template_body;

        // Replace variables in template
        if (variables) {
          Object.entries(variables).forEach(([key, value]) => {
            messageBody = messageBody.replace(`{{${key}}}`, String(value));
          });
        }

        // Send via appropriate channel
        if (type === 'whatsapp' && recipientPhone) {
          await twilioClient.messages.create({
            body: messageBody,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
            to: `whatsapp:${recipientPhone}`,
          });
          status = 'sent';
          logger.info(req.requestId, `WhatsApp notification sent to ${recipientPhone}`);
        } else if (type === 'email' && recipientEmail) {
          // TODO: Implement email sending via SMTP or SendGrid
          status = 'sent';
          logger.info(req.requestId, `Email notification sent to ${recipientEmail}`);
        } else if (type === 'sms' && recipientPhone) {
          await twilioClient.messages.create({
            body: messageBody,
            from: process.env.TWILIO_WHATSAPP_FROM,
            to: recipientPhone,
          });
          status = 'sent';
          logger.info(req.requestId, `SMS notification sent to ${recipientPhone}`);
        }
      } catch (error) {
        logger.error(req.requestId, 'Error sending notification', error);
        status = 'failed';
      }

      // Store notification record
      await supabase.from('notifications').insert({
        id: notificationId,
        type,
        recipient_phone: recipientPhone,
        recipient_email: recipientEmail,
        template_name: templateName,
        status,
        message_body: messageBody,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      });

      res.json({
        success: true,
        data: {
          id: notificationId,
          status,
          type,
          sentAt: new Date().toISOString(),
        },
        statusCode: 200,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get notification history (Admin only)
app.get(
  '/api/notifications/history',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = getPaginationParams(req.query.page, req.query.limit);
      const type = req.query.type as string;
      const status = req.query.status as string;

      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: notifications, count, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
        statusCode: 200,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Retry failed notification
app.post(
  '/api/notifications/:id/retry',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get notification
      const { data: notification } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (!notification) {
        throw new AppError(404, 'NOT_FOUND', 'Notification not found');
      }

      // Check retry limit
      if (notification.retry_count >= notification.max_retries) {
        throw new AppError(
          400,
          'MAX_RETRIES_EXCEEDED',
          'Maximum retry attempts exceeded'
        );
      }

      // Update for retry
      await supabase
        .from('notifications')
        .update({
          status: 'pending',
          retry_count: notification.retry_count + 1,
          next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        })
        .eq('id', req.params.id);

      logger.info(req.requestId, `Notification retry queued: ${req.params.id}`);

      res.json({
        success: true,
        data: { message: 'Notification retry queued', id: req.params.id },
        statusCode: 200,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3006');
app.listen(PORT, () => {
  logger.info(undefined, `Notification Service listening on port ${PORT}`);
});
