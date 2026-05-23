// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  statusCode: number;
  timestamp: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export type UserRole = 'user' | 'admin' | 'moderator';

// JWT Claims
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Auth Tokens
export interface AuthToken {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// Enquiry Types
export interface Enquiry {
  id: string;
  name: string;
  email: string;
  mobile: string;
  service: string;
  message: string;
  status: EnquiryStatus;
  notes?: string;
  assignedTo?: string;
  priority: 'low' | 'normal' | 'high';
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export type EnquiryStatus = 'pending' | 'contacted' | 'resolved' | 'rejected';

// Notification Types
export interface Notification {
  id: string;
  type: NotificationType;
  recipientPhone?: string;
  recipientEmail?: string;
  recipientId?: string;
  templateName?: string;
  status: NotificationStatus;
  subject?: string;
  messageBody: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  sentAt?: string;
  nextRetryAt?: string;
}

export type NotificationType = 'whatsapp' | 'email' | 'sms' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'bounced';

// Product Types (Computer Service)
export interface ComputerProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  stockQuantity: number;
  sku: string;
  specs: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// Tour Types (Travel Service)
export interface Tour {
  id: string;
  name: string;
  destination: string;
  description: string;
  durationDays: number;
  price: number;
  currency: string;
  imageUrl: string;
  maxParticipants: number;
  availableSeats: number;
  startDate: string;
  endDate: string;
  itinerary: TourItinerary[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TourItinerary {
  dayNumber: number;
  title?: string;
  description?: string;
  location?: string;
  activities: string[];
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  description?: string;
  imageUrl?: string;
  popularActivities?: string[];
  bestSeason?: string;
}

// Solution Types (Solutions Service)
export interface Solution {
  id: string;
  name: string;
  category: string;
  description: string;
  longDescription?: string;
  imageUrl: string;
  price: string;
  estimatedTimeline?: string;
  technologies: string[];
  caseStudies: CaseStudy[];
  createdAt: string;
  updatedAt: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  description?: string;
  clientName?: string;
  results?: string;
  imageUrl?: string;
}

// Event Types
export interface ServiceEvent<T = any> {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  data: T;
  version: number;
}

// Service Health
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: Record<string, boolean>;
}

// Error Response
export interface ErrorResponse {
  error: string;
  code: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: Record<string, any>;
}
