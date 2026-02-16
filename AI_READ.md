# CPC Helper (Contest App) 项目维护文档 v1.3.1

## 1. 项目概述 (Project Overview)

本项目是一个基于 **Tauri v2** (Rust) + **React** (TypeScript/Vite) 的跨平台桌面应用，专为算法竞赛选手设计。核心宗旨是“聚合”与“直观”，通过统一的界面管理多平台比赛日程、个人战绩以及每日刷题计划。

**当前版本 (v1.3.1) 状态**：

* **功能特性**：包含活跃度热力图、比赛日程转 Todo、多平台（CF/LC/HDU）战绩爬虫。
* **构建系统**：使用 GitHub Actions 自动进行跨平台编译（Windows/macOS/Ubuntu）并发布 Release，但**已移除**自动更新（Auto-Updater）功能，仅提供手动下载安装包。

**核心技术栈**：

* **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts.
* **Backend**: Rust (Tauri v2), Reqwest (异步爬虫), Tokio, Scraper.
* **Storage**: LocalStorage (持久化 Todo & 热力图数据).
* **CI/CD**: GitHub Actions (纯构建与发布).

---

## 2. 目录结构 (Directory Structure)

```text
cpc_helper/
├── .github/
│   └── workflows/
│       └── release.yml     # [核心] 自动化构建脚本 (无自动更新逻辑)
├── src/                    # 前端源码 (React + TS)
│   ├── components/
│   │   ├── DashboardGrid.tsx   # [核心] 战绩仪表盘
│   │   ├── ActivityHeatmap.tsx # 活跃度热力图
│   │   ├── ContestList.tsx     # 比赛列表 (含日程同步逻辑)
│   │   ├── TodoPanel.tsx       # 待办面板 (监听 DOM 事件)
│   │   └── ...
│   ├── utils/
│   │   ├── history.ts          # 热力图数据快照与差分计算
│   │   └── index.ts
│   └── App.tsx
├── src-tauri/              # 后端源码 (Rust)
│   ├── src/
│   │   ├── platforms/      # 爬虫实现
│   │   │   ├── codeforces.rs   # CF API (含严格去重逻辑)
│   │   │   ├── leetcode.rs     # LC 混合策略 (国际服查数据，国服生成链接)
│   │   │   └── hdu.rs          # HDU HTML 解析
│   │   ├── models.rs       # 数据结构定义
│   │   └── main.rs         # Tauri 命令注册
│   └── tauri.conf.json     # Tauri 配置文件 (Updater 插件应处于禁用状态)
└── package.json

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1. 活跃度热力图 (Activity Heatmap)

* **机制**：前端被动快照。每次刷新战绩时，对比“今日已记录总数”与“当前获取总数”，取最大值存入 `localStorage`。
* **计算**：热力图每日数据 = `History[Today] - History[Yesterday]`。

### 3.2. 跨组件通讯 (Event Bus)

* **方案**：不使用 Redux，采用轻量级 `window.dispatchEvent`。
* **流程**：`ContestList` 添加比赛 -> 触发 `cpc_todo_update` 事件 -> `TodoPanel` 监听到事件后重新读取 LocalStorage。

### 3.3. 爬虫策略 (Crawler Strategies)

* **Codeforces**：使用 `user.status` API 获取提交记录，通过 `HashSet` 存储 `${contestId}-${index}` 实现去重，以接近主页显示的“Solved”数量。
* **LeetCode**：
* **查询**：使用国际服 (`leetcode.com`) GraphQL API (稳定性高)。
* **展示**：后端强行替换 URL 域名为 `leetcode.cn`，确保用户点击跳转至国服。



### 3.4. 发布流程 (Release Process)

* **触发方式**：推送 `v*` 格式的 Tag (例如 `v1.3.1`)。
* **Action 行为**：自动编译 Windows/macOS/Linux 版本 -> 上传构建产物到 GitHub Releases -> 创建 Draft Release。
* **注意**：不再生成 `latest.json`，客户端不执行自动检查更新。

---

## 4. 维护指南 (Maintenance Guide)

### 4.1. 常用命令

* **开发环境**：`npm run tauri dev`
* **手动构建**：`npm run tauri build`

### 4.2. 发布新版本

1. 修改 `package.json` 和 `src-tauri/tauri.conf.json` 中的版本号。
2. 提交代码并打 Tag：
```bash
git tag v1.3.2
git push origin v1.3.2

```


3. 前往 GitHub Releases 页面，编辑 Draft Release 并正式发布。

### 4.3. 添加新平台

1. **Rust端**：在 `src-tauri/src/platforms/` 实现 fetch 逻辑。
2. **前端**：在 `DashboardGrid.tsx` 添加卡片。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1. GitHub Action 配置 (`.github/workflows/release.yml`)

*当前生效的构建脚本，已移除 updater 相关步骤。*

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

---

## 6. 尚未解决的问题 (Known Issues)

1. **Codeforces 数据微差**：API 包含 Gym/私有比赛数据，总数可能略高于个人主页显示的公开题数。
2. **反爬虫风险**：高频刷新可能导致 IP 被暂时封禁，前端需保持 Debounce 逻辑。
3. **数据备份**：所有数据存储在 LocalStorage，缺乏导出/导入 JSON 的功能，长期使用存在浏览器清理缓存导致数据丢失的风险。
4. **无自动更新**：用户需要手动关注 GitHub Release 页面下载新版本。