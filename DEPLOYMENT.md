# 部署指南

> 在任何机器上一键部署协作编辑器

## 目录

- [前置要求](#前置要求)
- [快速部署](#快速部署)
- [详细配置](#详细配置)
- [常见问题](#常见问题)
- [生产环境检查清单](#生产环境检查清单)

---

## 前置要求

### 宿主机需要安装的软件

| 软件               | 最低版本 | 用途       | 安装方式                                                       |
| ------------------ | -------- | ---------- | -------------------------------------------------------------- |
| **Docker**         | 24.0+    | 容器运行时 | [官方文档](https://docs.docker.com/get-docker/)                |
| **Docker Compose** | 2.20+    | 容器编排   | Docker Desktop 自带 / `sudo apt install docker-compose-plugin` |

### 检查是否安装成功

```bash
# 检查 Docker 版本
docker --version
# 输出示例: Docker version 24.0.7, build afdd53b

# 检查 Docker Compose 版本
docker compose version
# 输出示例: Docker Compose version v2.23.0
```

### ⚠️ 不需要在宿主机安装

- ❌ Node.js
- ❌ pnpm / npm / yarn
- ❌ PostgreSQL
- ❌ Redis

**所有依赖都在 Docker 容器内自动安装和管理！**

---

## 快速部署

### 步骤 1: 获取代码

```bash
# 方式 A: Git Clone
git clone <your-repo-url>
cd collab-editor

# 方式 B: 直接复制项目文件夹
# 将整个 collab-editor 文件夹复制到目标机器
```

### 步骤 2: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置（生产环境必须修改！）
nano .env
```

**必须修改的配置项：**

```bash
# 数据库密码（重要！）
DB_PASSWORD=your-secure-password-here

# JWT 密钥（重要！必须生成随机字符串）
JWT_SECRET=run-openssl-rand-base64-32-to-generate

# 前端访问地址
CORS_ORIGIN=https://your-domain.com

# API 地址（公网访问时修改）
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com
```

**生成安全密钥：**

```bash
# 生成 JWT 密钥
openssl rand -base64 32
```

### 步骤 3: 启动服务

```bash
# 构建并启动所有服务（首次部署或代码更新后）
docker compose up -d --build

# 查看启动日志
docker compose logs -f
```

### 步骤 4: 初始化数据库

```bash
# 运行数据库迁移
docker compose exec backend npx prisma migrate deploy

# （可选）填充初始数据
docker compose exec backend npx prisma db seed
```

### 步骤 5: 验证部署

```bash
# 检查所有容器状态
docker compose ps

# 预期输出:
# NAME                    STATUS    PORTS
# collab-editor-db        healthy   0.0.0.0:5432->5432/tcp
# collab-editor-redis     healthy   0.0.0.0:6379->6379/tcp
# collab-editor-backend   healthy   0.0.0.0:3001->3001/tcp
# collab-editor-frontend  healthy   0.0.0.0:3000->3000/tcp
```

**访问服务：**

| 服务       | 地址                                         |
| ---------- | -------------------------------------------- |
| 前端       | http://localhost:3000                        |
| 后端 API   | http://localhost:3001                        |
| 数据库管理 | http://localhost:8080 (需启用 tools profile) |

---

## 详细配置

### Dockerfile 多阶段构建解析

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker 构建流程                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Stage 1: deps (依赖安装)                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  FROM node:20-alpine                                        │   │
│  │  COPY package.json pnpm-lock.yaml                           │   │
│  │  RUN pnpm install --frozen-lockfile                         │   │
│  │                                                             │   │
│  │  ✅ 安装所有 npm 包到 node_modules                          │   │
│  │  ✅ 锁定版本，确保一致性                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  Stage 2: builder (代码构建)                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  COPY --from=deps /app/node_modules ./                      │   │
│  │  COPY . .                                                   │   │
│  │  RUN pnpm build                                             │   │
│  │                                                             │   │
│  │  ✅ 编译 TypeScript → JavaScript                            │   │
│  │  ✅ 打包优化                                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  Stage 3: runner (生产运行)                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  COPY --from=builder /app/dist ./dist                       │   │
│  │  COPY --from=builder /app/node_modules ./                   │   │
│  │                                                             │   │
│  │  ✅ 只包含运行时必需的文件                                   │   │
│  │  ✅ 镜像体积最小化                                           │   │
│  │  ✅ 非 root 用户运行（安全）                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 依赖管理流程图

```
┌────────────────────────────────────────────────────────────────────┐
│                     依赖从哪里来？                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  宿主机 (你的电脑)                                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  collab-editor/                                              │ │
│  │  ├── backend/                                                │ │
│  │  │   ├── package.json      ← 声明依赖                        │ │
│  │  │   └── pnpm-lock.yaml    ← 锁定版本                        │ │
│  │  ├── frontend/                                               │ │
│  │  │   ├── package.json                                        │ │
│  │  │   └── pnpm-lock.yaml                                      │ │
│  │  └── docker-compose.yml                                      │ │
│  │                                                              │ │
│  │  ❌ 不需要 node_modules 文件夹！                              │ │
│  │  ❌ 不需要在宿主机安装 pnpm！                                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                              ↓                                     │
│                     docker compose build                           │
│                              ↓                                     │
│  Docker 容器内部                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  RUN pnpm install --frozen-lockfile                          │ │
│  │                                                              │ │
│  │  ✅ pnpm 从 npm registry 下载所有依赖                         │ │
│  │  ✅ 根据 lock 文件确保版本一致                                 │ │
│  │  ✅ 依赖被锁定在镜像内部，不会变化                             │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 服务架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker 网络架构                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ┌─────────────────────┐                         │
│                    │   宿主机端口映射     │                         │
│                    └─────────────────────┘                         │
│                              │                                      │
│         ┌────────────────────┼────────────────────┐                │
│         ↓                    ↓                    ↓                │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐        │
│  │   :3000     │      │   :3001     │      │   :5432     │        │
│  │  Frontend   │      │   Backend   │      │  PostgreSQL │        │
│  │             │      │             │      │             │        │
│  │  Next.js    │─────▶│  NestJS     │─────▶│   Prisma    │        │
│  │             │ HTTP │             │ SQL  │             │        │
│  └─────────────┘      └──────┬──────┘      └─────────────┘        │
│                              │                                      │
│                              │ WebSocket                            │
│                              ↓                                      │
│                       ┌─────────────┐                              │
│                       │   :6379     │                              │
│                       │    Redis    │                              │
│                       │             │                              │
│                       │  会话/缓存  │                              │
│                       └─────────────┘                              │
│                                                                     │
│                    collab-network (bridge)                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 常用命令

### 服务管理

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f [service_name]

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f frontend
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build

# 仅重新构建某个服务
docker compose up -d --build backend
```

### 数据库操作

```bash
# 进入数据库容器
docker compose exec postgres psql -U collab -d collab_editor

# 备份数据库
docker compose exec postgres pg_dump -U collab collab_editor > backup.sql

# 恢复数据库
cat backup.sql | docker compose exec -T postgres psql -U collab collab_editor
```

### 调试命令

```bash
# 进入后端容器
docker compose exec backend sh

# 进入前端容器
docker compose exec frontend sh

# 检查容器资源使用
docker stats

# 检查网络
docker network ls
docker network inspect collab-editor_collab-network
```

---

## 常见问题

### Q1: 端口被占用怎么办？

```bash
# 查看端口占用
lsof -i :3000
lsof -i :3001

# 修改 .env 中的端口
FRONTEND_PORT=3002
BACKEND_PORT=3002
```

### Q2: 构建失败，提示网络错误？

```bash
# 在 Dockerfile 中添加国内镜像（如果在中国）
# 在 RUN pnpm install 前添加:
RUN pnpm config set registry https://registry.npmmirror.com
```

### Q3: 数据库连接失败？

```bash
# 等待数据库完全启动
docker compose up -d postgres redis
sleep 10
docker compose up -d backend frontend

# 检查数据库健康状态
docker compose ps postgres
```

### Q4: 如何查看容器内的依赖？

```bash
# 查看后端依赖
docker compose exec backend pnpm list

# 查看前端依赖
docker compose exec frontend pnpm list
```

### Q5: 如何启用数据库管理工具？

```bash
# 启动包含 Adminer 的完整服务栈
docker compose --profile tools up -d

# 访问 http://localhost:8080
# 系统: PostgreSQL
# 服务器: postgres
# 用户名: collab
# 密码: (你的密码)
# 数据库: collab_editor
```

---

## 生产环境检查清单

### 部署前

- [ ] 修改 `.env` 中的所有密码和密钥
- [ ] 设置 `JWT_SECRET` 为强随机字符串
- [ ] 配置正确的 `CORS_ORIGIN`
- [ ] 确保 `NODE_ENV=production`

### 安全

- [ ] 不要暴露数据库端口到公网
- [ ] 使用 HTTPS（配置反向代理如 Nginx）
- [ ] 定期备份数据库
- [ ] 定期更新基础镜像

### 性能

- [ ] 根据负载调整容器资源限制
- [ ] 配置 Redis 持久化
- [ ] 启用 Gzip 压缩

### 监控

- [ ] 配置日志收集
- [ ] 设置健康检查告警
- [ ] 监控容器资源使用

---

## 开发环境 vs 生产环境

| 配置项     | 开发环境     | 生产环境   |
| ---------- | ------------ | ---------- |
| `NODE_ENV` | development  | production |
| 数据卷挂载 | 源代码热重载 | 不挂载     |
| 构建产物   | 不优化       | 完全优化   |
| 日志级别   | debug        | warn/error |
| 源码映射   | 启用         | 禁用       |

**开发环境启动：**

```bash
# 使用开发配置（支持热重载）
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

---

## 联系支持

如有问题，请查看日志并提交 Issue：

```bash
# 导出完整日志
docker compose logs > debug.log
```
