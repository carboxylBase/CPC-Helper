# CPC Helper (Contest App) 项目维护文档

## 1. 项目概述 (Project Overview)

本项目是一个基于 **Tauri v2** (Rust) + **React** (TypeScript/Vite) 的跨平台桌面应用，旨在辅助算法竞赛选手管理比赛日程及查询个人战绩。
核心功能包括：

* **比赛日历**：聚合 Codeforces, AtCoder, NowCoder, LeetCode, HDU 等平台的近期比赛。
* **个人战绩查询**：查询各平台用户的 Rating、排名及刷题数。
* **个性化设置**：支持自定义 UI 外观（磨砂玻璃效果、主题色）及爬虫配置（Cookie 管理）。

**当前开发重点**：解决了 **NowCoder (牛客网)** 的反爬虫问题，通过用户手动配置 Cookie + 后端正则解析的方式实现了数据的稳定获取。

---

## 2. 目录结构 (Directory Structure)

```text
cpc_helper/
├── src/                        # 前端源码 (React + TS)
│   ├── components/
│   │   ├── DashboardGrid.tsx   # 仪表盘，展示各平台卡片
│   │   ├── PlatformCard.tsx    # 单个平台卡片组件 (展示数据)
│   │   ├── Settings.tsx        # (或 SettingsDrawer.tsx) 设置界面，含 Cookie 输入
│   │   └── ...
│   ├── services/
│   │   └── contestService.ts   # 前端与 Tauri 后端的通信桥梁 (处理 Cookie 读取)
│   ├── types/                  # TypeScript 类型定义
│   ├── App.tsx                 # 主入口，Tab 切换与布局
│   └── main.tsx
├── src-tauri/                  # 后端源码 (Rust)
│   ├── src/
│   │   ├── platforms/          # 各平台爬虫实现
│   │   │   ├── nowcoder.rs     # [核心] 牛客网爬虫 (Regex + Cookie)
│   │   │   ├── codeforces.rs
│   │   │   └── ...
│   │   ├── lib.rs              # Tauri 命令注册与分发
│   │   ├── models.rs           # Rust 结构体定义 (Contest, UserStats)
│   │   └── main.rs
│   ├── Cargo.toml              # Rust 依赖配置 (reqwest, scraper, regex 等)
│   └── tauri.conf.json         # Tauri 配置文件
└── package.json

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1. 跨端通信与 Cookie 注入

* **问题**：NowCoder 个人主页强制登录或有反爬验证，直接请求返回 200 但无数据。
* **方案**：
1. **前端**：在设置页 (`Settings.tsx`) 让用户粘贴浏览器 Cookie，保存至 `localStorage` (`nowcoder_cookie`)。
2. **调用层**：`contestService.ts` 在发起 `fetchUserStats` 请求前，检测若是 NowCoder 平台，则从本地读取 Cookie 并作为参数传给后端。
3. **后端**：Rust 指令 `fetch_user_stats` 接收 `cookie: Option<String>`，并在构造 `reqwest` 请求时注入 `Header`。



### 3.2. NowCoder 数据解析 (Regex vs Scraper)

* **问题**：`scraper` 库解析 HTML 时，因页面结构复杂或中文字符编码问题导致 Panic；API 接口被加密或风控。
* **方案**：采用 **正则表达式 (Regex)** 进行暴力匹配。
* **Rating/Rank**：从 `<div class="state-num ... rate-score...">` 中提取。
* **Solved Count**：数据位于独立的 `/practice-coding` 页面，需发起第二次请求，匹配 `...题已通过` 前的数字。



### 3.3. 并发请求

* 后端使用 `tokio::join!` 并发请求 NowCoder 的“个人主页”和“刷题练习页”，最大化查询速度。

---

## 4. 维护指南 (Maintenance Guide)

### 4.1. 启动开发环境

```bash
npm run tauri dev

```

### 4.2. 修复 NowCoder 爬虫

如果牛客网页面改版导致数据为空：

1. **检查 Cookie**：确认设置里的 Cookie 未过期。
2. **更新正则**：打开 `src-tauri/src/platforms/nowcoder.rs`。
* 使用浏览器 F12 检查目标数据的 HTML 结构。
* 更新 `fetch_user_stats` 函数中的 `Regex::new(...)` 匹配规则。



### 4.3. 添加新平台

1. 在 `src-tauri/src/platforms/` 下新建 `xxx.rs`。
2. 实现 `fetch_contests` 和 `fetch_user_stats`。
3. 在 `src-tauri/src/lib.rs` 中注册模块并添加到 `match` 分支。
4. 前端 `DashboardGrid.tsx` 添加对应的 `PlatformCard`。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1. Rust: NowCoder 核心逻辑 (`src-tauri/src/platforms/nowcoder.rs`)

```rust
// 核心依赖: reqwest, regex, tokio
pub async fn fetch_user_stats(uid: &str, cookie: &str) -> Result<UserStats> {
    // 1. 请求主页 (Rating) 和 练习页 (Solved)
    // ... Client builder with headers ...
    let (main_res, practice_res) = tokio::join!(main_req, practice_req);

    // 2. 正则解析 Rating (兼容不同 class 写法)
    let re_class = Regex::new(r#"class="state-num[^"]*rate-score[^"]*">(\d+)"#).unwrap();
    // ... matching logic ...

    // 3. 正则解析 Solved Count
    let re_solved = Regex::new(r#"class="state-num">(\d+)</div>\s*<div[^>]*>\s*<span>题已通过</span>"#).unwrap();
    // ... matching logic ...
}

```

### 5.2. React: 设置页中文字符修复 (`src/components/Settings.tsx`)

```tsx
// 必须使用 → 或 &gt; 代替 ->，否则会导致 TSX 解析错误
<p className="text-xs text-gray-500 mb-2">
    请在浏览器登录牛客网，按 F12 → Network → 刷新 → 复制请求头中的 Cookie。
</p>

```

### 5.3. React: Service 层 Cookie 注入 (`src/services/contestService.ts`)

```typescript
export const fetchUserStats = async (platform: string, handle: string): Promise<UserStats> => {
  let cookie: string | null = null;
  // 针对 NowCoder 读取本地存储
  if (platform.toLowerCase() === 'nowcoder') {
    cookie = localStorage.getItem('nowcoder_cookie');
    if (!cookie) throw new Error("请先在设置页配置 Cookie");
  }
  // 传递给 Rust
  return await invoke('fetch_user_stats', { platform, handle, cookie });
};

```

---

## 6. 尚未解决的问题 (Known Issues)

1. **Cookie 过期问题**：目前 Cookie 需要用户手动更新。当 Cookie 失效时，Rust 端会返回解析失败或空数据，但没有明确的“Cookie 失效”错误码返回给前端，用户体验主要依赖 UI 上的 "Not Found" 或 "Error"。
2. **反爬风控**：虽然使用了 Cookie，但如果请求频率过高，仍可能触发验证码（CAPTCHA），导致 Regex 匹配失败。当前未处理验证码流程。
3. **Rust 字符串切片 Panic**：在调试模式下打印截断的 HTML 时，容易因为切断了 UTF-8 多字节字符（如中文）而导致 Panic。生产代码已移除相关调试打印，但二次开发时需注意。