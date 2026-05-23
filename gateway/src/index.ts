import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import httpProxy from 'http-proxy';
import {
  requestIdMiddleware,
  authMiddleware,
  errorHandler,
  notFoundHandler,
} from '@zetnet/shared/middleware';
import { logger } from '@zetnet/shared/utils';

const app = express();
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  timeout: 30000,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(req.requestId, `Incoming: ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Service URLs from environment
const SERVICE_URLS = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  computer: process.env.COMPUTER_SERVICE_URL || 'http://localhost:3002',
  travel: process.env.TRAVEL_SERVICE_URL || 'http://localhost:3003',
  solutions: process.env.SOLUTIONS_SERVICE_URL || 'http://localhost:3004',
  enquiry: process.env.ENQUIRY_SERVICE_URL || 'http://localhost:3005',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
};

// Service Routes
app.use('/api/auth', (req: Request, res: Response) => {
  logger.debug(req.requestId, `Routing to auth service: ${req.method} ${req.path}`);
  proxy.web(req, res, { target: SERVICE_URLS.auth }, (error) => {
    logger.error(req.requestId, 'Auth service error', error);
    res.status(503).json({
      success: false,
      error: 'Auth service unavailable',
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
      timestamp: new Date().toISOString(),
    });
  });
});

app.use('/api/computers', (req: Request, res: Response) => {
  logger.debug(req.requestId, `Routing to computer service: ${req.method} ${req.path}`);
  proxy.web(req, res, { target: SERVICE_URLS.computer }, (error) => {
    logger.error(req.requestId, 'Computer service error', error);
    res.status(503).json({
      success: false,
      error: 'Computer service unavailable',
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
      timestamp: new Date().toISOString(),
    });
  });
});

app.use('/api/tours', (req: Request, res: Response) => {
  logger.debug(req.requestId, `Routing to travel service: ${req.method} ${req.path}`);
  proxy.web(req, res, { target: SERVICE_URLS.travel }, (error) => {
    logger.error(req.requestId, 'Travel service error', error);
    res.status(503).json({
      success: false,
      error: 'Travel service unavailable',
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
      timestamp: new Date().toISOString(),
    });
  });
});

app.use('/api/solutions', (req: Request, res: Response) => {
  logger.debug(req.requestId, `Routing to solutions service: ${req.method} ${req.path}`);
  proxy.web(req, res, { target: SERVICE_URLS.solutions }, (error) => {
    logger.error(req.requestId, 'Solutions service error', error);
    res.status(503).json({
      success: false,
      error: 'Solutions service unavailable',
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
      timestamp: new Date().toISOString(),
    });
  });
});

app.use('/api/enquiries', (req: Request, res: Response) => {
  logger.debug(req.requestId, `Routing to enquiry service: ${req.method} ${req.path}`);
  proxy.web(req, res, { target: SERVICE_URLS.enquiry }, (error) => {
    logger.error(req.requestId, 'Enquiry service error', error);
    res.status(503).json({
      success: false,
      error: 'Enquiry service unavailable',
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
      timestamp: new Date().toISOString(),
    });
  });
});

app.use('/api/notifications', (req: Request, res: Response) => {
  logger.debug(req.requestId, `Routing to notification service: ${req.method} ${req.path}`);
  proxy.web(req, res, { target: SERVICE_URLS.notification }, (error) => {
    logger.error(req.requestId, 'Notification service error', error);
    res.status(503).json({
      success: false,
      error: 'Notification service unavailable',
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
      timestamp: new Date().toISOString(),
    });
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Proxy error handler
proxy.on('error', (error, req: Request, res: Response) => {
  logger.error((req as any).requestId, 'Proxy error', error);
  res.status(502).json({
    success: false,
    error: 'Bad gateway',
    code: 'BAD_GATEWAY',
    statusCode: 502,
    timestamp: new Date().toISOString(),
  });
});

const PORT = parseInt(process.env.GATEWAY_PORT || '3000');

app.listen(PORT, () => {
  logger.info(undefined, `API Gateway listening on port ${PORT}`);
  logger.info(undefined, `Auth Service: ${SERVICE_URLS.auth}`);
  logger.info(undefined, `Computer Service: ${SERVICE_URLS.computer}`);
  logger.info(undefined, `Travel Service: ${SERVICE_URLS.travel}`);
  logger.info(undefined, `Solutions Service: ${SERVICE_URLS.solutions}`);
  logger.info(undefined, `Enquiry Service: ${SERVICE_URLS.enquiry}`);
  logger.info(undefined, `Notification Service: ${SERVICE_URLS.notification}`);
});
