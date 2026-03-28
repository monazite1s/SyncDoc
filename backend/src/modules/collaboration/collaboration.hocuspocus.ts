import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, onAuthenticatePayload, onLoadDocumentPayload, onChangePayload, onStoreDocumentPayload, onDisconnectPayload } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { Redis } from '@hocuspocus/extension-redis';
import { Logger as HocuspocusLogger } from '@hocuspocus/extension-logger';
import * as Jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import { CollaborationService } from './collaboration.service';

@Injectable()
export class CollaborationHocuspocus {
  private readonly _logger = new Logger(CollaborationHocuspocus.name);
  private _server: Server | null = null;

  constructor(
    private readonly _configService: ConfigService,
    private readonly _collaborationService: CollaborationService,
  ) {}

  async start(port: number): Promise<void> {
    const redisHost = this._configService.get<string>('redis.host', 'localhost');
    const redisPort = this._configService.get<number>('redis.port', 6379);
    const redisPassword = this._configService.get<string>('redis.password');

    this._server = Server.configure({
      port,
      extensions: [
        new HocuspocusLogger(),
        new Redis({
          host: redisHost,
          port: redisPort,
          ...(redisPassword && { password: redisPassword }),
        }),
        new Database({
          fetch: async ({ documentName }: onLoadDocumentPayload) => {
            const state = await this._collaborationService.loadDocumentState(documentName);
            return state ?? undefined;
          },
          store: async ({ documentName, state }: onStoreDocumentPayload & { state: Buffer }) => {
            await this._collaborationService.storeDocumentState(documentName, state);
          },
        }),
      ],

      onAuthenticate: async ({ token }: onAuthenticatePayload) => {
        const jwtSecret = this._configService.get<string>('jwt.secret');
        try {
          const decoded = Jwt.verify(token, jwtSecret) as { sub: string; email: string };
          const userId = decoded.sub;

          // 验证用户是否存在且活跃
          const user = await this._collaborationService.validateUser(userId);
          if (!user) {
            throw new Error('用户不存在或已被禁用');
          }

          return { user: { id: user.id, name: user.username } };
        } catch (error) {
          throw new Error('认证失败');
        }
      },

      onLoadDocument: async ({ documentName, document }: onLoadDocumentPayload) => {
        const state = await this._collaborationService.loadDocumentState(documentName);
        if (state) {
          Y.applyUpdate(document, state);
        }
      },

      onChange: async ({ documentName, document, context }: onChangePayload) => {
        const userId = (context as { user?: { id: string } })?.user?.id;
        if (!userId) return;

        const update = Y.encodeStateAsUpdate(document);
        await this._collaborationService.recordEdit(documentName, userId, Buffer.from(update));
      },

      onStoreDocument: async ({ documentName, document }: onStoreDocumentPayload) => {
        const state = Y.encodeStateAsUpdate(document);
        await this._collaborationService.storeDocumentState(documentName, Buffer.from(state));
      },

      onDisconnect: async ({ documentName, context }: onDisconnectPayload) => {
        const userId = (context as { user?: { id: string } })?.user?.id;
        this._logger.log(`用户 ${userId ?? '未知'} 断开文档 ${documentName} 连接`);
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
