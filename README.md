# CPC Helper (Contest App) 项目维护文档 v2.0

## 1. 项目概述 (Project Overview)

本项目是一个基于 **Tauri v2** (Rust) + **React** (TypeScript/Vite) 的跨平台桌面应用，旨在辅助算法竞赛选手管理比赛日程及查询个人战绩。

**核心功能**：

* **比赛日历**：聚合 Codeforces, AtCoder, NowCoder, LeetCode, HDU 等平台的近期比赛。
* **个人战绩查询**：查询各平台用户的 Rating、排名及刷题数。
* **一键批量刷新**：支持一键并发查询所有已启用平台的战绩。
* **智能重试**：底层网络请求具备自动重试机制，增强不稳定性网络下的体验。
* **个性化设置**：自定义 UI（磨砂玻璃、主题色）及反爬虫配置（Cookie 管理）。

**当前状态**：
已完成 NowCoder 的反爬攻坚（Cookie + Regex），并在后端集成了 **3次自动重试机制**，前端实现了 **Ref 驱动的一键查询** 功能。

---

## 2. 目录结构 (Directory Structure)

```text
cpc_helper/
├── src/                        # 前端源码 (React + TS)
│   ├── components/
│   │   ├── DashboardGrid.tsx   # [核心] 仪表盘，包含"一键查询"逻辑与 Card 引用管理
│   │   ├── PlatformCard.tsx    # [核心] 单个平台卡片，暴露 triggerSearch 接口
│   │   ├── Settings.tsx        # 设置界面，含 Cookie 输入
│   │   └── ...
│   ├── services/
│   │   └── contestService.ts   # 前端与 Tauri 通信桥梁 (处理 Cookie 读取)
│   ├── types/                  # TypeScript 类型定义
│   ├── App.tsx                 # 主入口
│   └── main.tsx
├── src-tauri/                  # 后端源码 (Rust)
│   ├── src/
│   │   ├── platforms/          # 各平台爬虫实现
│   │   │   ├── nowcoder.rs     # [重点] 牛客网爬虫 (Regex + Cookie)
│   │   │   ├── codeforces.rs
│   │   │   └── ...
│   │   ├── lib.rs              # [核心] 命令分发与重试逻辑实现
│   │   ├── models.rs           # 结构体定义 (Contest, UserStats)
│   │   └── main.rs
│   ├── Cargo.toml              # Rust 依赖 (reqwest, scraper, regex, tokio)
│   └── tauri.conf.json         # Tauri 配置
└── package.json

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1. 跨端通信与 Cookie 注入

针对 NowCoder 等强风控平台：

1. **前端**：用户在 `Settings.tsx` 输入 Cookie，存入 `localStorage`。
2. **调用**：`contestService.ts` 识别平台，读取 Cookie 并传给 Rust。
3. **后端**：Rust 接收 `Option<String>` 类型的 Cookie 并注入请求 Header。

### 3.2. 容错与重试机制 (Backend Retry)

* **位置**：`src-tauri/src/lib.rs` -> `fetch_user_stats`
* **逻辑**：采用 `loop` 循环结构。
* 若请求成功：立即返回数据。
* 若请求失败：记录错误，休眠 **800ms** 后重试。
* **限制**：最大重试次数为 **3次**。若 3 次均失败，才向前端抛出异常。



### 3.3. 前端并发控制 (Ref Pattern)

* **组件通信**：`PlatformCard` 使用 `forwardRef` + `useImperativeHandle` 将内部的 `handleSearch` 方法暴露为 `triggerSearch`。
* **批量执行**：`DashboardGrid` 持有所有卡片的 `Ref`，点击“一键查询”时，使用 `Promise.allSettled` 并发触发所有卡片的刷新方法。

### 3.4. 数据解析策略

* **NowCoder**：因 `scraper` 解析 Panic 及动态渲染问题，强制使用 **Regex** 提取 HTML 字符串中的 Rating 和 Solved Count。
* **其他平台**：标准 JSON API 或 HTML 解析。

---

## 4. 维护指南 (Maintenance Guide)

### 4.1. 启动开发环境

```bash
npm run tauri dev

```

### 4.2. 修复 NowCoder 爬虫

若数据为空或解析失败：

1. **检查 Cookie**：确认设置中的 Cookie 未过期。
2. **调试正则**：在 `src-tauri/src/platforms/nowcoder.rs` 中，检查 `Regex::new` 是否匹配最新的 HTML 结构。
3. **查看日志**：由于有重试机制，控制台可能等待 2.4秒 (3*800ms) 后才报错，需注意区分超时与解析错误。

### 4.3. 添加新平台

1. **后端**：在 `src-tauri/src/platforms/` 新建模块，实现数据获取。
2. **注册**：在 `src-tauri/src/lib.rs` 的 `fetch_user_stats` `match` 分支中添加新平台。
3. **前端**：在 `DashboardGrid.tsx` 引入 `PlatformCard`，创建对应的 `useRef`，并加入 `handleRefreshAll` 的数组列表中。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1. Rust: 自动重试逻辑 (`src-tauri/src/lib.rs`)

```rust
#[tauri::command]
async fn fetch_user_stats(platform: String, handle: String, cookie: Option<String>) -> Result<UserStats, String> {
    let max_retries = 3;
    let mut last_error = String::new();

    for attempt in 1..=max_retries {
        // ... 匹配平台并执行请求 ...
        let res = match platform.to_lowercase().as_str() { /* ... */ };

        match res {
            Ok(stats) => return Ok(stats),
            Err(e) => {
                last_error = e;
                if attempt < max_retries {
                    tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;
                }
            }
        }
    }
    Err(last_error) // 3次全败
}

```

### 5.2. React: 组件方法暴露 (`src/components/PlatformCard.tsx`)

```tsx
export interface PlatformCardRef {
  triggerSearch: () => Promise<void>;
}

const PlatformCard = forwardRef<PlatformCardRef, PlatformCardProps>(
  ({ ... }, ref) => {
    const handleSearch = async () => { /* ... fetching logic ... */ };

    useImperativeHandle(ref, () => ({
      triggerSearch: handleSearch
    }));
    // ...
  }
);

```

### 5.3. React: 一键批量查询 (`src/components/DashboardGrid.tsx`)

```tsx
const handleRefreshAll = async () => {
    setIsGlobalRefreshing(true);
    // 即使某个失败，allSettled 也会等待所有完成
    const refs = [cfRef, acRef, ncRef]; 
    await Promise.allSettled(
      refs.map(ref => ref.current?.triggerSearch())
    );
    setIsGlobalRefreshing(false);
};

```

### 5.4. Rust: NowCoder 正则匹配 (`src-tauri/src/platforms/nowcoder.rs`)

```rust
// 务必保留此正则逻辑，防止 scraper 解析 panic
let re_rating = Regex::new(r#"class="state-num[^"]*rate-score[^"]*">(\d+)"#).unwrap();
let re_solved = Regex::new(r#"class="state-num">(\d+)</div>\s*<div[^>]*>\s*<span>题已通过</span>"#).unwrap();

```

---

## 6. 尚未解决的问题 (Known Issues)

1. **Cookie 手动维护**：NowCoder Cookie 失效后无法自动刷新，需用户手动抓取并更新。
2. **并发风控风险**：虽然有 800ms 间隔，但在“一键查询”时，若开启平台过多，仍可能瞬间发起多个 HTTP 请求（不同平台间是并发的），在极少数严格风控的网络环境下可能触发 IP 限制。
3. **Rust Panic 隐患**：处理非 UTF-8 字符或手动切片 HTML 字符串时需极度小心，避免切断多字节字符。