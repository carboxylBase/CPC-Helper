# CPC Helper (Contest App) 项目维护文档 v1.3.0

## 1. 项目概述 (Project Overview)

本项目是一个基于 **Tauri v2** (Rust) + **React** (TypeScript/Vite) 的跨平台桌面应用，专为算法竞赛选手设计。核心宗旨是“聚合”与“直观”，通过统一的界面管理多平台比赛日程、个人战绩以及每日刷题计划。

**v1.3.0 核心更新**：

* **活跃度热力图 (Activity Heatmap)**：在仪表盘底部新增了 GitHub 风格的刷题热力图。通过记录每日做题总数的快照，自动计算每日增量，直观展示最近一年、一月、一周及昨日的活跃度。
* **日程无缝集成**：在比赛列表 (`ContestList`) 中新增“加入日程”按钮，一键将比赛信息转换为 Todo 任务，并自动同步到 `TodoPanel`。
* **爬虫稳定性优化**：
* **Codeforces**：回退至纯 API 模式以规避 Cloudflare 反爬虫，通过严格的 `ContestId + Index` 去重逻辑来接近主页数据。
* **LeetCode**：采用混合策略，使用国际服 API 获取比赛列表（更稳定），但生成国服跳转链接；个人战绩继续查询国服接口。
* **HDU**：修复了比赛链接生成逻辑，从杂乱的 href 中提取 `cid` 重组标准 URL。


* **UI 细节打磨**：移除了平台卡片上的段位显示（视觉减负），修复了日历组件在 `TodoPanel` 中被遮挡的层级问题。

**核心技术栈**：

* **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts (可视化).
* **Backend**: Rust (Tauri v2), Reqwest (异步爬虫), Tokio, Regex, Scraper.
* **Storage**: LocalStorage (前端持久化 Todo 数据 & 每日刷题快照).
* **Communication**: Custom DOM Events (`cpc_todo_update`) 用于组件间通讯.

---

## 2. 目录结构 (Directory Structure)

```text
cpc_helper/
├── src/                            # 前端源码 (React + TS)
│   ├── components/
│   │   ├── DashboardGrid.tsx       # [核心] 战绩仪表盘 (集成热力图)
│   │   ├── ActivityHeatmap.tsx     # [新增] 活跃度热力图组件
│   │   ├── ContestList.tsx         # [核心] 比赛列表 (含添加到日程逻辑)
│   │   ├── TodoPanel.tsx           # [核心] 题库/待办面板 (监听更新事件)
│   │   ├── DatePicker.tsx          # 通用日历选择器
│   │   ├── PlatformCard.tsx        # 通用平台卡片 (已移除 Rank 显示)
│   │   └── ...
│   ├── utils/
│   │   ├── history.ts              # [新增] 历史快照记录与热力图计算逻辑
│   │   └── index.ts                # 通用工具函数
│   └── App.tsx                     # 主入口
├── src-tauri/                      # 后端源码 (Rust)
│   ├── src/
│   │   ├── platforms/              # 爬虫实现
│   │   │   ├── codeforces.rs       # CF API (ContestList + UserStatus + UserInfo)
│   │   │   ├── leetcode.rs         # LC 混合策略 (Com for Contests, CN for Stats)
│   │   │   ├── hdu.rs              # HDU HTML 解析 (Regex/Scraper)
│   │   │   └── ...
│   │   ├── models.rs               # 数据结构定义
│   │   └── main.rs                 # Tauri 命令注册
│   └── Cargo.toml
└── package.json

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1. 活跃度热力图 (Activity Heatmap)

* **被动快照机制**：系统不依赖复杂的后端数据库。每次用户成功刷新战绩时，前端对比“今日已记录总数”与“当前总数”，取最大值存入 `localStorage` (`cpc_activity_history`)。
* **差分计算**：热力图数据 = `History[Today] - History[Yesterday]`。
* **冷启动**：新用户第一天使用时，由于没有昨日数据，增量为 0（热力图为空），从第二天开始显示绿色格子。

### 3.2. 跨组件通讯 (Contest -> Todo)

为了避免引入 Redux/Context 等重型状态管理，采用了轻量级的 **自定义 DOM 事件** 模式：

1. **发送方** (`ContestList`)：用户点击添加按钮 -> 写入 LocalStorage -> `window.dispatchEvent(new Event('cpc_todo_update'))`。
2. **接收方** (`TodoPanel`)：`useEffect` 监听 `cpc_todo_update` 事件 -> 触发 `loadItems()` 重新读取 LocalStorage。

### 3.3. 爬虫策略调整 (Crawler Strategies)

* **Codeforces**：
* **问题**：直接爬取 Profile HTML 会遭遇 Cloudflare 403 拦截。
* **对策**：坚持使用 `user.status` API。虽然 API 数据包含 Gym 和私有比赛（导致总数略高于主页公开题数），但这是唯一稳定的方案。
* **去重**：使用 `HashSet` 存储 `${contestId}-${index}` (如 `1800-A`)，确保同一道题多次 AC 只算一次。


* **LeetCode**：
* **策略**：利用国际服 (`leetcode.com`) 稳定的 GraphQL API 获取比赛列表，但在 Rust 端强行将 URL 格式化为 `leetcode.cn` 域名，实现“查国际服数据，跳国服链接”。



---

## 4. 维护指南 (Maintenance Guide)

### 4.1. 添加新平台支持

1. **后端**：在 `src-tauri/src/platforms/` 下新建 `xxx.rs`，实现 `fetch_contests` 和 `fetch_user_stats`。
2. **注册**：在 `src-tauri/src/lib.rs` (或 `main.rs`) 中注册新的 Tauri Command。
3. **前端**：在 `src/components/DashboardGrid.tsx` 中添加对应的 `PlatformCard`，并在 `handleRefreshAll` 中加入引用。

### 4.2. 修复 LeetCode 比赛查询

如果 LeetCode 国际服 API 变更，请检查 `src-tauri/src/platforms/leetcode.rs` 中的 GraphQL Query。注意保留 URL 替换逻辑，确保用户跳转到 CN 站点。

### 4.3. UI 层级问题

如果发现 `DatePicker` 或 `Tooltip` 被遮挡，请检查父容器的 `z-index` 和 `position`。目前的方案是：

* `DatePicker` 内部弹窗：`absolute z-50`。
* `TodoPanel` 输入框容器：`relative z-10` (防止被下方的列表容器遮挡)。
* 顶部导航栏：`z-20`。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1. 历史快照与增量计算 (`src/utils/history.ts`)

```typescript
// 核心逻辑：计算每日增量
export const calculateDailyActivity = (): DailyActivity[] => {
  const saved = localStorage.getItem(HISTORY_KEY);
  if (!saved) return [];
  const history: ActivityHistory = JSON.parse(saved);
  const sortedDates = Object.keys(history).sort();
  // ...
  for (let i = 0; i < sortedDates.length; i++) {
    // Diff = Today - Yesterday
    const delta = Math.max(0, total - prevTotal);
    dateMap.set(dateStr, delta);
  }
  // ... 填充空缺日期 ...
};

```

### 5.2. 跨组件事件监听 (`TodoPanel.tsx`)

```typescript
useEffect(() => {
  loadItems(); // 首次加载
  
  // 监听来自 ContestList 的更新事件
  const handleUpdate = () => loadItems();
  window.addEventListener('cpc_todo_update', handleUpdate);

  return () => window.removeEventListener('cpc_todo_update', handleUpdate);
}, [loadItems]);

```

### 5.3. Codeforces 严格去重 (`src-tauri/src/platforms/codeforces.rs`)

```rust
// 只统计 AC 的提交
if let Some(verdict) = sub.verdict {
    if verdict == "OK" {
        // 使用 "ContestID-Index" 作为唯一标识 (例如 "1800-A")
        if let Some(cid) = sub.problem.contest_id {
            let key = format!("{}-{}", cid, sub.problem.index);
            unique_solved.insert(key);
        }
    }
}
solved_count = unique_solved.len() as u32;

```

---

## 6. 尚未解决的问题 (Known Issues)

1. **Codeforces 数据微差**：API 获取的做题数包含了 Gym 和 Mashup 私有比赛的题目，而 CF 个人主页默认只显示公开题库数量。目前无法通过 API 区分某道题是否属于“公开题库”，因此 API 数据通常略大于主页数据。
2. **HDU 爬虫稳定性**：HDU 偶尔会因为服务器响应慢导致超时，目前前端未做精细的重试提示，只显示 Error。
3. **LocalStorage 数据积累**：热力图和 Todo 数据均存储在 LocalStorage。虽然文本数据体积很小，但若用户使用数年，建议未来增加 `export/import` JSON 的功能以备份数据。
4. **反爬虫风险**：虽然已切换到 API 模式，但如果短时间内极高频刷新（例如 1 秒 10 次），IP 仍可能被 CF 暂时封禁。建议保留前端的 "Debounce"（防抖）逻辑。