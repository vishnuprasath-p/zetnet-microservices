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

app.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// Get all solutions
app.get('/api/solutions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query.page, req.query.limit);

    let query = supabase
      .from('solutions')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (req.query.category) {
      query = query.eq('category', req.query.category);
    }

    const { data: solutions, count, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: solutions,
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

// Get solution by ID
app.get('/api/solutions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: solution, error } = await supabase
      .from('solutions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !solution) {
      throw new NotFoundError('Solution');
    }

    const { data: technologies } = await supabase
      .from('solution_technologies')
      .select('technology_name')
      .eq('solution_id', solution.id);

    const { data: caseStudies } = await supabase
      .from('case_studies')
      .select('*')
      .eq('solution_id', solution.id);

    res.json({
      success: true,
      data: {
        ...solution,
        technologies: technologies?.map((t) => t.technology_name) || [],
        caseStudies: caseStudies || [],
      },
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Create solution (Admin only)
app.post(
  '/api/solutions',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, category, description, longDescription, imageUrl, price, estimatedTimeline, technologies, caseStudies } = req.body;

      if (!name || !category || !description) {
        throw new ValidationError('Missing required fields');
      }

      const solutionId = uuidv4();

      const { error: insertError } = await supabase.from('solutions').insert({
        id: solutionId,
        name,
        category,
        description,
        long_description: longDescription,
        image_url: imageUrl,
        price: price || 'Custom',
        estimated_timeline: estimatedTimeline,
        created_by: req.user!.id,
      });

      if (insertError) throw insertError;

      // Insert technologies
      if (technologies && Array.isArray(technologies)) {
        const techRows = technologies.map((tech: string) => ({
          solution_id: solutionId,
          technology_name: tech,
        }));
        await supabase.from('solution_technologies').insert(techRows);
      }

      // Insert case studies
      if (caseStudies && Array.isArray(caseStudies)) {
        const caseRows = caseStudies.map((cs: any) => ({
          solution_id: solutionId,
          title: cs.title,
          description: cs.description,
          client_name: cs.clientName,
          results: cs.results,
          image_url: cs.imageUrl,
        }));
        await supabase.from('case_studies').insert(caseRows);
      }

      logger.info(req.requestId, `Solution created: ${name}`);

      res.status(201).json({
        success: true,
        data: { id: solutionId, name, category },
        statusCode: 201,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update solution (Admin only)
app.put(
  '/api/solutions/:id',
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, category, description, price } = req.body;

      await supabase
        .from('solutions')
        .update({
          name,
          category,
          description,
          price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.params.id);

      logger.info(req.requestId, `Solution updated: ${req.params.id}`);

      res.json({
        success: true,
        data: { message: 'Solution updated successfully' },
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

const PORT = parseInt(process.env.SOLUTIONS_SERVICE_PORT || '3004');
app.listen(PORT, () => {
  logger.info(undefined, `Solutions Service listening on port ${PORT}`);
});
