# CPC Helper (Contest App) 项目维护文档 v1.0

## 1. 项目概述 (Project Overview)

本项目是一个基于 **Tauri v2** (Rust) + **React** (TypeScript/Vite) 的跨平台桌面应用，旨在辅助算法竞赛选手管理比赛日程及查询个人战绩。

**核心技术栈**：

* **Frontend**: React, TypeScript, Tailwind CSS, Recharts, Framer Motion (conceptually).
* **Backend**: Rust (Tauri), Reqwest, Tokio, Anyhow, Regex.

**核心功能**：

* **比赛日历**：聚合 Codeforces, AtCoder, NowCoder, LeetCode, HDU, Luogu 等平台的近期比赛。
* **个人战绩查询**：支持多平台 Rating、排名及刷题数查询。
* **数据可视化**：**[v5.0 新增]** 动态甜甜圈图 (Donut Chart) 展示各平台刷题分布，支持交互式缩放与详情浮层。
* **状态保持**：**[v5.0 新增]** 切换选项卡时保留查询结果与滚动位置，拒绝重复加载。
* **UI 交互优化**：**[v5.0 新增]** 导航栏增加物理惯性滑动的蓝色指示条。
* **智能重试与 WAF 绕过**：后端具备自动重试与洛谷 (Luogu) 反爬虫绕过机制。

---

## 2. 目录结构 (Directory Structure)

```text
cpc_helper/
├── src/                        # 前端源码 (React + TS)
│   ├── components/
│   │   ├── DashboardGrid.tsx   # [核心] 战绩仪表盘，包含 PieChart 可视化逻辑与数据聚合
│   │   ├── PlatformCard.tsx    # [核心] 单个平台卡片，负责数据获取并通过 Callback 汇报给父组件
│   │   ├── ContestList.tsx     # 比赛列表组件
│   │   ├── SettingsDrawer.tsx  # 设置抽屉
│   │   └── ...
│   ├── App.tsx                 # [核心] 主入口，包含滑动 Tab 动画与 Keep-Alive 页面维持逻辑
│   ├── main.tsx
│   └── utils.ts                # 工具函数 (颜色转换等)
├── src-tauri/                  # 后端源码 (Rust)
│   ├── src/
│   │   ├── platforms/          # 各平台爬虫实现
│   │   │   ├── luogu.rs        # 洛谷 (WAF Bypass + Dual Parse)
│   │   │   ├── leetcode.rs     # LeetCode CN (noj-go Endpoint)
│   │   │   └── ...
│   │   ├── lib.rs              # 命令分发、并发聚合 (tokio::join!)
│   │   └── main.rs
│   └── tauri.conf.json         # Tauri 配置
└── package.json

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1. 前端架构演进 (v5.0)

1. **Tab 导航动画 (Sliding Indicator)**：
* **原理**：不依赖传统的 CSS border，而是使用一个绝对定位的 `div`。
* **实现**：通过 `useRef` 捕获 Tab 按钮的 DOM 节点，在 `activeTab` 变化时计算 `offsetLeft` 和 `offsetWidth`，通过 CSS `transition` 实现平滑的惯性移动。


2. **状态保持 (Keep-Alive Strategy)**：
* **问题**：旧版使用条件渲染 `{ show ? <A/> : <B/> }` 导致组件卸载，丢失查询数据。
* **解决**：改为**同时渲染**所有视图，通过 CSS `display: block/none` 控制显隐。
* **优势**：组件只在启动时挂载一次，切换无延迟，数据不丢失。


3. **数据流向与可视化 (Recharts Integration)**：
* **自下而上**：`PlatformCard` 获取数据后，通过 `onStatsUpdate` 回调函数将 `solved_count` 冒泡传给父组件 `DashboardGrid`。
* **聚合绘制**：`DashboardGrid` 维护一个 `solvedStats` 字典，实时计算总题数并驱动 `PieChart` 更新。
* **交互细节**：实现了自定义 `ActiveShape`（鼠标悬停时扇区半径变大）和高层级 `Z-Index` 的 Tooltip（防止被遮挡）。



### 3.2. 后端反爬与并发 (Rust)

1. **并发模型**：使用 `tokio::join!` 并行执行所有平台的爬虫任务。所有错误通过 `anyhow::Result` 统一处理，确保满足 `Send` trait 约束。
2. **Luogu WAF 绕过**：手动处理 `302 Redirect`，提取 `Set-Cookie` 并进行二次请求。优先尝试 JSON API，失败则回退至 HTML 正则解析。

---

## 4. 维护指南 (Maintenance Guide)

### 4.1. 添加新平台

1. **后端**：在 `src-tauri/src/platforms/` 添加爬虫逻辑，并在 `lib.rs` 注册。
2. **前端组件**：在 `DashboardGrid.tsx` 中添加新的 `<PlatformCard />`。
3. **图表适配**：
* 在 `DashboardGrid.tsx` 的 `chartData` `useMemo` 钩子中，添加新平台的 Key 和 Name 映射，否则新平台的数据不会出现在饼图中。



### 4.2. TypeScript 类型问题 (Recharts)

* **注意**：`recharts` 的某些类型定义可能滞后于运行时功能。例如 `Pie` 组件的 `activeIndex` 属性在类型定义中可能缺失。
* **处理**：代码中使用了 `// @ts-ignore` 来抑制此报错。在升级 `recharts` 版本时，可尝试移除该注释查看是否已修复。

### 4.3. 洛谷与 LeetCode 接口

* **Luogu**：若 API 格式变更，需同时检查 JSON 结构和 HTML 正则表达式。
* **LeetCode**：依赖 `noj-go` 端点，若失效需切换回 GraphQL 标准端点（可能需要更复杂的 Cookie 处理）。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1. React: Tab 平滑滑动与 Ref 处理 (`App.tsx`)

```tsx
// 解决 ref 类型报错的关键写法：使用回调函数而非直接赋值
<button
  ref={(el) => { tabsRef.current['contests'] = el; }}
  onClick={() => setActiveTab('contests')}
  className="..."
>
  Contest Calendar
</button>

// 动态计算蓝条位置
useEffect(() => {
  const currentTabElement = tabsRef.current[activeTab];
  if (currentTabElement) {
    setTabIndicatorStyle({
      left: currentTabElement.offsetLeft,
      width: currentTabElement.offsetWidth
    });
  }
}, [activeTab]);

```

### 5.2. React: 扇区放大与 Tooltip 层级修复 (`DashboardGrid.tsx`)

```tsx
// 自定义放大扇区
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy} innerRadius={innerRadius}
        outerRadius={outerRadius + 8} // 物理放大 8px
        startAngle={startAngle} endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

// 强制 Tooltip 置顶
<Tooltip 
  wrapperStyle={{ zIndex: 1000, outline: 'none' }} // 解决遮挡问题
  allowEscapeViewBox={{ x: true, y: true }}
/>

```

---

## 6. 尚未解决的问题 (Known Issues)

1. **NowCoder Cookie**：仍需手动更新，无自动保活/刷新机制。
2. **Luogu 查询限制**：仅支持数字 UID，不支持用户名直接查询。
3. **HDU 平台**：仅支持比赛日历，个人战绩接口处于禁用状态。
4. **TypeScript Warning**：`DashboardGrid.tsx` 中存在针对 Recharts `activeIndex` 的 `@ts-ignore` 压制。