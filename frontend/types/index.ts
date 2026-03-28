// 从共享类型包 re-export，保持向后兼容
// 后续逐步将 import 路径改为 @collab/types
export type {
    User,
    Document,
    DocumentCollaborator,
    DocumentVersion,
    ApiResponse,
    ApiError,
    LoginCredentials,
    RegisterCredentials,
    AuthResponse,
} from '@collab/types';

export { UserStatus, DocumentStatus, CollaboratorRole } from '@collab/types';
