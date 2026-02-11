# CPC Helper (Contest App) 项目维护文档 v1.1.0

## 1. 项目概述 (Project Overview)

本项目是一个基于 **Tauri v2** (Rust) + **React** (TypeScript/Vite) 的跨平台桌面应用，专为算法竞赛选手设计。其核心宗旨是“聚合”与“直观”，通过统一的界面管理多平台比赛日程及个人战绩。

**核心技术栈**：

* **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts (可视化), Framer Motion.
* **Backend**: Rust (Tauri v2), Reqwest (异步请求), Tokio (并发异步运行时), Regex (高效 HTML 解析), Chrono (时区处理).

**已集成平台 (7个)**：

* Codeforces, AtCoder, NowCoder, LeetCode, HDU, Luogu, **Daimayuan (代码源) [v2.0 新增]**.

---

## 2. 目录结构 (Directory Structure)

```text
cpc_helper/
├── src/                        # 前端源码 (React + TS)
│   ├── components/
│   │   ├── DashboardGrid.tsx   # [核心] 战绩仪表盘，管理所有 PlatformCard 的状态聚合与饼图展示
│   │   ├── PlatformCard.tsx    # [核心] 通用平台组件，处理 Handle 持久化与数据请求触发
│   │   ├── ContestList.tsx     # 比赛列表，支持多平台比赛聚合显示
│   │   └── Icons.tsx           # 矢量图标库
│   ├── services/
│   │   └── contestService.ts   # 前后端桥接层，定义 invoke('fetch_user_stats') 等调用
│   ├── utils.ts                # [核心] 颜色映射 (赤橙黄绿青蓝紫方案) 与时间格式化工具
│   ├── types.ts                # TypeScript 类型定义 (Contest, UserStats)
│   └── App.tsx                 # 主入口，管理 Keep-Alive 页面切换与滑动导航条
├── src-tauri/                  # 后端源码 (Rust)
│   ├── src/
│   │   ├── platforms/          # [核心] 各平台爬虫实现
│   │   │   ├── codeforces.rs   # JSON API 交互
│   │   │   ├── luogu.rs        # WAF Bypass + 双模解析
│   │   │   ├── daimayuan.rs    # [核心] 针对 Hydro 架构的 HTML 强力正则解析
│   │   │   └── ...
│   │   ├── models.rs           # 统一的数据结构定义 (struct Contest, struct UserStats)
│   │   ├── lib.rs              # 命令调度中心，使用 tokio::join! 实现多平台并发并发抓取
│   │   └── main.rs             
│   └── tauri.conf.json         # Tauri 配置文件
└── package.json

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1. 视觉系统 (Visual Spectrum)

* **光谱配色方案**：v2.0 引入了“赤橙黄绿青蓝紫”配色方案，通过 `utils.ts` 中的 `getPlatformColor` 函数实现。
* `HDU(赤)`, `LeetCode(橙)`, `AtCoder(黄)`, `NowCoder(绿)`, `Luogu(青)`, `Codeforces(蓝)`, `Daimayuan(紫)`.


* **状态保持**：通过 CSS `display: none/block` 切换页面，确保查询到的战绩和滚动位置在选项卡切换时不会丢失。

### 3.2. 后端爬虫架构 (Crawler Architecture)

* **并发聚合模型**：在 `lib.rs` 中，`fetch_all_contests` 使用 `tokio::join!` 同时启动 7 个平台的异步抓取任务，最大化利用带宽，单次聚合请求通常在 1-2 秒内完成。
* **强力 HTML 解析策略**：对于无 API 且结构复杂的页面（如代码源），采用 `(?s)` 单行模式正则配合 `[\s\S]*?` 跨行匹配。
* **Daimayuan 策略**：先定位 `numbox` 容器锚点，再在容器内寻找特定文本（如“已通过”），并具备“取第二个匹配项”的 Fallback 机制。
* **Rating 提取**：针对倒序排列的表格，优先捕获 HTML 中的第一个匹配项以获取最新战绩。



---

## 4. 维护指南 (Maintenance Guide)

### 4.1. 增加新平台

1. **Backend**:
* 在 `src-tauri/src/platforms/` 创建新文件。
* 实现 `fetch_contests` 和 `fetch_user_stats`。
* 在 `lib.rs` 注册模块并加入 `tokio::join!` 列表。


2. **Frontend**:
* 在 `utils.ts` 的 `getPlatformColor` 中分配新颜色。
* 在 `DashboardGrid.tsx` 中新增 `useRef` 并放置新的 `<PlatformCard />`。
* 将新平台的 key 加入 `chartData` 的 `useMemo` 数组中。



### 4.2. 调试技巧

* **Rust 调试**：在爬虫逻辑中插入 `println!("DEBUG: ...")`，运行 `npm run tauri dev` 即可在终端实时查看解析过程。
* **HTML 分析**：若正则失效，应优先打印 HTML 源码段落，检查是否存在特殊的 `\r\n` 换行符或不可见转义字符。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1. Rust: 跨行 HTML 精准匹配 (`daimayuan.rs`)

```rust
// 使用 (?s) 开启点号匹配换行符，确保在容器范围内精准定位
let re_solved = Regex::new(r#"(?s)<div[^>]*class="numbox"[^>]*>[\s\S]*?numbox__num[^>]*>(\d+)</div>[\s\S]*?已通过"#).unwrap();

// 获取表格第一项有效 Rating
let re_rating = Regex::new(r#"class="col--new_rating"[^>]*>(\d+)</td>"#).unwrap();
let latest_rating = re_rating.captures(&html).and_then(|cap| cap[1].parse::<u32>().ok());

```

### 5.2. Rust: 多平台并发并行执行 (`lib.rs`)

```rust
let (cf_res, ac_res, nc_res, lc_res, hdu_res, lg_res, dmy_res) = tokio::join!(
    platforms::codeforces::fetch_contests(),
    platforms::atcoder::fetch_contests(),
    platforms::nowcoder::fetch_contests(),
    platforms::leetcode::fetch_contests(),
    platforms::hdu::fetch_contests(),
    platforms::luogu::fetch_contests(),
    platforms::daimayuan::fetch_contests()
);

```

### 5.3. TS: 光谱色映射逻辑 (`utils.ts`)

```typescript
export const getPlatformColor = (platform: string): string => {
  const colors: Record<string, string> = {
    'hdu': '#ef4444', 'leetcode': '#f97316', 'atcoder': '#eab308',
    'nowcoder': '#22c55e', 'luogu': '#06b6d4', 'codeforces': '#3b82f6',
    'daimayuan': '#8b5cf6'
  };
  return colors[platform.toLowerCase()] || '#94a3b8';
};

```

---

## 6. 尚未解决的问题 (Known Issues)

1. **NowCoder Cookie**：由于牛客反爬限制，部分战绩查询仍需定期手动更新本地存储的 Cookie。
2. **Luogu 登录态**：洛谷的 WAF 绕过仅针对公开数据，私有比赛或深度数据需要处理更复杂的会话保活。
3. **HDU 战绩系统**：HDU 平台个人战绩接口目前处于不稳定状态，仅建议保留比赛日历功能。
4. **Hydro 架构通用性**：当前 `daimayuan.rs` 的解析器针对代码源做了深度适配，若迁移至其他 Hydro 架构 OJ，需检查“已通过”等关键词是否一致。