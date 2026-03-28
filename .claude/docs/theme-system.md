# 主题系统参考

## 设计风格

中性现代灰调 + Claude 橙强调色。极简、高对比、双模式支持。

## 配色方案

### Light Mode

```
背景: #FAFAFA (98%)    文字: #1A1A1A (10.2%)    强调: #D97757 (Claude 橙)
卡片: #FFFFFF          边框: #E5E5E5 (89.8%)    次要: #F5F5F5 (96.1%)
柔和文字: #737373 (45.1%)   输入框: #E5E5E5      焦点环: #D97757
```

### Dark Mode

```
背景: #0A0A0A (3.9%)   文字: #FAFAFA (98%)     强调: #E08860 (Claude 橙亮)
卡片: #141414 (7.8%)   边框: #262626 (14.9%)   次要: #1A1A1A (10.2%)
柔和文字: #A3A3A3 (63.9%)   输入框: #262626      焦点环: #E08860
```

## CSS 变量 (globals.css)

所有颜色使用 HSL 格式 (不含 hsl() 前缀)，Tailwind 通过 `hsl(var(--xxx))` 引用。

```css
:root {
  --background / --foreground      /* 页面背景/前景 */
  --card / --card-foreground       /* 卡片背景/前景 */
  --primary / --primary-foreground /* 强调色 (Claude 橙) */
  --secondary / --secondary-foreground  /* 次要背景 */
  --muted / --muted-foreground     /* 柔和/禁用状态 */
  --border                         /* 边框 */
  --input                          /* 输入框边框 */
  --ring                           /* 焦点环 */
  --surface / --surface-hover      /* 语义化表面 */
  --sidebar-bg                     /* 侧边栏 */
}
```

## Tailwind 语义化 token

```tsx
// 布局
bg-background text-foreground          // 页面级
bg-card text-card-foreground           // 卡片
bg-secondary text-secondary-foreground // 次要区域
bg-muted text-muted-foreground         // 柔和/禁用

// 交互
bg-primary text-primary-foreground     // 主按钮、强调
border-border                          // 边框
border-input                           // 输入框
focus:ring-ring                        // 焦点环

// 语义化
bg-surface hover:bg-surface-hover      // 表面层
bg-sidebar                             // 侧边栏
```

## 字体

```
--font-sans: Inter (next/font/google)     // 正文
--font-mono: JetBrains Mono               // 代码块
```

使用: `font-sans` / `font-mono` class，已在 layout.tsx 通过 CSS 变量设置。

## 关键文件

| 文件                           | 职责                           |
| ------------------------------ | ------------------------------ |
| `app/globals.css`              | CSS 变量定义 (:root + .dark)   |
| `tailwind.config.ts`           | 语义化颜色映射 + 字体族        |
| `app/layout.tsx`               | 字体引入 + font variable class |
| `providers/theme-provider.tsx` | next-themes 封装               |
| `providers/app-provider.tsx`   | ThemeProvider 组装             |

## 添加新颜色的步骤

1. `globals.css`: 添加 `--new-color: H S L%`
2. `tailwind.config.ts`: 在 colors 中添加映射
3. 使用 `bg-new-color` / `text-new-color`

## 注意事项

- 不硬编码 hex 色值 (除 collaboration cursor 等固定颜色外)
- 滚动条和 ProseMirror placeholder 已使用 CSS 变量
- 添加组件时使用语义化 token，不使用 `text-gray-*` 等 Tailwind 默认色
