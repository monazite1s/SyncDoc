// User types
export interface User {
  id: string;
  email: string;
  username: string;
  nickname?: string;
  avatar?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

// Document types
export interface Document {
  id: string;
  title: string;
  description?: string;
  content?: unknown;
  isPublic: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'DELETED';
  authorId: string;
  createdAt: string;
  updatedAt: string;
  collaborators?: DocumentCollaborator[];
}

export interface DocumentCollaborator {
  id: string;
  documentId: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  addedAt: string;
  user?: User;
}

// Version types
export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: unknown;
  changeLog?: string;
  createdBy: string;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}
