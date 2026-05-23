import jwt from 'jsonwebtoken';
import { JwtPayload, AuthToken } from '../types/index.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

// JWT Utilities
export const generateTokens = (userId: string, email: string, role: string): AuthToken => {
  const token = jwt.sign(
    {
      sub: userId,
      email,
      role,
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { sub: userId },
    process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return {
    token,
    refreshToken,
    expiresIn: 3600, // 1 hour in seconds
  };
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

export const verifyRefreshToken = (token: string): { sub: string } => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh-secret') as {
      sub: string;
    };
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};

// Validation Utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validatePhone = (phone: string): boolean => {
  // Simple validation: must be at least 10 digits
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10;
};

// Pagination Utilities
export const getPaginationParams = (
  page: any,
  limit: any,
  maxLimit = 100
): { page: number; limit: number; offset: number } => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(parseInt(limit) || 10, maxLimit);
  const offset = (pageNum - 1) * limitNum;

  return { page: pageNum, limit: limitNum, offset };
};

// Logger Utility
export const logger = {
  info: (requestId: string | undefined, message: string, data?: any) => {
    console.log(`[${requestId || 'unknown'}] INFO: ${message}`, data || '');
  },
  error: (requestId: string | undefined, message: string, error?: any) => {
    console.error(`[${requestId || 'unknown'}] ERROR: ${message}`, error || '');
  },
  warn: (requestId: string | undefined, message: string, data?: any) => {
    console.warn(`[${requestId || 'unknown'}] WARN: ${message}`, data || '');
  },
  debug: (requestId: string | undefined, message: string, data?: any) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[${requestId || 'unknown'}] DEBUG: ${message}`, data || '');
    }
  },
};

// Response Utilities
export const successResponse = <T>(data: T, message = 'Success') => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString(),
});

export const errorResponse = (
  statusCode: number,
  error: string,
  code: string,
  details?: any
) => ({
  success: false,
  error,
  code,
  statusCode,
  timestamp: new Date().toISOString(),
  ...(details && { details }),
});
