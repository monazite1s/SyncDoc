// ==================== 枚举 ====================

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum CollaboratorRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

// ==================== 用户 ====================

export interface User {
  id: string;
  email: string;
  username: string;
  nickname?: string;
  avatar?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

// ==================== 文档 ====================

export interface Document {
  id: string;
  title: string;
  description?: string;
  content?: unknown;
  isPublic: boolean;
  status: DocumentStatus;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  collaborators?: DocumentCollaborator[];
}

export interface DocumentCollaborator {
  id: string;
  documentId: string;
  userId: string;
  role: CollaboratorRole;
  addedAt: string;
  user?: User;
}

// ==================== 版本 ====================

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: unknown;
  changeLog?: string;
  createdBy: string;
  createdAt: string;
}

// ==================== API 响应 ====================

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

// ==================== 认证 ====================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  nickname?: string;
}

export interface AuthResponse {
  user: User;
}

// 注意：token 通过 HttpOnly cookie 传递，不在响应体中返回
