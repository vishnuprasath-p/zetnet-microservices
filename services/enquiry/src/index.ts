import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware,
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
} from '@zetnet/shared/middleware';
import {
  getPaginationParams,
  logger,
  validateEmail,
  validatePhone,
  ValidationError,
  NotFoundError,
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

app.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// Create enquiry (Public)
app.post('/api/enquiries', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, mobile, service, message } = req.body;

    // Validation
    if (!name || !email || !mobile || !service || !message) {
      throw new ValidationError('Missing required fields');
    }

    if (!validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!validatePhone(mobile)) {
      throw new ValidationError('Invalid phone number');
    }

    const enquiryId = uuidv4();

    const { error: insertError } = await supabase.from('enquiries').insert({
      id: enquiryId,
      name: name.trim(),
      email: email.toLowerCase(),
      mobile,
      service,
      message: message.trim(),
      status: 'pending',
      priority: 'normal',
    });

    if (insertError) throw insertError;

    logger.info(req.requestId, `Enquiry created: ${email} - ${service}`);

    // Emit event for notification service
    // TODO: Publish to event bus
    // await publishEvent('enquiry.created', { enquiryId, email, service, name });

    res.status(201).json({
      success: true,
      data: {
        id: enquiryId,
        name,
        email,
        mobile,
        service,
        status: 'pending',
      },
      statusCode: 201,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get all enquiries (Admin only)
app.get('/api/enquiries', authMiddleware, adminMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query.page, req.query.limit);
    const status = req.query.status as string;
    const service = req.query.service as string;

    let query = supabase
      .from('enquiries')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (service) {
      query = query.eq('service', service);
    }

    const { data: enquiries, count, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: enquiries,
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
});

// Get enquiry by ID (Admin only)
app.get('/api/enquiries/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: enquiry, error } = await supabase
      .from('enquiries')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !enquiry) {
      throw new NotFoundError('Enquiry');
    }

    res.json({
      success: true,
      data: enquiry,
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Update enquiry (Admin only)
app.put('/api/enquiries/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, notes, priority, followUpDate } = req.body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    if (priority) updateData.priority = priority;
    if (followUpDate) updateData.follow_up_date = followUpDate;
    if (status === 'resolved') updateData.resolved_at = new Date().toISOString();

    await supabase
      .from('enquiries')
      .update(updateData)
      .eq('id', req.params.id);

    logger.info(req.requestId, `Enquiry updated: ${req.params.id} - status: ${status}`);

    res.json({
      success: true,
      data: { message: 'Enquiry updated successfully' },
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Delete enquiry (Admin only)
app.delete('/api/enquiries/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await supabase.from('enquiries').delete().eq('id', req.params.id);

    logger.info(req.requestId, `Enquiry deleted: ${req.params.id}`);

    res.json({
      success: true,
      data: { message: 'Enquiry deleted successfully' },
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = parseInt(process.env.ENQUIRY_SERVICE_PORT || '3005');
app.listen(PORT, () => {
  logger.info(undefined, `Enquiry Service listening on port ${PORT}`);
});
