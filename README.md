# CPC-Helper Project Documentation (v3.3 - Dashboard & Refactoring Update)

## 1. 项目概述 (Project Overview)

**项目名称**: `cpc-helper` (原 `contest-cli`)
**核心功能**: 一个基于 **Tauri v2** 构建的跨平台桌面应用，集成了两大核心模块：

1. **竞赛日程 (Contest Calendar)**: 并发查询全球主流算法竞赛平台的近期比赛信息。
2. **刷题仪表盘 (Solver Dashboard)**: [新增] 查询并展示用户的刷题数据（AC数、Rating、段位等），采用网格化仪表盘设计。

**支持平台**:

* **竞赛查询**: Codeforces, AtCoder, NowCoder, LeetCode, HDU (杭电OJ)。
* **用户查询**: 目前已实现 **Codeforces** (含 Rating & Solved Count)，其他平台（LeetCode, AtCoder 等）已预留 UI 占位。

**版本特性 (v3.3)**:

* **架构重构**: 前端 `App.tsx` 完成组件化拆分，解耦了 UI 布局、图标资源与业务逻辑。
* **功能新增**: 新增 "User Stats" 模块，后端支持并发抓取 Codeforces 的用户信息 (`user.info`) 与提交记录 (`user.status`)。
* **逻辑修正**: 修复 HDU 爬虫排序逻辑，现在正确显示“即将开始”的最近 5 场比赛（过滤掉已结束的）。
* **UI 优化**: 竞赛列表增加日期显示 (`MM-DD`)；新增 Dashboard 网格布局；实装 Rating 动态颜色显示。

**技术栈**:

* **Core**: Rust (Tauri v2, Tokio, Reqwest, Scraper, Serde, Chrono, Anyhow)
* **Frontend**: React (TypeScript), Vite, Tailwind CSS (Component-based Architecture)
* **State Management**: React Hooks + LocalStorage

---

## 2. 目录结构 (Directory Structure)

```text
cpc-helper/
├── src/                        # 前端源码 (React + TypeScript)
│   ├── assets/                 # 静态资源
│   ├── components/             # [新增] 组件库 (重构核心)
│   │   ├── Icons.tsx           # SVG 图标集合
│   │   ├── PlatformCard.tsx    # 单个平台的刷题统计卡片 (核心交互组件)
│   │   ├── ContestList.tsx     # 比赛列表视图
│   │   ├── DashboardGrid.tsx   # 刷题仪表盘网格视图
│   │   └── SettingsDrawer.tsx  # 右侧外观设置抽屉
│   ├── services/               # 服务层
│   │   └── contestService.ts   # Tauri invoke 封装 (新增 fetchUserStats)
│   ├── App.tsx                 # [精简] 主入口 (仅负责布局与全局状态)
│   ├── index.css               # 全局样式
│   ├── types.ts                # 类型定义 (含 UserStats)
│   └── utils.ts                # 工具函数 (颜色映射、Rating配色、时间格式化)
├── src-tauri/                  # 后端源码 (Rust Tauri 环境)
│   ├── src/
│   │   ├── platforms/          # 爬虫模块
│   │   │   ├── codeforces.rs   # [更新] 含 fetch_user_stats 并发逻辑
│   │   │   ├── hdu.rs          # [修正] 修复排序与时间过滤
│   │   │   └── ... (其他平台)
│   │   ├── lib.rs              # [更新] 注册 fetch_user_stats 指令
│   │   └── models.rs           # [更新] 新增 UserStats 结构体
│   └── Cargo.toml              # Rust 依赖
└── package.json                # 前端依赖

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1 后端架构 (Rust)

* **并发模型**:
* **竞赛抓取**: 继续沿用 `tokio::join!` 并发执行 5 个平台的 `fetch_contests`。
* **用户统计**: 在 `codeforces::fetch_user_stats` 中，利用 `tokio::join!` 并发请求 `user.status` (做题记录) 和 `user.info` (个人信息)，最大限度减少等待时间。


* **HDU 修正逻辑**:
* 移除仅抓取前5行的限制，改为扫描全表。
* 解析时间后，通过 `contests.retain(|c| c.start_time > now)` 过滤历史比赛。
* 使用 `sort_by(|a, b| a.start_time.cmp(&b.start_time))` 确保最近的比赛排在最前。



### 3.2 前端架构 (React)

* **组件化 (Componentization)**:
* **DashboardGrid**: 负责网格布局，根据配置渲染多个 `PlatformCard`。
* **PlatformCard**: 独立封装了状态（输入框内容、加载态、数据结果）。支持 "Enabled/Disabled" 状态，方便未来逐步接入新平台。


* **数据展示**:
* **Rating Color**: `utils.ts` 中新增 `getRatingColor`，复刻 Codeforces 的颜色分级（红名、紫名等）。
* **Date Format**: 新增 `formatDate`，智能显示“今天”、“明天”或“MM-DD”。



---

## 4. 维护指南 (Maintenance Guide)

### 4.1 添加新平台的刷题统计 (e.g., LeetCode)

1. **后端 (Rust)**:
* 在 `src-tauri/src/platforms/leetcode.rs` 中实现 `fetch_user_stats(handle: &str) -> Result<UserStats>`。
* 在 `src-tauri/src/lib.rs` 的 `fetch_user_stats` match 分支中添加 `"leetcode"` 的处理逻辑。


2. **前端 (React)**:
* 在 `src/components/DashboardGrid.tsx` 中，找到 LeetCode 的 `PlatformCard`，将 `isEnabled` 属性改为 `true`。



### 4.2 修改 UI 布局

* 如果涉及**全局结构**（如侧边栏、Tab栏），修改 `src/App.tsx`。
* 如果涉及**比赛列表样式**，修改 `src/components/ContestList.tsx`。
* 如果涉及**刷题卡片内部逻辑**，修改 `src/components/PlatformCard.tsx`。

### 4.3 常见问题排查

* **HDU 抓取为空**: 检查 `hdu.rs` 中的列索引（目前 Index 1=Name, Index 2=Time）。HDU 网页编码古老，若出现乱码需关注编码转换。
* **Codeforces 统计失败**: CF API 有频率限制，如果频繁报错，可能需要增加重试机制或缓存。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1 用户统计并发抓取 (Rust Backend)

*位置: `src-tauri/src/platforms/codeforces.rs*`

```rust
pub async fn fetch_user_stats(handle: &str) -> Result<UserStats> {
    let client = reqwest::Client::new();

    // 并发构建请求
    let status_req = client
        .get(CF_USER_STATUS_URL)
        .query(&[("handle", handle), ("from", "1"), ("count", "10000")])
        .send();

    let info_req = client
        .get(CF_USER_INFO_URL)
        .query(&[("handles", handle)])
        .send();

    // 并发执行
    let (status_res, info_res) = tokio::join!(status_req, info_req);

    // ... (处理 JSON 解析与去重逻辑)

    Ok(UserStats {
        platform: "Codeforces".to_string(),
        handle: handle.to_string(),
        solved_count: solved_problems.len() as u32, // 去重后的 AC 数
        rank: user_info.rank.clone(),
        rating: user_info.rating,
    })
}

```

### 5.2 平台卡片组件 (React Frontend)

*位置: `src/components/PlatformCard.tsx*`

```tsx
const PlatformCard = ({ platformName, platformKey, cardStyle, isEnabled = false }: PlatformCardProps) => {
  // ... State management (handle, stats, loading)

  const handleSearch = async () => {
    // 调用 Tauri 指令 fetch_user_stats
    const data = await fetchUserStats(platformKey, handle);
    setStats(data);
  };

  return (
    <div style={cardStyle} className="...">
      {/* 顶部颜色条 */}
      <div className="..." style={{ backgroundColor: getPlatformColor(platformName) }}></div>
      
      {/* 结果展示区 */}
      {stats ? (
        <div className="grid grid-cols-2 ...">
           {/* Rating (带颜色) */}
           <span style={{ color: getRatingColor(stats.rating) }}>{stats.rating}</span>
           {/* Solved Count */}
           <span>{stats.solved_count}</span>
        </div>
      ) : (
        /* 输入框与搜索按钮 */
      )}
    </div>
  );
};

```

### 5.3 HDU 修正后的过滤逻辑 (Rust Backend)

*位置: `src-tauri/src/platforms/hdu.rs*`

```rust
// ... (HTML 解析部分)
// 5. 过滤与排序
let now = Utc::now();

// 过滤掉已经结束的比赛 (只保留未来的)
contests.retain(|c| c.start_time > now);

// 关键修正：按时间升序排列 (即将开始的在最前面)
contests.sort_by(|a, b| a.start_time.cmp(&b.start_time));

// 只保留最近的 5 场
if contests.len() > 5 {
    contests.truncate(5);
}

```