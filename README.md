# CPC Helper (Contest App) 项目维护文档 v3.0

## 1. 项目概述 (Project Overview)

本项目是一个基于 **Tauri v2** (Rust) + **React** (TypeScript/Vite) 的跨平台桌面应用，旨在辅助算法竞赛选手管理比赛日程及查询个人战绩。

**核心功能**：

* **比赛日历**：聚合 Codeforces, AtCoder, NowCoder, LeetCode (国际版), HDU 等平台的近期比赛。
* **个人战绩查询**：支持查询 **Codeforces**, **AtCoder**, **NowCoder**, **LeetCode CN (力扣)** 的 Rating、排名及刷题数。
* **一键批量刷新**：支持一键并发查询所有已启用平台的战绩。
* **智能重试**：底层网络请求具备自动重试机制 (Max 3次)，增强不稳定性网络下的体验。
* **个性化设置**：自定义 UI（磨砂玻璃、主题色）及反爬虫配置（Cookie 管理）。

**当前状态 (v3.0 更新)**：
已成功集成 **LeetCode CN** 的用户战绩查询（基于 GraphQL `noj-go` 端点绕过权限限制）。NowCoder 爬虫已优化并稳定运行。所有核心平台均已接入一键查询队列。

---

## 2. 目录结构 (Directory Structure)

```text
cpc_helper/
├── src/                        # 前端源码 (React + TS)
│   ├── components/
│   │   ├── DashboardGrid.tsx   # [核心] 仪表盘，包含"一键查询"逻辑与所有 PlatformCard 引用
│   │   ├── PlatformCard.tsx    # [核心] 单个平台卡片，暴露 triggerSearch 接口
│   │   ├── Settings.tsx        # 设置界面，含 NowCoder Cookie 输入
│   │   └── ...
│   ├── services/
│   │   └── contestService.ts   # 前端与 Tauri 通信桥梁
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                  # 后端源码 (Rust)
│   ├── src/
│   │   ├── platforms/          # 各平台爬虫实现
│   │   │   ├── nowcoder.rs     # [重点] 牛客网 (Regex + Cookie)
│   │   │   ├── leetcode.rs     # [重点] LeetCode CN (GraphQL + noj-go Endpoint)
│   │   │   ├── codeforces.rs
│   │   │   └── ...
│   │   ├── lib.rs              # [核心] 命令分发 (Command Dispatch) 与 重试逻辑 (Retry Loop)
│   │   ├── models.rs           # 结构体定义 (Contest, UserStats)
│   │   └── main.rs
│   ├── Cargo.toml              # Rust 依赖 (reqwest, scraper, regex, tokio, serde)
│   └── tauri.conf.json         # Tauri 配置
└── package.json

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1. 跨端通信与数据获取策略

不同的平台采用了不同的反爬突破策略：

1. **NowCoder (强风控)**：
* **策略**：必须依赖用户 Cookie。
* **实现**：前端传入 Cookie -> Rust 端注入 HTTP Header -> 获取 HTML -> 使用 **Regex** (而非 DOM 解析器) 提取数据。


2. **LeetCode CN (API 鉴权)**：
* **策略**：GraphQL 接口伪装。
* **实现**：
* **Rating**：使用 `https://leetcode.cn/graphql/noj-go/` 端点，发送匿名 Query，必须携带 `Referer` 和 `Origin` 头伪装成浏览器请求。
* **刷题数**：使用标准 GraphQL 端点。
* **注意**：目前无需 Cookie，但对 Header 极其敏感。




3. **Codeforces / AtCoder**：
* **策略**：公开 API 或 简单的 HTML 解析。



### 3.2. 容错与重试机制 (Backend Retry)

* **位置**：`src-tauri/src/lib.rs` -> `fetch_user_stats`
* **逻辑**：
* 使用 `loop` 循环结构，最大重试 **3次**。
* 每次失败后休眠 **800ms** (`tokio::time::sleep`)。
* 第 3 次失败后才向前端返回 `Err`。



### 3.3. 前端并发控制

* **机制**：`DashboardGrid` 持有所有卡片的 `Ref`。
* **并发**：点击“一键查询”时，使用 `Promise.allSettled([cfRef, acRef, ncRef, lcRef])` 并发触发所有平台的 Rust 任务。Rust 端内部通过 `tokio::join!` 处理多请求并发。

---

## 4. 维护指南 (Maintenance Guide)

### 4.1. 修复 LeetCode 爬虫

若 LeetCode Rating 查询失败 (报错 `Cannot query field "rating"...`)：

1. **检查端点**：确认 `src-tauri/src/platforms/leetcode.rs` 中的 `LEETCODE_CN_NOJ_URL` 是否依然有效。
2. **检查 Header**：确认 `Referer` 是否正确指向了用户主页 (`https://leetcode.cn/u/{handle}/`)。
3. **Schema 变更**：如果 LeetCode 全面封锁匿名查询，可能需要升级为“先获取 CSRF Token”或“注入 Cookie”的模式。

### 4.2. 修复 NowCoder 爬虫

1. **正则调试**：NowCoder 经常微调 HTML 类名。若数据为0，请在 `src-tauri/src/platforms/nowcoder.rs` 中开启调试日志（即恢复 `println!`），观察 HTML 结构，调整 `Regex::new` 的表达式。
2. **Cookie**：确保 Cookie 未过期。

### 4.3. 添加新平台

1. **后端**：在 `platforms/` 新建 `.rs` 文件，实现 `fetch_user_stats`。
2. **注册**：在 `lib.rs` 的 `fetch_user_stats` match 分支中添加新平台。
3. **前端**：在 `PlatformCard.tsx` 复用组件，在 `DashboardGrid.tsx` 添加 `Ref` 并加入 `handleRefreshAll` 数组。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1. Rust: LeetCode CN GraphQL (关键反爬逻辑)

位置：`src-tauri/src/platforms/leetcode.rs`

```rust
// 使用 noj-go 端点绕过部分权限限制
const LEETCODE_CN_NOJ_URL: &str = "https://leetcode.cn/graphql/noj-go/";

pub async fn fetch_user_stats(handle: &str) -> Result<UserStats> {
    // 伪造 Referer 是成功的关键
    let profile_referer = format!("https://leetcode.cn/u/{}/", handle);
    
    // Rating Query (注意：不带 operationName，发往 noj-go)
    let rating_query = json!({
        "query": r#"
            query ($userSlug: String!) {
                userContestRanking(userSlug: $userSlug) { rating }
            }
        "#,
        "variables": { "userSlug": handle }
    });

    // 并发请求
    let (rating_resp, solved_resp) = tokio::join!(
        client.post(LEETCODE_CN_NOJ_URL)
            .header("Origin", "https://leetcode.cn")
            .header("Referer", &profile_referer) // 必须有
            .json(&rating_query)
            .send(),
        // ... solved query ...
    );
    // ...
}

```

### 5.2. Rust: 统一命令分发与重试

位置：`src-tauri/src/lib.rs`

```rust
#[tauri::command]
async fn fetch_user_stats(platform: String, handle: String, cookie: Option<String>) -> Result<UserStats, String> {
    let max_retries = 3;
    for attempt in 1..=max_retries {
        let res = match platform.to_lowercase().as_str() {
            "leetcode" => platforms::leetcode::fetch_user_stats(&handle).await.map_err(|e| e.to_string()),
            "nowcoder" => platforms::nowcoder::fetch_user_stats(&handle, &cookie.unwrap_or_default()).await.map_err(|e| e.to_string()),
            // ...
        };
        
        match res {
            Ok(stats) => return Ok(stats),
            Err(_) if attempt < max_retries => tokio::time::sleep(tokio::time::Duration::from_millis(800)).await,
            Err(e) => return Err(e),
        }
    }
    Err("Max retries exceeded".to_string())
}

```

### 5.3. React: 批量并发调用

位置：`src/components/DashboardGrid.tsx`

```tsx
const handleRefreshAll = async () => {
    setIsGlobalRefreshing(true);
    // 确保所有启用的 Ref 都在此数组中
    const refs = [cfRef, acRef, ncRef, lcRef]; 
    await Promise.allSettled(
      refs.map(ref => ref.current?.triggerSearch())
    );
    setIsGlobalRefreshing(false);
};

```

---

## 6. 尚未解决的问题 (Known Issues)

1. **NowCoder Cookie 有效期**：用户必须定期手动更新 Cookie，目前无法自动保活。
2. **LeetCode CN 稳定性**：依赖 `noj-go` 端点属于非官方途径，若官方关闭该端点或强制要求登录，此功能将失效，届时需引入 Cookie 机制。
3. **Rust Panic 风险**：尽管已做处理，但在 HTML 解析（Regex/Scraper）遇到极端异常的字符编码时，仍需警惕 Panic 导致 App 崩溃（建议在生产环境加一层 `catch_unwind` 或加强 Error Handling）。