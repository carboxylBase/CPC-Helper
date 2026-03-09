# CPC Helper (Contest App) 🚀

![License](https://img.shields.io/github/license/carboxylBase/CPC-Helper?style=flat-square)
![Version](https://img.shields.io/github/v/release/carboxylBase/CPC-Helper?style=flat-square&color=blue)
![Build Status](https://img.shields.io/github/actions/workflow/status/carboxylBase/CPC-Helper/release.yml?style=flat-square)
![Downloads](https://img.shields.io/github/downloads/carboxylBase/CPC-Helper/total?style=flat-square&color=orange)

**CPC Helper** 是一款专为算法竞赛（ACM/ICPC, OI）选手打造的现代化跨平台桌面应用。

它基于高性能的 **Rust (Tauri v2)** 和 **React** 构建，旨在通过“聚合”与“直观”的界面，帮助选手统一管理多平台比赛日程，并可视化追踪个人刷题战绩。告别在不同 OJ 之间反复切换的烦恼，专注于解题本身。

---
## ✨ 核心特性 (Features)

### 1. 🏆 全平台战绩聚合 (Multi-Platform Tracker)

基于异步请求实现一键并发查询，秒级生成你的专属算法战绩看板。
目前已原生支持 **7 大主流 OJ 平台**：

* **Codeforces** / **AtCoder** / **LeetCode** (力扣)
* **NowCoder** (牛客网) / **Luogu** (洛谷) / **Daimayuan** (代码源) / **HDU** (杭电 OJ)

### 2. 📅 赛事日历同步 (Contest Calendar)

* **全网聚合**：自动抓取并更新各大 OJ 平台的近期比赛日程。
* **统一时间线**：打破平台壁垒，将散落的比赛汇聚为直观的时间线，助你合理安排打赛计划，绝不错过任何一场 Rating 赛。

### 3. 📊 可视化数据看板 (Visual Dashboard)

* **专属视觉标识**：采用精心调配的**光谱配色方案**（赤橙黄绿青蓝紫），赋予每个平台高辨识度的视觉标签。
* **直观统计**：内置交互式图表（如刷题分布饼图），全方位展现你的训练重心、能力演进与各平台活跃度。

### 4. 📝 沉浸式刷题计划池 (Problem Pool & Todo)

* **多日周期管理**：摒弃简单的单日打卡，支持创建带有开始日期与持续天数（Duration）的跨日训练计划。
* **动态进度追踪**：智能计算任务生命周期，动态更新状态标识（如 *Early Stage*, *In Progress*, *Deadline Near*）与进度条，助力科学规划每日训练。

### 5. 🚀 极致性能体验 (High Performance)

* **Rust 强力驱动**：后端基于 Tauri 架构，结合 Tokio 异步运行时与 Reqwest 构建高并发轻量级爬虫，告别卡顿与等待。
* **轻量无感**：得益于系统级 WebView 渲染，安装包体积小巧，内存占用极低，常驻后台亦毫无压力。

---
## 📸 预览 (Screenshots)

| 战绩仪表盘 (Dashboard) | 比赛日程 (Calendar) |
| :---: | :---: |
| <img src=".github/assets/dashboard.png" height="300" alt="Dashboard Screenshot"> | <img src=".github/assets/calendar.png" height="300" alt="Contest List Screenshot"> |
---

## 📥 下载安装 (Installation)

本项目支持 **Windows**, **macOS**, **Linux** 三大平台。

请前往 [**Releases 页面**](https://github.com/carboxylBase/CPC-Helper/releases) 下载最新版本的安装包：

- **Windows**: 下载 `.msi` 或 `.exe` 文件。
- **macOS**: 下载 `.dmg` 文件。
- **Linux**: 下载 `.AppImage` 或 `.deb` 文件。

> **注意**：从 v1.1.1 版本开始，软件支持自动更新。您只需手动安装一次，后续更新将自动推送。

---

## 🛠️ 本地开发 (Development)

如果你对本项目感兴趣，欢迎 clone 代码进行二次开发。

### 前置要求
- [Node.js](https://nodejs.org/) (建议 LTS 版本)
- [Rust](https://www.rust-lang.org/) (建议 Stable 版本)
- 包管理器 (npm / pnpm / yarn)

### 启动步骤

1. **克隆仓库**
```bash
   git clone [https://github.com/carboxylBase/CPC-Helper.git](https://github.com/carboxylBase/CPC-Helper.git)
   cd CPC-Helper
```

2. **安装依赖**
```bash
npm install
```


3. **开发模式运行** (同时启动 React 前端和 Rust 后端)
```bash
npm run tauri dev
```


4. **打包构建**
```bash
npm run tauri build
```



---

## 🏗️ 技术栈 (Tech Stack)

* **Core**: [Tauri v2](https://v2.tauri.app/) (Rust) - 提供系统级 API 与原生性能。
* **Frontend**: React 18 + TypeScript + Vite.
* **Styling**: Tailwind CSS + Framer Motion.
* **Visualization**: Recharts.
* **Network**: Reqwest + Tokio (Rust 异步运行时).
* **Parsing**: Regex (高性能 HTML 正则解析).
* **CI/CD**: GitHub Actions (自动构建与发布).

---

## 🤝 贡献 (Contributing)

欢迎提交 Issue 反馈 Bug，或提交 Pull Request 增加新功能

1. Fork 本仓库
2. 新建 Feat_xxx 分支
3. 提交代码
4. 新建 Pull Request

## 📄 许可证 (License)

本项目基于 [MIT License](https://gs.jurieo.com/gemini/official/search?q=LICENSE) 开源。
