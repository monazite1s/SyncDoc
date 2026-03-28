# Git 工作流

## 概述

本文档定义协同文档编辑系统的 Git 工作流程、分支策略和代码提交规范。

---

## 1. Commit 消息规范

### 1.1 消息格式

```
<type>: <description>

[optional body]

[optional footer]
```

### 1.2 提交类型

| 类型       | 说明                   | 示例                              |
| ---------- | ---------------------- | --------------------------------- |
| `feat`     | 新功能                 | `feat: 添加文档版本历史功能`      |
| `fix`      | Bug 修复               | `fix: 修复协同编辑时光标位置错误` |
| `refactor` | 重构（不改变功能）     | `refactor: 优化文档加载性能`      |
| `docs`     | 文档更新               | `docs: 更新 API 接口文档`         |
| `test`     | 测试相关               | `test: 添加用户认证单元测试`      |
| `chore`    | 构建/工具相关          | `chore: 更新 ESLint 配置`         |
| `perf`     | 性能优化               | `perf: 优化大文档渲染性能`        |
| `ci`       | CI/CD 相关             | `ci: 添加自动化测试流水线`        |
| `style`    | 代码格式（不影响逻辑） | `style: 格式化代码缩进`           |

### 1.3 消息示例

**简单提交：**

```
feat: 添加文档导出 PDF 功能
```

**详细提交：**

```
feat: 添加文档版本历史功能

- 支持查看历史版本列表
- 支持版本内容预览
- 支持版本对比（Diff）
- 支持版本回滚操作

Closes #123
```

**Breaking Change：**

```
refactor: 重构认证 API 接口

BREAKING CHANGE: 认证接口从 /auth 迁移到 /api/v1/auth
- /auth/login → /api/v1/auth/login
- /auth/register → /api/v1/auth/register
- /auth/logout → /api/v1/auth/logout
```

### 1.4 提交规范

1. **使用祈使句** - "添加功能" 而非 "添加了功能"
2. **首字母小写** - `feat: 添加` 而非 `feat: 添加`
3. **不使用句号结尾** - `feat: 添加功能` 而非 `feat: 添加功能。`
4. **正文说明原因** - 解释为什么做这个改动
5. **关联 Issue** - 使用 `Closes #123` 或 `Fixes #123`

---

## 2. 分支策略

### 2.1 分支类型

| 分支类型   | 命名规范              | 说明             |
| ---------- | --------------------- | ---------------- |
| 主分支     | `main`                | 生产环境代码     |
| 功能分支   | `feature/<功能名>`    | 新功能开发       |
| 修复分支   | `fix/<问题描述>`      | Bug 修复         |
| 重构分支   | `refactor/<重构内容>` | 代码重构         |
| 发布分支   | `release/<版本号>`    | 版本发布准备     |
| 热修复分支 | `hotfix/<问题描述>`   | 生产环境紧急修复 |

### 2.2 分支命名示例

```bash
# 功能分支
feature/document-export
feature/user-profile
feature/realtime-collaboration

# 修复分支
fix/login-redirect
fix/editor-cursor-position
fix/memory-leak

# 重构分支
refactor/auth-module
refactor/state-management

# 发布分支
release/v1.0.0
release/v1.1.0

# 热修复分支
hotfix/security-patch
hotfix/critical-bug
```

### 2.3 分支工作流

```
main ─────●─────●─────●─────●─────●─────→
          \           /           /
           \         /           /
feature/A  ●───●───●            /
                              /
feature/B      ●───●───●─────●
```

**流程说明：**

1. 从 `main` 创建功能分支
2. 在功能分支上开发、提交
3. 开发完成后创建 PR
4. Code Review 通过后合并到 `main`
5. 删除已合并的功能分支

---

## 3. Pull Request 流程

### 3.1 创建 PR

1. **确保代码质量**

    ```bash
    pnpm lint
    pnpm type-check
    pnpm test
    ```

2. **创建 PR**

    ```bash
    # 推送分支
    git push -u origin feature/your-feature

    # 使用 GitHub CLI 创建 PR
    gh pr create --title "feat: 添加文档导出功能" --body "..."
    ```

### 3.2 PR 标题规范

PR 标题应遵循与 commit 消息相同的格式：

```
<type>: <description>
```

**示例：**

- `feat: 添加文档版本历史功能`
- `fix: 修复协同编辑时光标位置错误`
- `refactor: 重构认证模块`

### 3.3 PR 描述模板

```markdown
## Summary

<!-- 简要描述这个 PR 做了什么 -->

## Changes

<!-- 列出主要改动 -->

- 添加版本历史组件
- 实现版本列表 API
- 添加版本对比功能

## Test Plan

<!-- 如何测试这些改动 -->

- [ ] 单元测试通过
- [ ] 手动测试版本创建流程
- [ ] 手动测试版本回滚功能
- [ ] 检查移动端适配

## Screenshots

<!-- 如有 UI 改动，附上截图 -->

## Related Issues

<!-- 关联的 Issue -->

Closes #123
```

### 3.4 Code Review 检查项

**代码质量：**

- [ ] 代码符合编码规范
- [ ] 没有明显的性能问题
- [ ] 错误处理完善
- [ ] 没有安全漏洞

**测试：**

- [ ] 有足够的测试覆盖
- [ ] 测试用例有意义
- [ ] CI 测试通过

**文档：**

- [ ] API 变更有文档更新
- [ ] 复杂逻辑有注释说明

---

## 4. 常用 Git 命令

### 4.1 分支操作

```bash
# 创建并切换分支
git checkout -b feature/new-feature

# 切换分支
git checkout main

# 查看所有分支
git branch -a

# 删除本地分支
git branch -d feature/old-feature

# 删除远程分支
git push origin --delete feature/old-feature
```

### 4.2 提交操作

```bash
# 添加文件到暂存区
git add <file>
git add .  # 添加所有文件

# 提交
git commit -m "feat: 添加新功能"

# 修改最后一次提交（未 push 时）
git commit --amend

# 撤销最后一次提交（保留改动）
git reset --soft HEAD~1
```

### 4.3 同步操作

```bash
# 拉取远程更新
git pull origin main

# 推送到远程
git push origin feature/new-feature

# 推送新分支并设置上游
git push -u origin feature/new-feature
```

### 4.4 合并操作

```bash
# 合并分支
git checkout main
git merge feature/new-feature

# 变基（推荐用于保持历史整洁）
git checkout feature/new-feature
git rebase main
```

### 4.5 撤销操作

```bash
# 撤销工作区修改
git checkout -- <file>

# 撤销暂存
git reset HEAD <file>

# 撤销 commit（保留修改）
git reset --soft HEAD~1

# 撤销 commit（丢弃修改）- 危险操作
git reset --hard HEAD~1
```

---

## 5. Commitizen 配置

项目使用 Commitizen 规范化提交消息。

### 5.1 使用方法

```bash
# 代替 git commit
pnpm commit

# 或
git cz
```

### 5.2 交互式提交流程

```
? 选择提交类型: feat:     ✨  新增功能
? 输入提交描述: 添加文档导出 PDF 功能
? 是否有正文描述? No
? 是否有破坏性变更? No
? 关联的 Issue 编号: 123
```

---

## 6. Husky 钩子

项目使用 Husky 进行 Git 钩子管理。

### 6.1 pre-commit

每次提交前自动运行 lint-staged：

```bash
# .husky/pre-commit
pnpm lint-staged
```

### 6.2 commit-msg

每次提交消息验证：

```bash
# .husky/commit-msg
npx --no -- commitlint --edit "$1"
```

### 6.3 跳过钩子（不推荐）

```bash
# 仅在特殊情况下使用
git commit --no-verify -m "emergency fix"
```

---

## 7. 版本发布

### 7.1 版本号规范

遵循 [Semantic Versioning](https://semver.org/)：

```
MAJOR.MINOR.PATCH

- MAJOR: 不兼容的 API 变更
- MINOR: 向后兼容的功能新增
- PATCH: 向后兼容的问题修复
```

### 7.2 发布流程

```bash
# 1. 创建发布分支
git checkout -b release/v1.0.0

# 2. 更新版本号
pnpm version minor  # 或 major, patch

# 3. 更新 CHANGELOG
# ...

# 4. 合并到 main
git checkout main
git merge release/v1.0.0

# 5. 打标签
git tag v1.0.0

# 6. 推送
git push origin main --tags
```

---

## 8. 相关文档

- [编码规范](./coding-standards.md)
- [测试指南](./testing-guide.md)
- [部署指南](../06-deployment/README.md)
