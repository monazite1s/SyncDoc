import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { Redis } from '@hocuspocus/extension-redis';
import { Logger as HocuspocusLogger } from '@hocuspocus/extension-logger';
import * as jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import { CollaborationService } from './collaboration.service';

@Injectable()
export class CollaborationHocuspocus {
    private readonly _logger = new Logger(CollaborationHocuspocus.name);
    private _server: ReturnType<typeof Server.configure> | null = null;

    constructor(
        private readonly _configService: ConfigService,
        private readonly _collaborationService: CollaborationService
    ) {}

    async start(port: number): Promise<void> {
        const redisHost = this._configService.get<string>('redis.host', 'localhost');
        const redisPort = this._configService.get<number>('redis.port', 6379);
        const redisPassword = this._configService.get<string>('redis.password');
        const collaborationService = this._collaborationService;
        const configService = this._configService;
        const logger = this._logger;

        this._server = Server.configure({
            port,
            // onStoreDocument 防抖：2s 内无操作才持久化，最长 10s 必存一次
            debounce: 2000,
            maxDebounce: 10000,
            extensions: [
                new HocuspocusLogger(),
                new Redis({
                    host: redisHost,
                    port: redisPort,
                    ...(redisPassword ? { password: redisPassword } : {}),
                }),
                new Database({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    fetch: async (data: any) => {
                        const state = await collaborationService.loadDocumentState(
                            data.documentName as string
                        );
                        if (!state) return null;
                        return new Uint8Array(state);
                    },
                }),
            ],

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async onAuthenticate(data: any) {
                const token = data.token as string;
                const jwtSecret = configService.get<string>('jwt.secret')!;

                let decoded: { sub: string; email: string };
                try {
                    decoded = jwt.verify(token, jwtSecret) as { sub: string; email: string };
                } catch {
                    throw new Error('token 无效或已过期');
                }

                const user = await collaborationService.validateUser(decoded.sub);
                if (!user) {
                    throw new Error('用户不存在或已被禁用');
                }

                // 校验文档访问权限，并设置只读模式
                const access = await collaborationService.getDocumentRole(
                    data.documentName as string,
                    user.id
                );
                if (!access.canAccess) {
                    throw new Error('无权访问此文档');
                }
                if (access.readOnly) {
                    const connection = data.connection as { readOnly?: boolean } | undefined;
                    if (connection) {
                        connection.readOnly = true;
                    }
                }

                return { user: { id: user.id, name: user.username } };
            },

            // onLoadDocument 已移除：Database.fetch 扩展已处理文档加载
            // 保留 onLoadDocument 会导致同一文档两次 DB 查询

            // onChange 已移除：recordEdit 合并到 onStoreDocument，受 debounce 保护

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async onStoreDocument(data: any) {
                const documentName = data.documentName as string;
                const state = Y.encodeStateAsUpdate(data.document as Y.Doc);
                const stateBuffer = Buffer.from(state);

                await collaborationService.storeDocumentState(documentName, stateBuffer);

                const userId = data.context?.user?.id as string | undefined;
                if (userId) {
                    await collaborationService.maybeCreateAutoSnapshot(
                        documentName,
                        userId,
                        stateBuffer
                    );

                    // 记录编辑归属（仅在用户变化时写入）
                    const latestVersion =
                        await collaborationService.getLatestVersionNumber(documentName);
                    await collaborationService.recordEdit(
                        documentName,
                        userId,
                        stateBuffer,
                        latestVersion
                    );
                }
            },

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async onDisconnect(data: any) {
                const documentName = data.documentName as string;
                const userId = data.context?.user?.id as string | undefined;
                logger.log(`用户 ${userId ?? '未知'} 断开文档 ${documentName} 连接`);

                const state = Y.encodeStateAsUpdate(data.document as Y.Doc);
                const stateBuffer = Buffer.from(state);
                await collaborationService.storeDocumentState(documentName, stateBuffer);

                if (userId) {
                    await collaborationService.maybeCreateAutoSnapshot(
                        documentName,
                        userId,
                        stateBuffer,
                        { force: true }
                    );
                }
            },
        });

        await this._server.listen();
        this._logger.log(`Hocuspocus WebSocket 服务器启动在端口 ${port}`);
    }

    async shutdown(): Promise<void> {
        if (this._server) {
            await this._server.destroy();
            this._server = null;
            this._logger.log('Hocuspocus 服务器已关闭');
        }
    }

    /**
     * 向文档的所有在线客户端广播自定义消息
     */
    async broadcastMessage(documentId: string, payload: Record<string, unknown>): Promise<void> {
        if (!this._server) return;

        try {
            const server = this._server as unknown as {
                documents: Map<
                    string,
                    { connections: Map<number, { send: (msg: unknown) => void }> }
                >;
            };
            const docEntry = server.documents.get(documentId);
            if (!docEntry) return;

            const message = JSON.stringify({ type: 'custom', payload });
            for (const connection of docEntry.connections.values()) {
                connection.send(message);
            }
        } catch (error) {
            this._logger.error(`广播消息到文档 ${documentId} 失败: ${(error as Error).message}`);
        }
    }
}
