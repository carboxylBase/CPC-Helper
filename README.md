# CPC Helper (Contest App) 项目维护文档 v4.0

## 1. 项目概述 (Project Overview)

本项目是一个基于 **Tauri v2** (Rust) + **React** (TypeScript/Vite) 的跨平台桌面应用，旨在辅助算法竞赛选手管理比赛日程及查询个人战绩。

**核心功能**：

* **比赛日历**：聚合 Codeforces, AtCoder, NowCoder, LeetCode (国际版), HDU, **Luogu (洛谷)** 等平台的近期比赛。
* **个人战绩查询**：支持查询 **Codeforces**, **AtCoder**, **NowCoder**, **LeetCode CN (力扣)**, **Luogu (洛谷)** 的 Rating、排名及刷题数。
* **一键批量刷新**：支持一键并发查询所有已启用平台的战绩。
* **智能重试与 WAF 绕过**：底层网络请求具备自动重试机制 (Max 3次)，并针对特定平台 (Luogu) 实现了反爬虫绕过逻辑。

**当前状态 (v4.0 更新)**：

* **新增 Luogu 平台**：成功接入洛谷的比赛列表与个人战绩（刷题数 + 比赛 Rating）。
* **LeetCode 优化**：移除冗余调试信息，稳定使用 `noj-go` 端点。
* **底层重构**：将并发任务的错误处理迁移至 `anyhow`，解决了 Rust 异步运行时的线程安全 (`Send` trait) 问题。

---

## 2. 目录结构 (Directory Structure)

```text
cpc_helper/
├── src/                        # 前端源码 (React + TS)
│   ├── components/
│   │   ├── DashboardGrid.tsx   # [核心] 仪表盘，包含"一键查询"逻辑与所有 PlatformCard 引用
│   │   ├── PlatformCard.tsx    # [核心] 单个平台卡片
│   │   └── ...
├── src-tauri/                  # 后端源码 (Rust)
│   ├── src/
│   │   ├── platforms/          # 各平台爬虫实现
│   │   │   ├── nowcoder.rs     # 牛客网 (Regex + Cookie)
│   │   │   ├── leetcode.rs     # LeetCode CN (GraphQL + noj-go Endpoint)
│   │   │   ├── luogu.rs        # [新增] 洛谷 (WAF Bypass + JSON/HTML Dual Parse)
│   │   │   ├── codeforces.rs
│   │   │   └── ...
│   │   ├── lib.rs              # [核心] 命令分发、并发聚合 (tokio::join!)、重试循环
│   │   ├── models.rs           # 结构体定义 (Contest, UserStats)
│   │   └── main.rs
│   ├── Cargo.toml              # Rust 依赖 (reqwest, serde, anyhow, regex, tokio)
│   └── tauri.conf.json         # Tauri 配置
└── package.json

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1. 复杂反爬策略实现

针对不同平台的风控，本项目实现了多种应对策略：

1. **Luogu (洛谷) - 混合解析与 WAF 绕过**：
* **WAF 挑战**：洛谷会对首次请求返回 `302 Found` 并设置 `Set-Cookie`。
* **应对**：禁用 `reqwest` 的自动重定向，手动捕获 `302` 响应中的 Cookie，并携带该 Cookie 发起二次请求。
* **双重解析 (Dual Parse)**：
* **优先**：尝试解析 JSON API (`_contentOnly=1`)。
* **兜底**：若 API 被拦截返回 HTML 页面，使用 **Regex** 正则表达式从 HTML 源码中提取 `passedProblemCount` 和 `elo` Rating 数据。


* **数据源**：Rating 取自 `currentData.elo` 数组（比赛分），而非 `rating`（咕值）。


2. **LeetCode CN - API 伪装**：
* **Rating**：使用 `graphql/noj-go/` 端点，该端点权限较宽，无需登录即可查询用户 Rating。
* **Header**：必须严格伪造 `Referer` (`https://leetcode.cn/u/{handle}/`) 和 `Origin`。


3. **NowCoder - Cookie 注入**：
* 依赖用户手动填写的 Cookie，后端通过 Regex 提取 HTML 中的数据。



### 3.2. 并发安全与错误处理

* **问题**：`tokio::join!` 要求所有 Future 返回的错误类型必须实现 `Send` trait，而标准库 `Box<dyn Error>` 默认不是 `Send` 的。
* **解决**：在 `luogu.rs` 和 `lib.rs` 中全面引入 **`anyhow::Result`**，确保错误类型线程安全，从而支持高效的并发查询。

---

## 4. 维护指南 (Maintenance Guide)

### 4.1. 洛谷 (Luogu) 维护

* **API 变动**：洛谷的 `_contentOnly=1` 接口并不稳定。如果未来 JSON 解析全部失败且 HTML 正则也失效，请检查返回的 HTML 结构，寻找新的数据锚点（如 `window._feInjection`）。
* **WAF 升级**：当前只处理了简单的 Cookie 重定向。如果洛谷引入 Cloudflare 5秒盾（JS 挑战），当前的 `reqwest` 客户端将失效，届时可能需要切换到 Headless Browser 方案（如 `fantoccini`）或寻找第三方 API。

### 4.2. LeetCode 维护

* **端点存活**：`noj-go` 是非官方文档端点。如果失效，需回退到标准 `graphql` 端点，但这通常需要携带合法的用户 Cookie。

### 4.3. 添加新平台

1. 在 `platforms/` 新建 `.rs` 文件，建议返回 `anyhow::Result<T>` 以保证并发兼容性。
2. 在 `lib.rs` 的 `fetch_all_contests` (日历) 和 `fetch_user_stats` (战绩) 中注册新模块。
3. **注意**：在 `tokio::join!` 中添加新任务时，确保该任务的 Error 类型是线程安全的。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1. Rust: Luogu WAF 绕过与双重解析

位置：`src-tauri/src/platforms/luogu.rs`

```rust
// 核心：处理 Cookie 重定向与 HTTP 请求
async fn fetch_raw_content(url: &str) -> Result<String> {
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::none()) // 禁止自动跳转，手动处理
        .build()?;
    
    // 发起初次请求...
    let mut resp = client.get(url)...send().await?;

    // 捕获 302/307 WAF 挑战
    if resp.status().is_redirection() {
        let cookies = ...; // 提取 Set-Cookie
        if !cookies.is_empty() {
            // 携带 Cookie 重试
            resp = client.get(location)
                .header(header::COOKIE, cookie_str)
                .send().await?;
        }
    }
    Ok(resp.text().await?)
}

// 业务：HTML 正则兜底
pub async fn fetch_user_stats(uid: &str) -> Result<UserStats> {
    let raw_text = fetch_raw_content(&url).await?;

    // 1. HTML Fallback
    if raw_text.trim().starts_with('<') {
        let passed_regex = Regex::new(r#""passedProblemCount"\s*:\s*(\d+)"#).unwrap();
        // 匹配 Elo Rating 结构: "elo":[{"rating":1617,...
        let elo_regex = Regex::new(r#""elo"\s*:\s*\[\s*\{\s*"rating"\s*:\s*(\d+)"#).unwrap();
        // ...提取并返回
    }
    
    // 2. JSON Parsing
    // ...
}

```

### 5.2. Rust: 线程安全的并发聚合

位置：`src-tauri/src/lib.rs`

```rust
#[tauri::command]
async fn fetch_all_contests() -> Result<Vec<Contest>, String> {
    // 使用 anyhow::Result 确保 Error 实现了 Send，允许 tokio::join!
    let (cf_res, ac_res, nc_res, lc_res, hdu_res, lg_res) = tokio::join!(
        platforms::codeforces::fetch_contests(),
        platforms::atcoder::fetch_contests(),
        platforms::nowcoder::fetch_contests(),
        platforms::leetcode::fetch_contests(),
        platforms::hdu::fetch_contests(),
        platforms::luogu::fetch_contests() // 新增
    );
    // ...聚合结果
}

```

---

## 6. 尚未解决的问题 (Known Issues)

1. **NowCoder Cookie 有效期**：目前仍需用户手动更新 Cookie，无自动保活机制。
2. **HDU 适配**：HDU 平台目前仅实现了比赛日历抓取，暂不支持个人战绩查询（因 HDU 网站架构老旧且经常无法访问）。
3. **Luogu 用户名支持**：目前洛谷仅支持通过 **数字 UID** 查询，暂不支持通过用户名（字符串）直接查询（需要额外的 API 将用户名转换为 UID）。