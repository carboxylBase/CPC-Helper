# CPC-Helper Project Documentation (v3.4 - AtCoder Support Update)

## 1. 项目概述 (Project Overview)

**项目名称**: `cpc-helper` (原 `contest-cli`)
**核心功能**: 一个基于 **Tauri v2** 构建的跨平台桌面应用，专为算法竞赛选手设计。

**核心模块**:

1. **竞赛日程 (Contest Calendar)**: 并发查询全球主流算法竞赛平台的近期比赛信息。
2. **刷题仪表盘 (Solver Dashboard)**: 查询并展示用户的刷题数据（AC数、Rating、段位等），采用网格化仪表盘设计。

**支持平台**:

* **竞赛查询**: Codeforces, AtCoder, NowCoder, LeetCode, HDU (杭电OJ)。
* **用户查询**:
* **Codeforces**: 支持 Rating (带颜色) & Solved Count (官方 API)。
* **AtCoder [v3.4 新增]**: 支持 Rating (带颜色) & Solved Count (Kenkoooo API)。
* **待实装**: LeetCode, NowCoder, HDU (目前仅 UI 占位)。



**版本特性 (v3.4)**:

* **AtCoder 集成**: 成功接入 AtCoder 用户数据。解决了 Kenkoooo API 的反爬虫限制（WAF 403 Forbidden）和 HTML 解析问题。
* **依赖升级**: 后端 `reqwest` 库开启了 `gzip` 特性，以支持自动解压 HTTP 响应，模拟真实浏览器行为。
* **UI 适配**: 前端 `utils.ts` 适配了 AtCoder 独有的 Rating 颜色算法（灰/棕/绿/青/蓝/黄/橙/红）。

**技术栈**:

* **Core**: Rust (Tauri v2, Tokio, Reqwest + GZIP, Scraper, Serde)
* **Frontend**: React (TypeScript), Vite, Tailwind CSS
* **Key Dependencies**: `reqwest = { version = "0.12", features = ["json", "gzip"] }`

---

## 2. 目录结构 (Directory Structure)

```text
cpc-helper/
├── src/                        # 前端源码
│   ├── components/
│   │   ├── DashboardGrid.tsx   # [更新] 启用了 AtCoder 卡片
│   │   ├── PlatformCard.tsx    # [更新] 传入 platformKey 以支持不同平台的颜色逻辑
│   │   └── ...
│   ├── utils.ts                # [更新] 新增 getRatingColor 的 AtCoder 分支逻辑
│   └── ...
├── src-tauri/                  # 后端源码
│   ├── src/
│   │   ├── platforms/
│   │   │   ├── atcoder.rs      # [核心/重写] 含 fetch_user_stats (Kenkoooo + Scraper)
│   │   │   ├── codeforces.rs   # CF 爬虫逻辑
│   │   │   └── ...
│   │   ├── lib.rs              # [更新] 注册 "atcoder" 指令分支
│   │   └── models.rs           # 数据模型
│   └── Cargo.toml              # [关键] reqwest 开启了 gzip feature
└── ...

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1 后端架构 (Rust)

* **AtCoder 抓取策略**:
* **Rating**: 爬取 `atcoder.jp/users/{handle}` 页面，使用 CSS 选择器定位 `<th>Rating</th>` 对应的单元格。
* **Solved Count**: 调用第三方权威 API `kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank`。
* **反爬虫绕过 (关键)**:
1. **GZIP**: `Cargo.toml` 必须开启 `reqwest` 的 `gzip` 特性。
2. **Headers**: 必须伪装 `User-Agent` (Firefox/Chrome) 且不需要手动设置 `Accept-Encoding` (库自动处理)。
3. **Case Sensitivity**: Kenkoooo API 对用户名**大小写敏感** (例如 `User` vs `user` 会导致 404)。




* **Codeforces 抓取策略**:
* 并发请求 `user.info` 和 `user.status`，本地去重计算 AC 数。



### 3.2 前端架构 (React)

* **多态颜色系统**:
* `utils.ts/getRatingColor`: 接收 `rating` 和 `platform` 两个参数。
* **Codeforces**: 经典紫名、橙名、红名体系。
* **AtCoder**: 严格遵循 400 分一档的颜色阶梯 (灰->棕->绿->...)。



---

## 4. 维护指南 (Maintenance Guide)

### 4.1 AtCoder 模块维护

* **API 变动**: 如果 Kenkoooo API 失效，可尝试 `/v3/user/info` 接口（需注意该接口更轻量但信息不同）。
* **403/404 错误排查**:
* **403**: 检查 `reqwest` 是否开启了 `gzip`，检查 `User-Agent` 是否过时。
* **404**: 提示用户检查输入的大小写（AtCoder 官网不区分，但 API 区分）。



### 4.2 添加新平台 (e.g., LeetCode)

1. **Cargo.toml**: 确认是否需要 `graphql` 或其他特性。
2. **后端**: 在 `src-tauri/src/platforms/leetcode.rs` 实现 `fetch_user_stats`。
3. **路由**: 在 `src-tauri/src/lib.rs` 的 `match` 中注册。
4. **前端**: 在 `src/components/DashboardGrid.tsx` 将 `isEnabled` 设为 true。

### 4.3 已知警告处理

* **Snake Case Warnings**: Codeforces 的 JSON 字段是驼峰命名，导致 Rust 编译器报黄。可以通过在结构体上添加 `#[allow(non_snake_case)]` 消除警告。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1 开启 GZIP 支持 (Cargo.toml)

*这是解决 Kenkoooo 403 错误的根本原因。*

```toml
[dependencies]
reqwest = { version = "0.12", features = ["json", "gzip"] }

```

### 5.2 AtCoder 用户统计抓取 (Rust)

*位置: `src-tauri/src/platforms/atcoder.rs*`

```rust
pub async fn fetch_user_stats(handle: &str) -> Result<UserStats> {
    let client = reqwest::Client::builder()
        // 使用 Firefox UA 伪装
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0")
        .build()?;

    // 1. Kenkoooo AC Rank (注意：API 大小写敏感)
    // 依赖 gzip feature 自动处理压缩，防止 403 和解析错误
    let ac_url = format!("https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user={}", handle);
    let ac_req = client.get(&ac_url)
        .header("Accept", "application/json")
        .header("Referer", "https://kenkoooo.com/");
    
    // ... (发送请求并解析) ...

    // 2. Profile Page Scraping (Rating)
    // ... (HTML 解析逻辑) ...
}

```

### 5.3 Rating 颜色逻辑 (TypeScript)

*位置: `src/utils.ts*`

```typescript
export const getRatingColor = (rating?: number, platform: string = 'codeforces'): string => {
  if (!rating) return '#9ca3af'; 
  const p = platform.toLowerCase();

  // AtCoder 颜色阶梯
  if (p === 'atcoder') {
    if (rating < 400) return '#808080';   // Gray
    if (rating < 800) return '#804000';   // Brown
    if (rating < 1200) return '#008000';  // Green
    if (rating < 1600) return '#00C0C0';  // Cyan
    if (rating < 2000) return '#0000FF';  // Blue
    if (rating < 2400) return '#C0C000';  // Yellow
    if (rating < 2800) return '#FF8000';  // Orange
    return '#FF0000';                     // Red
  }
  // ... Codeforces 逻辑 ...
};

```

---

## 6. 尚未解决的问题 (Pending Issues)

1. **其他平台支持**: LeetCode, NowCoder, HDU 的 `fetch_user_stats` 尚未实现，目前点击卡片无反应或仅为 UI 占位。
2. **Codeforces 编译警告**: `codeforces.rs` 中仍存在关于驼峰命名的编译器警告（不影响运行，但影响观感）。
3. **Kenkoooo 稳定性**: 虽然目前通过模拟浏览器解决了拦截，但如果 Kenkoooo 升级 WAF 规则，可能需要更复杂的指纹伪装或切换到前端 Fetch 方案。