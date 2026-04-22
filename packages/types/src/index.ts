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

/**
 * JWT 原始 payload（签发和解析时使用）
 * - sub: 用户 ID（JWT 标准字段）
 * - email: 用户邮箱
 */
export interface AuthJwtPayload {
    sub: string;
    email: string;
}

/**
 * 经过 JwtStrategy.validate() 转换后的 req.user 类型
 */
export interface RequestUser {
    userId: string;
    email: string;
}

// ==================== 文档列表 ====================

export interface DocumentListItem {
    id: string;
    title: string;
    description?: string;
    isPublic: boolean;
    status: DocumentStatus;
    authorId: string;
    createdAt: string;
    updatedAt: string;
    author: Pick<User, 'id' | 'username' | 'nickname'>;
    userRole: CollaboratorRole | null;
    collaboratorCount: number;
}

export interface CreateDocumentRequest {
    title: string;
    description?: string;
}

export interface UpdateDocumentRequest {
    title?: string;
    description?: string;
    isPublic?: boolean;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

// ==================== 编辑器 ====================

/** GET /api/auth/ws-token 响应 */
export interface WsTokenResponse {
    token: string;
}

/** GET /api/documents/:id 响应（含完整协作者列表） */
export interface DocumentDetail {
    id: string;
    title: string;
    description?: string;
    isPublic: boolean;
    status: DocumentStatus;
    authorId: string;
    createdAt: string;
    updatedAt: string;
    author: Pick<User, 'id' | 'username' | 'nickname'>;
    userRole: CollaboratorRole | null;
    collaboratorCount: number;
    collaborators: Array<{
        userId: string;
        role: CollaboratorRole;
        user: Pick<User, 'id' | 'username' | 'nickname'>;
    }>;
}

// ==================== 文档查看页 ====================

/** GET /api/documents/:id/view 响应 */
export interface DocumentViewContent {
    id: string;
    title: string;
    description?: string;
    isPublic: boolean;
    status: DocumentStatus;
    authorId: string;
    createdAt: string;
    updatedAt: string;
    author: Pick<User, 'id' | 'username' | 'nickname'>;
    userRole: CollaboratorRole | null;
    collaboratorCount: number;
    collaborators: Array<{
        userId: string;
        role: CollaboratorRole;
        user: Pick<User, 'id' | 'username' | 'nickname'>;
    }>;
    /** Yjs 二进制状态的 Base64 编码，前端转换为 HTML 渲染 */
    contentBase64?: string;
    /** 最新快照版本号 */
    latestVersion?: number;
    /** 最后编辑者 */
    lastEditedBy?: Pick<User, 'id' | 'username' | 'nickname'>;
}

/** GET /api/documents/:id/content 响应 */
export interface DocumentContentResponse {
    content: string; // Base64 编码的 Yjs 状态
}

// ==================== 版本管理 ====================

/** 版本列表项（不含二进制 content） */
export interface DocumentVersionItem {
    id: string;
    documentId: string;
    version: number;
    changeLog?: string;
    createdBy: string;
    createdAt: string;
    author: Pick<User, 'id' | 'username' | 'nickname'>;
}

/** 版本详情（含 Base64 编码的内容） */
export interface DocumentVersionDetail extends DocumentVersionItem {
    contentBase64: string;
}

/** POST /api/documents/:id/versions 请求 */
export interface CreateVersionRequest {
    changeLog?: string;
}

/** POST /api/documents/:id/versions/diff 请求 */
export interface VersionDiffRequest {
    fromVersion: number;
    toVersion: number;
}

/** POST /api/documents/:id/versions/diff 响应 */
export interface VersionDiffResponse {
    fromVersion: number;
    toVersion: number;
    diffHtml: string;
}
