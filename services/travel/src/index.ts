import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
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
  AppError,
  ValidationError,
  NotFoundError,
} from '@zetnet/shared/utils';

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// Get all tours
app.get('/api/tours', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query.page, req.query.limit);

    let query = supabase
      .from('tours')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .range(offset, offset + limit - 1)
      .order('start_date', { ascending: true });

    if (req.query.destination) {
      query = query.ilike('destination', `%${req.query.destination}%`);
    }

    const { data: tours, count, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: tours,
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

// Get tour by ID
app.get('/api/tours/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: tour, error } = await supabase
      .from('tours')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !tour) {
      throw new NotFoundError('Tour');
    }

    const { data: itinerary } = await supabase
      .from('tour_itinerary')
      .select('*')
      .eq('tour_id', tour.id)
      .order('day_number', { ascending: true });

    res.json({
      success: true,
      data: { ...tour, itinerary: itinerary || [] },
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get destinations
app.get('/api/destinations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json({
      success: true,
      data: destinations,
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Create tour (Admin only)
app.post(
  '/api/tours',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, destination, description, durationDays, price, imageUrl, maxParticipants, startDate, endDate, itinerary } = req.body;

      if (!name || !destination || !price || !maxParticipants) {
        throw new ValidationError('Missing required fields');
      }

      const tourId = uuidv4();

      const { error: insertError } = await supabase.from('tours').insert({
        id: tourId,
        name,
        destination,
        description,
        duration_days: durationDays,
        price,
        image_url: imageUrl,
        max_participants: maxParticipants,
        available_seats: maxParticipants,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        created_by: req.user!.id,
      });

      if (insertError) throw insertError;

      // Insert itinerary
      if (itinerary && Array.isArray(itinerary)) {
        const itineraryRows = itinerary.map((item: any, index: number) => ({
          tour_id: tourId,
          day_number: item.dayNumber || index + 1,
          title: item.title,
          description: item.description,
          location: item.location,
          activities: item.activities || [],
        }));

        await supabase.from('tour_itinerary').insert(itineraryRows);
      }

      logger.info(req.requestId, `Tour created: ${name}`);

      res.status(201).json({
        success: true,
        data: { id: tourId, name, destination, price },
        statusCode: 201,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update tour (Admin only)
app.put(
  '/api/tours/:id',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, price, isActive, availableSeats } = req.body;

      await supabase
        .from('tours')
        .update({
          name,
          description,
          price,
          is_active: isActive,
          available_seats: availableSeats,
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.params.id);

      logger.info(req.requestId, `Tour updated: ${req.params.id}`);

      res.json({
        success: true,
        data: { message: 'Tour updated successfully' },
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

const PORT = parseInt(process.env.TRAVEL_SERVICE_PORT || '3003');
app.listen(PORT, () => {
  logger.info(undefined, `Travel Service listening on port ${PORT}`);
});
