import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import {
  authMiddleware,
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
} from '@zetnet/shared/middleware';
import {
  generateTokens,
  validateEmail,
  validatePassword,
  validatePhone,
  logger,
  AppError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
} from '@zetnet/shared/utils';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ============== AUTH ROUTES ==============

// Register
app.post('/api/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName } = req.body;

    // Validation
    if (!email || !password || !fullName) {
      throw new ValidationError('Missing required fields: email, password, fullName');
    }

    if (!validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new ValidationError('Password does not meet requirements', {
        requirements: passwordValidation.errors,
      });
    }

    if (fullName.trim().length < 2) {
      throw new ValidationError('Full name must be at least 2 characters');
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in auth schema
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        full_name: fullName,
        email_verified: false,
      })
      .select()
      .single();

    if (createError) {
      logger.error(req.requestId, 'Error creating user', createError);
      throw new AppError(500, 'DB_ERROR', 'Failed to create user');
    }

    // Assign user role
    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: user.id,
      role: 'user',
    });

    if (roleError) {
      logger.error(req.requestId, 'Error assigning role', roleError);
    }

    logger.info(req.requestId, `User registered: ${email}`);

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: 'user',
      },
      statusCode: 201,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Missing email or password');
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (userError || !user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Get user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    // Generate tokens
    const { token, refreshToken, expiresIn } = generateTokens(
      user.id,
      user.email,
      roleData?.role || 'user'
    );

    // Store refresh token
    await supabase.from('refresh_tokens').insert({
      user_id: user.id,
      token_hash: await bcrypt.hash(refreshToken, 10),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    logger.info(req.requestId, `User logged in: ${email}`);

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        expiresIn,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: roleData?.role || 'user',
        },
      },
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('id', req.user!.id)
      .single();

    if (error || !user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: roleData?.role || 'user',
        createdAt: user.created_at,
      },
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Verify Token
app.post(
  '/api/auth/verify',
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: {
          valid: true,
          userId: req.user!.id,
          email: req.user!.email,
          role: req.user!.role,
        },
        statusCode: 200,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Refresh Token
app.post('/api/auth/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Missing refresh token');
    }

    // Find refresh token in database
    const { data: tokenData } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('revoked', false)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!tokenData) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Verify token matches
    const isValid = await bcrypt.compare(refreshToken, tokenData.token_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Get user and role
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', tokenData.user_id)
      .single();

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', tokenData.user_id)
      .single();

    // Generate new tokens
    const { token: newToken, refreshToken: newRefreshToken } = generateTokens(
      tokenData.user_id,
      user!.email,
      roleData?.role || 'user'
    );

    logger.info(req.requestId, `Token refreshed for user: ${tokenData.user_id}`);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
      statusCode: 200,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Logout
app.post(
  '/api/auth/logout',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Revoke refresh tokens
      await supabase
        .from('refresh_tokens')
        .update({ revoked: true })
        .eq('user_id', req.user!.id);

      logger.info(req.requestId, `User logged out: ${req.user!.email}`);

      res.json({
        success: true,
        data: { message: 'Logout successful' },
        statusCode: 200,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

const PORT = parseInt(process.env.AUTH_SERVICE_PORT || '3001');

app.listen(PORT, () => {
  logger.info(undefined, `Auth Service listening on port ${PORT}`);
});
