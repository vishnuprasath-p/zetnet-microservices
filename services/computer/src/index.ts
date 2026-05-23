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

// Get all computers
app.get('/api/computers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query.page, req.query.limit);
    const category = req.query.category as string;
    const search = req.query.search as string;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: products, count, error } = await query;

    if (error) throw error;

    const specs = await Promise.all(
      (products || []).map(async (p) => {
        const { data: productSpecs } = await supabase
          .from('product_specs')
          .select('spec_key, spec_value')
          .eq('product_id', p.id);

        const specsObj = productSpecs?.reduce(
          (acc, s) => ({ ...acc, [s.spec_key]: s.spec_value }),
          {}
        );

        return { ...p, specs: specsObj };
      })
    );

    res.json({
      success: true,
      data: specs,
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

// Get computer by ID
app.get('/api/computers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !product) {
      throw new NotFoundError('Computer');
    }

    const { data: specs } = await supabase
      .from('product_specs')
      .select('spec_key, spec_value')
      .eq('product_id', product.id);

    const specsObj = specs?.reduce(
      (acc, s) => ({ ...acc, [s.spec_key]: s.spec_value }),
      {}
    );

    res.json({
      success: true,
      data: { ...product, specs: specsObj },
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Create computer (Admin only)
app.post(
  '/api/computers',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, category, description, price, currency, imageUrl, sku, specs } = req.body;

      if (!name || !category || !price) {
        throw new ValidationError('Missing required fields: name, category, price');
      }

      const productId = uuidv4();

      const { error: insertError } = await supabase.from('products').insert({
        id: productId,
        name,
        category,
        description,
        price,
        currency: currency || 'USD',
        image_url: imageUrl,
        sku: sku || uuidv4(),
        created_by: req.user!.id,
      });

      if (insertError) throw insertError;

      // Insert specs
      if (specs && Object.keys(specs).length > 0) {
        const specRows = Object.entries(specs).map(([key, value]) => ({
          product_id: productId,
          spec_key: key,
          spec_value: value,
        }));

        await supabase.from('product_specs').insert(specRows);
      }

      logger.info(req.requestId, `Computer created: ${name}`);

      res.status(201).json({
        success: true,
        data: { id: productId, name, category, price, specs },
        statusCode: 201,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update computer (Admin only)
app.put(
  '/api/computers/:id',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, category, description, price, currency, imageUrl, specs } = req.body;

      await supabase
        .from('products')
        .update({
          name,
          category,
          description,
          price,
          currency,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.params.id);

      // Update specs if provided
      if (specs && Object.keys(specs).length > 0) {
        await supabase.from('product_specs').delete().eq('product_id', req.params.id);

        const specRows = Object.entries(specs).map(([key, value]) => ({
          product_id: req.params.id,
          spec_key: key,
          spec_value: value,
        }));

        await supabase.from('product_specs').insert(specRows);
      }

      logger.info(req.requestId, `Computer updated: ${req.params.id}`);

      res.json({
        success: true,
        data: { message: 'Computer updated successfully' },
        statusCode: 200,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete computer (Admin only)
app.delete(
  '/api/computers/:id',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await supabase.from('products').delete().eq('id', req.params.id);

      logger.info(req.requestId, `Computer deleted: ${req.params.id}`);

      res.json({
        success: true,
        data: { message: 'Computer deleted successfully' },
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

const PORT = parseInt(process.env.COMPUTER_SERVICE_PORT || '3002');
app.listen(PORT, () => {
  logger.info(undefined, `Computer Service listening on port ${PORT}`);
});
