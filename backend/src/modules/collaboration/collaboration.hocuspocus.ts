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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    store: async (data: any) => {
                        await collaborationService.storeDocumentState(
                            data.documentName as string,
                            Buffer.from(data.state as Uint8Array)
                        );
                    },
                }),
            ],

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async onAuthenticate(data: any) {
                const token = data.token as string;
                const jwtSecret = configService.get<string>('jwt.secret')!;
                const decoded = jwt.verify(token, jwtSecret) as { sub: string; email: string };

                const user = await collaborationService.validateUser(decoded.sub);
                if (!user) {
                    throw new Error('用户不存在或已被禁用');
                }

                return { user: { id: user.id, name: user.username } };
            },

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async onLoadDocument(data: any) {
                const documentName = data.documentName as string;
                const document = data.document as Y.Doc;
                const state = await collaborationService.loadDocumentState(documentName);
                if (state) {
                    Y.applyUpdate(document, new Uint8Array(state));
                }
            },

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async onChange(data: any) {
                const userId = data.context?.user?.id as string | undefined;
                if (!userId) return;

                const update = Y.encodeStateAsUpdate(data.document as Y.Doc);
                await collaborationService.recordEdit(
                    data.documentName as string,
                    userId,
                    Buffer.from(update)
                );
            },

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async onStoreDocument(data: any) {
                const state = Y.encodeStateAsUpdate(data.document as Y.Doc);
                await collaborationService.storeDocumentState(
                    data.documentName as string,
                    Buffer.from(state)
                );
            },

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async onDisconnect(data: any) {
                const userId = data.context?.user?.id as string | undefined;
                logger.log(`用户 ${userId ?? '未知'} 断开文档 ${data.documentName} 连接`);
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
}
