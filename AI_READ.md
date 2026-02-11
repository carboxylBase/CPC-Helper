# CPC Helper (Contest App) 项目维护文档 v1.1.2

## 1. 项目概述 (Project Overview)

本项目是一个基于 **Tauri v2** (Rust) + **React** (TypeScript/Vite) 的跨平台桌面应用，专为算法竞赛选手设计。核心宗旨是“聚合”与“直观”，通过统一的界面管理多平台比赛日程及个人战绩。

**v1.1.2 核心更新**：

* **OTA 自动更新**：集成了 GitHub Actions 与 Tauri Updater，支持全自动构建、签名与增量更新检测。
* **Daimayuan 支持**：全面完善代码源（Daimayuan）平台的战绩抓取与可视化。

**核心技术栈**：

* **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts (可视化), Framer Motion.
* **Backend**: Rust (Tauri v2), Reqwest (异步请求), Tokio (并发异步运行时), Regex (高效 HTML 解析).
* **CI/CD**: GitHub Actions (自动构建 Windows/macOS/Linux 安装包并发布 Release).

**已集成平台 (7个)**：
Codeforces, AtCoder, NowCoder, LeetCode, HDU, Luogu, **Daimayuan (代码源)**.

---

## 2. 目录结构 (Directory Structure)

```text
cpc_helper/
├── .github/
│   └── workflows/
│       └── release.yml     # [CI/CD] GitHub Actions 自动构建与发布脚本
├── src/                    # 前端源码 (React + TS)
│   ├── components/
│   │   ├── DashboardGrid.tsx   # [核心] 战绩仪表盘，包含各平台卡片与 Recharts 饼图
│   │   ├── PlatformCard.tsx    # [核心] 通用平台组件，处理 Handle 持久化与数据请求
│   │   └── ...
│   ├── utils.ts            # [核心] 颜色映射与工具函数
│   └── App.tsx             # [核心] 主入口，包含 Updater 自动更新检测逻辑
├── src-tauri/              # 后端源码 (Rust)
│   ├── src/
│   │   ├── platforms/      # [核心] 各平台爬虫实现 (daimayuan.rs, codeforces.rs 等)
│   │   ├── models.rs       # 数据结构定义
│   │   ├── lib.rs          # [核心] 插件注册 (Updater, Dialog, Process) 与并发调度
│   │   └── main.rs
│   ├── tauri.conf.json     # [配置] 包含公钥 (pubkey) 与更新端点 (endpoints)
│   └── Cargo.toml          # Rust 依赖管理
└── package.json

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1. 自动更新系统 (Auto-Update System)

本项目采用 **Tauri Updater + GitHub Releases** 方案：

1. **签名机制**：使用 Ed25519 算法。私钥存储于 GitHub Secrets (`TAURI_SIGNING_PRIVATE_KEY`)，公钥硬编码于 `tauri.conf.json`。
2. **检测流程**：前端 `App.tsx` 在挂载时调用 `check()`。若发现新版本（对比 GitHub Release 的 `latest.json`），则调用原生 Dialog 询问用户。
3. **更新动作**：用户确认后，调用 `downloadAndInstall()` 下载并静默替换，最后 `relaunch()` 重启应用。

### 3.2. 后端爬虫架构

* **并发模型**：`lib.rs` 使用 `tokio::join!` 并行执行 7 个平台的 `fetch_contests` 任务。
* **正则解析**：针对非 API 平台（如 Daimayuan），使用 `(?s)` 单行模式正则配合 `[\s\S]*?` 跨行匹配，确保在复杂的 DOM 结构中精准提取数据。

### 3.3. 前端交互

* **状态保持**：使用 `display: none/block` 切换 Tab，避免切换页面时丢失已加载的图表状态。
* **CI 兼容性**：代码遵循严格的 TypeScript 规范，避免定义未使用的变量，以通过 GitHub Actions 的严格检查。

---

## 4. 维护指南 (Maintenance Guide)

### 4.1. 发布新版本 (Standard Operating Procedure)

**这是后续维护最频繁的操作，请严格执行：**

1. **修改版本号**：同时修改 `package.json` 和 `src-tauri/tauri.conf.json` 中的 `version` 字段（例如从 `1.1.2` 改为 `1.1.3`）。
2. **提交代码**：
```bash
git add .
git commit -m "chore: bump version to v1.1.3"
git push

```


3. **触发构建**：
```bash
git tag v1.1.3
git push origin v1.1.3

```


4. **发布 Release**：等待 GitHub Actions 跑完（约 10 分钟），前往 GitHub Releases 页面，编辑生成的 Draft 版本，填写更新日志并点击 **Publish**。

### 4.2. 增加新平台

1. **Backend**: 在 `src-tauri/src/platforms/` 新增 `new_platform.rs`，并在 `lib.rs` 注册。
2. **Frontend**: 在 `DashboardGrid.tsx` 新增 Card，并在 `utils.ts` 分配配色。

### 4.3. 密钥安全

* **绝对禁止**将私钥 (`.key` 文件内容) 提交到代码仓库。
* 私钥仅存储于本地安全位置及 GitHub Actions Secrets 中。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1. Rust: 插件注册与并发调度 (`lib.rs`)

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init()) // 用于重启
        .plugin(tauri_plugin_dialog::init())  // 用于弹窗
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build()) // 自动更新核心
        .invoke_handler(tauri::generate_handler![
            fetch_all_contests,
            fetch_user_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

```

### 5.2. TypeScript: 自动更新检测逻辑 (`App.tsx`)

```typescript
useEffect(() => {
  const initCheckUpdate = async () => {
    try {
      const update = await check();
      if (update?.available) {
        const yes = await ask(
          `New version v${update.version} available!\n\n${update.body}`, 
          { title: 'Update Available', kind: 'info', okLabel: 'Update', cancelLabel: 'Later' }
        );
        if (yes) {
          await update.downloadAndInstall();
          await relaunch();
        }
      }
    } catch (error) { console.error('Update check failed:', error); }
  };
  initCheckUpdate();
}, []);

```

### 5.3. Rust: 复杂 HTML 正则匹配 (`daimayuan.rs`)

```rust
// 跨行匹配容器，提取其中的数字
let re_solved = Regex::new(r#"(?s)<div[^>]*class="numbox"[^>]*>[\s\S]*?numbox__num[^>]*>(\d+)</div>[\s\S]*?已通过"#).unwrap();

```

---

## 6. 尚未解决的问题 (Known Issues)

1. **NowCoder Cookie**：牛客网的反爬策略较严，Session ID 容易过期，需定期手动更新。
2. **Luogu WAF**：频繁请求可能触发洛谷防火墙，目前爬虫未做复杂的 IP 轮询或验证码处理。
3. **HDU 稳定性**：杭电 OJ 经常维护或不可访问，可能导致请求超时。
4. **构建环境**：GitHub Actions 的 Windows 构建偶尔会因为网络问题下载 Rust 依赖失败，重试即可。