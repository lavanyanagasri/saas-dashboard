export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
  organizationId: string;
  organization?: Organization;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  createdAt: string;
}

export interface Invite {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
  organizationId: string;
  senderId: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  sender?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AuditLog {
  id: string;
  action: string;
  details?: any;
  userId?: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AuthResponse {
  message: string;
  user: User;
  organization?: Organization;
  token: string;
}

export interface ApiResponse<T = any> {
  message?: string;
  error?: string;
  data?: T;
}