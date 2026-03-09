# CPC Helper (Contest App) 项目维护文档 v1.3.3

## 1. 项目概述 (Project Overview)

本项目是一个基于 **Tauri v2** (Rust) + **React** (TypeScript/Vite) 的跨平台桌面应用，专为算法竞赛选手设计。核心宗旨是“聚合”与“直观”，通过统一的界面管理多平台比赛日程、个人战绩以及每日刷题计划。

**当前版本 (v1.3.3) 状态**：

* **功能特性**：包含活跃度热力图、比赛日程转 Todo、多平台（CF/LC/HDU等）战绩爬虫、支持多日跨度的刷题计划池。
* **近期修复**：修复了 CI/CD 跨平台构建时的严格 TypeScript 类型报错，统一了 `DashboardGrid` 容器组件与 `PlatformCard` 子组件的属性传递逻辑，并清理了未使用的 Hooks。
* **构建系统**：使用 GitHub Actions 自动进行跨平台编译（Windows/macOS/Ubuntu）并发布 Release。前端代码中保留了 `@tauri-apps/plugin-updater` 自动更新检测逻辑，但 CI 流程当前可能未生成 `latest.json`。

**核心技术栈**：

* **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts.
* **Backend**: Rust (Tauri v2), Reqwest (异步爬虫), Tokio, Scraper.
* **Storage**: LocalStorage (持久化 Todo & 热力图数据).
* **CI/CD**: GitHub Actions (纯构建与发布).

---

## 2. 完整的目录结构 (Directory Structure)

```text
cpc_helper/
├── .github/
│   └── workflows/
│       └── release.yml     # [核心] 自动化构建脚本
├── src/                    # 前端源码 (React + TS)
│   ├── components/
│   │   ├── DashboardGrid.tsx # [核心] 战绩仪表盘容器，负责遍历渲染 PlatformCard
│   │   ├── ActivityHeatmap.tsx # 活跃度热力图
│   │   ├── ContestList.tsx   # 比赛列表 (含日程同步逻辑)
│   │   ├── TodoPanel.tsx     # 待办面板 (支持多日跨度与进度计算)
│   │   ├── DatePicker.tsx    # 自定义日期选择组件
│   │   ├── SettingsDrawer.tsx# 界面外观设置抽屉
│   │   └── Icons.tsx         # SVG 图标库
│   ├── services/
│   │   └── contestService.ts # 包含 fetchUserStats 等与后端/外部通信的逻辑
│   ├── types/
│   │   └── index.ts          # 全局类型定义 (如 UserStats)
│   ├── utils/
│   │   ├── history.ts        # 热力图数据快照与差分计算
│   │   └── index.ts          # 工具函数 (如 hexToRgba, 平台颜色映射)
│   └── App.tsx               # 应用根组件，包含 Tab 路由、全局状态与自动更新逻辑
├── src-tauri/              # 后端源码 (Rust)
│   ├── src/
│   │   ├── platforms/      # 爬虫实现
│   │   │   ├── codeforces.rs # CF API (含严格去重逻辑)
│   │   │   ├── leetcode.rs   # LC 混合策略 (国际服查数据，国服生成链接)
│   │   │   └── hdu.rs        # HDU HTML 解析
│   │   ├── models.rs       # 数据结构定义
│   │   └── main.rs         # Tauri 命令注册与主入口
│   └── tauri.conf.json     # Tauri 配置文件
├── package.json            # 前端依赖与脚本配置
└── tsconfig.json           # TypeScript 严格模式配置

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1. 活跃度热力图 (Activity Heatmap)

* **机制**：前端被动快照。每次刷新战绩时，对比“今日已记录总数”与“当前获取总数”，取最大值存入 `localStorage`。
* **计算**：热力图每日数据 = `History[Today] - History[Yesterday]`。

### 3.2. 跨组件通讯 (Event Bus)

* **方案**：不使用 Redux 等重型状态管理，采用轻量级 `window.dispatchEvent`。
* **流程**：`ContestList` 添加比赛 -> 触发 `cpc_todo_update` 事件 -> `TodoPanel` 监听到事件后重新读取 LocalStorage 刷新列表。

### 3.3. UI 容器与组件拆分架构

* **Dashboard 模式**：采用“容器-木偶组件”模式。`DashboardGrid` 作为容器统一管理支持的平台列表，并将公共样式（如 `cardStyle`）分发给底层的 `PlatformCard` 组件，避免了 `App.tsx` 直接调用底层卡片引发的 Props 类型不匹配问题。
* **Todo 进度模型**：任务包含 `startDate` 和 `duration`。通过计算当前时间戳与任务周期的比例，动态映射任务状态（Scheduled, Early Stage, In Progress, Deadline Near, Overdue）。

### 3.4. 爬虫策略 (Crawler Strategies)

* **Codeforces**：使用 `user.status` API 获取提交记录，通过 `HashSet` 存储 `${contestId}-${index}` 实现去重，以接近主页显示的“Solved”数量。
* **LeetCode**：
* **查询**：使用国际服 (`leetcode.com`) GraphQL API (稳定性高)。
* **展示**：后端强行替换 URL 域名为 `leetcode.cn`，确保用户点击跳转至国服。



---

## 4. 维护指南 (Maintenance Guide)

### 4.1. 常用命令

* **开发环境**：`npm run tauri dev`
* **手动构建**：`npm run tauri build`

### 4.2. AI 协作与代码修改规范

1. **“先看后改”原则**：在修改任何组件前，必须先索取目标文件的完整源码，了解其现有的 Interface 定义和导出逻辑，严禁主观臆测。
2. **严格的类型与 Lint 检查**：CI/CD 环节（如 Ubuntu/macOS 上的 `npm run tauri build`）对 TypeScript 报错和 ESLint 警告（例如未使用的 Hooks 如 `useMemo`）采取零容忍策略，会导致 Action 直接失败。提交代码前务必确保本地编译无警告。
3. **原子化交付**：提交代码时需提供被修改文件的**完整代码**并标明路径，不可省略上下文，确保复制粘贴的安全性。

### 4.3. 发布新版本

1. 修改 `package.json` 和 `src-tauri/tauri.conf.json` 中的版本号。
2. 提交代码并打 Tag (例如 `git tag v1.3.3` -> `git push origin v1.3.3`)。
3. Action 会自动编译各平台版本并上传构建产物，前往 GitHub Releases 页面编辑 Draft Release 并正式发布。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1. 组件容器化设计规范 (`src/components/DashboardGrid.tsx`)

*修复类型冲突的标准示范，隔离了页面级调用和组件级 Props 的差异。*

```tsx
// 暴露给 App.tsx 的容器级 Interface
interface DashboardGridProps {
  cardStyle: any;
}

const DashboardGrid: React.FC<DashboardGridProps> = ({ cardStyle }) => {
  const platforms = [
    { name: 'Codeforces', key: 'codeforces', enabled: true },
    { name: 'LeetCode', key: 'leetcode', enabled: true },
    // ...
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {platforms.map(p => (
        <PlatformCard // 底层卡片级组件
          key={p.key}
          platformName={p.name}
          platformKey={p.key}
          isEnabled={p.enabled}
          cardStyle={cardStyle}
        />
      ))}
    </div>
  );
};
export default DashboardGrid;

```

### 5.2. 前端事件监听 (`src/components/TodoPanel.tsx`)

```typescript
useEffect(() => {
  loadItems();
  // 监听来自 ContestList 的更新事件
  const handleUpdate = () => loadItems();
  window.addEventListener('cpc_todo_update', handleUpdate);
  return () => window.removeEventListener('cpc_todo_update', handleUpdate);
}, [loadItems]);

```

### 5.3. GitHub Action 配置 (`.github/workflows/release.yml`)

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  publish-tauri:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, ubuntu-22.04, windows-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - name: setup node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*
      - name: install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}
      - name: install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
      - name: install frontend dependencies
        run: npm install
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: v__VERSION__
          releaseName: 'CPC Helper v__VERSION__'
          releaseBody: 'See the assets to download this version and install.'
          releaseDraft: true
          prerelease: false

```

---

## 6. 尚未解决的问题 (Known Issues)

1. **自动更新配置割裂**：前端 `App.tsx` 中仍保留了 `@tauri-apps/plugin-updater` 的弹窗与热更逻辑，但目前的 CI/CD 发布流程中未配置生成 `latest.json`。这会导致前端的更新检查永远无法探测到新版本。后续需决定是彻底移除前端 Updater 代码，还是补全 Action 中的 updater 编译链。
2. **Codeforces 数据微差**：API 包含 Gym/私有比赛数据，总数可能略高于个人主页显示的公开题数。
3. **反爬虫风险**：高频刷新可能导致 IP 被暂时封禁，前端需保持并完善 Debounce / 节流逻辑。
4. **数据备份方案缺失**：所有 Todo 和热力图数据硬绑定在 LocalStorage，一旦浏览器内核清理缓存将导致数据永久丢失。急需开发导出/导入 JSON 文件的本地备份功能。