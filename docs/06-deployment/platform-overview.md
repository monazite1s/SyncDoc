# 免费平台概览

## GitHub 生态

### GitHub

| 特性           | 免费版        |
| -------------- | ------------- |
| 私有仓库       | 无限          |
| 协作者         | 无限          |
| GitHub Actions | 2,000 分钟/月 |
| Packages       | 500MB 存储    |
| Pages          | 1GB 存储      |

**用途**：

- 代码托管
- CI/CD 流水线
- 项目管理

### GitHub Actions

```yaml
# 月度限制
- Linux: 2,000 分钟
- Windows: 1,000 分钟
- macOS: 200 分钟

- 存储: 500MB
```

## 前端平台

### Vercel

| 特性     | 免费版           |
| -------- | ---------------- |
| 带宽     | 100GB/月         |
| 构建     | 6,000 分钟/月    |
| 部署     | 无限             |
| 域名     | 1 个 .vercel.app |
| 团队成员 | 1 人             |

**优势**：

- Next.js 官方支持
- 自动预览部署
- Edge Functions
- 零配置部署

**限制**：

- Serverless 函数 10 秒超时
- WebSocket 不支持（需要外部服务）

### Netlify (备选)

| 特性 | 免费版       |
| ---- | ------------ |
| 带宽 | 100GB/月     |
| 构建 | 300 分钟/月  |
| 函数 | 125K 调用/月 |

## 后端平台

### Railway

| 特性 | 免费版       |
| ---- | ------------ |
| 额度 | $5/月        |
| 内存 | 512MB - 8GB  |
| CPU  | 0.5 - 8 vCPU |
| 存储 | 1GB          |

**优势**：

- 支持 WebSocket
- 支持持久连接
- 自动扩缩容
- 数据库集成

**定价**：

- $5 额度可运行约 512MB + 1GB 存储 1 个月
- 超出后按量计费

### Render

| 特性 | 免费版      |
| ---- | ----------- |
| 实例 | 750 小时/月 |
| 内存 | 512MB       |
| CPU  | 0.1 vCPU    |
| 带宽 | 100GB/月    |

**优势**：

- 完全免费
- 自动休眠（15 分钟无请求）
- 支持 WebSocket

**限制**：

- 冷启动延迟
- 低 CPU 配置
- 休眠影响实时性

### Fly.io (备选)

| 特性 | 免费版       |
| ---- | ------------ |
| VM   | 3 个共享 CPU |
| 内存 | 256MB        |
| 存储 | 3GB          |
| 带宽 | 160GB/月     |

## 数据库平台

### Neon (PostgreSQL)

| 特性     | 免费版      |
| -------- | ----------- |
| 项目     | 1 个        |
| 数据库   | 10 个       |
| 存储     | 0.5GB       |
| 计算时间 | 300 小时/月 |
| 分支     | 10 个       |

**优势**：

- Serverless 架构
- 自动扩缩容
- 数据库分支
- 即时克隆

**连接**：

```
postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require
```

### Supabase (备选)

| 特性   | 免费版      |
| ------ | ----------- |
| 项目   | 2 个        |
| 数据库 | 500MB       |
| 存储   | 1GB         |
| 带宽   | 5GB/月      |
| 认证   | 50,000 用户 |

**优势**：

- 内置认证
- 实时订阅
- 存储服务
- Edge Functions

### PlanetScale (备选)

| 特性   | 免费版     |
| ------ | ---------- |
| 存储   | 5GB        |
| 行读取 | 1 亿/月    |
| 行写入 | 1000 万/月 |
| 分支   | 1 个       |

**限制**：

- 不支持外键
- MySQL 兼容

## 缓存平台

### Upstash (Redis)

| 特性   | 免费版    |
| ------ | --------- |
| 数据库 | 1 个      |
| 存储   | 256MB     |
| 命令   | 10,000/天 |
| 带宽   | 10GB/月   |

**优势**：

- Serverless
- REST API
- 全球复制
- 持久化

**连接**：

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: 'https://xxx.upstash.io',
    token: 'xxx',
});
```

### Redis Cloud (备选)

| 特性   | 免费版  |
| ------ | ------- |
| 数据库 | 1 个    |
| 存储   | 30MB    |
| 连接   | 30 个   |
| 带宽   | 10GB/月 |

## CDN 和 DNS

### Cloudflare

| 特性     | 免费版          |
| -------- | --------------- |
| 带宽     | 无限            |
| DNS 记录 | 无限            |
| SSL      | 免费            |
| WAF      | 基础规则        |
| Workers  | 100,000 请求/天 |

**用途**：

- CDN 加速
- DNS 托管
- SSL 证书
- DDoS 防护

### 配置示例

```yaml
# DNS 配置
类型: CNAME
名称: app
内容: your-app.vercel.app
代理: 已启用

类型: CNAME
名称: api
内容: your-app.railway.app
代理: 已启用
```

## 平台对比

### 后端平台对比

| 特性      | Railway    | Render | Fly.io |
| --------- | ---------- | ------ | ------ |
| WebSocket | ✅         | ✅     | ✅     |
| 免费可用  | ⚠️ $5 额度 | ✅     | ✅     |
| 冷启动    | ❌         | ⚠️ 有  | ❌     |
| 内存      | 512MB+     | 512MB  | 256MB  |
| 部署体验  | 优秀       | 良好   | 良好   |

### 数据库平台对比

| 特性       | Neon  | Supabase | PlanetScale |
| ---------- | ----- | -------- | ----------- |
| PostgreSQL | ✅    | ✅       | ❌ (MySQL)  |
| Serverless | ✅    | ✅       | ✅          |
| 免费存储   | 0.5GB | 500MB    | 5GB         |
| 分支       | ✅    | ❌       | ✅          |
| 认证       | ❌    | ✅       | ❌          |

## 推荐组合

### 方案 A：性能优先

```
前端: Vercel
后端: Railway ($5/月)
数据库: Neon
缓存: Upstash
CDN: Cloudflare
```

### 方案 B：完全免费

```
前端: Vercel
后端: Render (免费实例)
数据库: Neon
缓存: Upstash
CDN: Cloudflare
```

### 方案 C：功能丰富

```
前端: Vercel
后端: Railway
数据库: Supabase (含认证)
缓存: Upstash
CDN: Cloudflare
```

## 相关文档

- [Vercel 前端部署](./vercel-deploy.md)
- [Railway/Render 后端部署](./railway-render.md)
- [数据库配置](./database-setup.md)
