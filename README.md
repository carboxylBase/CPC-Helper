# CPC-Helper Project Documentation (v3.2 - HDU & Color Update)

## 1. 项目概述 (Project Overview)

**项目名称**: `cpc-helper` (原 `contest-cli`)
**核心功能**: 一个基于 **Tauri v2** 构建的跨平台桌面应用，用于并发查询全球主流算法竞赛平台的近期比赛信息。
**支持平台**: **Codeforces**, **AtCoder**, **NowCoder (牛客网)**, **LeetCode**, **HDU (杭电OJ - 新增)**。

**版本特性 (v3.2)**:

* **平台扩展**: 新增 **HDU (杭电)** 爬虫支持。出于测试目的，HDU 模块目前配置为**直接抓取最近 5 场比赛**（无视时间限制）。
* **依赖优化**: 前端移除了 `date-fns` 依赖，完全采用原生 JavaScript (`Intl`, `Date`) 实现时间格式化，减少包体积。
* **视觉调整**: 更新了平台主题色映射：
* **NowCoder**: 绿色 (`#16a34a`)
* **AtCoder**: 黄色 (`#d69e2e`)
* **HDU**: 红色 (`#e53e3e`)



**技术栈**:

* **Core**: Rust (Tauri v2, Tokio, Reqwest, Scraper, Serde, Chrono, Anyhow)
* **Frontend**: React (TypeScript), Vite, Tailwind CSS
* **Architecture**: Service-Oriented (Rust as Backend Service, React as UI)
* **Storage**: Browser LocalStorage (用户偏好设置)

---

## 2. 目录结构 (Directory Structure)

```text
cpc-helper/
├── src/                        # 前端源码 (React + TypeScript)
│   ├── assets/                 # 静态资源
│   ├── services/               # 服务层
│   │   └── contestService.ts   # Tauri invoke 封装
│   ├── App.tsx                 # 主逻辑 (含 UI 布局与侧滑抽屉)
│   ├── index.css               # 全局样式
│   ├── types.ts                # TypeScript 类型定义
│   ├── utils.ts                # [重点] 颜色映射、原生时间格式化工具
│   └── main.tsx                # React 入口
├── src-tauri/                  # 后端源码 (Rust Tauri 环境)
│   ├── capabilities/           # 权限配置
│   ├── src/
│   │   ├── platforms/          # 爬虫模块
│   │   │   ├── nowcoder.rs     # 含严格时间过滤逻辑
│   │   │   ├── atcoder.rs      # AtCoder 爬虫
│   │   │   ├── codeforces.rs   # Codeforces 爬虫
│   │   │   ├── leetcode.rs     # LeetCode 爬虫
│   │   │   └── hdu.rs          # [新增] HDU 爬虫 (含表格列定位逻辑)
│   │   ├── lib.rs              # [重点] 核心逻辑 (Tokio 5路并发调度)
│   │   └── models.rs           # 数据模型 (Contest Struct)
│   ├── Cargo.toml              # Rust 依赖
│   └── tauri.conf.json         # Tauri 配置
├── tailwind.config.js          # Tailwind 配置
└── package.json                # 前端依赖

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1 架构设计

* **后端 (Rust)**: 无状态数据聚合层。`fetch_all_contests` 指令使用 `tokio::join!` 并发执行 5 个平台的爬虫任务。
* **HDU 特殊处理**:
* 由于 HDU 页面结构老旧且非标准，爬虫通过**列索引 (Column Index)** 定位数据。
* 目前逻辑：**Index 1** 为名称，**Index 2** 为时间。
* 必须过滤掉包含 "Problem Archive" 或 "Contest Name" 的导航行。
* **测试模式**: 强制只抓取前 5 条有效数据，不做 `start_time > now` 过滤。



### 3.2 UI/UX 交互逻辑

* **颜色系统**:
* 前端通过 `utils.ts` 中的 `getPlatformColor` 统一管理平台主题色。
* 支持动态透明度转换 (`hexToRgba`) 以适配毛玻璃效果。


* **零依赖时间处理**:
* 移除了 `date-fns`。
* 使用 `date.toLocaleTimeString('en-GB', ...)` 确保时间格式为 `HH:mm`。
* 使用自定义逻辑判断“今天/明天”。



### 3.3 数据清洗逻辑

* **NowCoder**: 必须保留 `start_time > Utc::now()` 过滤，防止返回历史比赛。
* **HDU**: 必须处理 `NaiveDateTime` (假设 UTC+8) 到 `DateTime<Utc>` 的转换。

---

## 4. 维护指南 (Maintenance Guide)

### 4.1 添加新平台

1. **Rust**: 在 `src-tauri/src/platforms/` 下新建模块，实现 `fetch_contests`。
2. **Rust**: 在 `src-tauri/src/lib.rs` 中注册模块，并在 `tokio::join!` 中添加任务。
3. **Frontend**: 在 `src/utils.ts` 的 `getPlatformColor` 中添加对应颜色。

### 4.2 HDU 维护特别注意

* **HTML 结构变动**: HDU 的表格极为古老，如果爬取失败，大概率是**列索引 (Column Index)** 发生了变化。请优先检查 `tds.get(2)` 是否仍对应时间列。
* **编码问题**: 目前 `reqwest` 自动处理了编码。如果未来出现乱码，可能需要引入 `encoding_rs` 处理 GBK 编码。

### 4.3 前端调试

* 如果时间显示格式异常（如缺少前导零），请检查 `src/utils.ts` 中的 `toLocaleTimeString` 参数配置。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1 平台颜色映射与原生时间工具 (Frontend)

*位置: `src/utils.ts*`

```typescript
export const getPlatformColor = (platform: string): string => {
  switch (platform.toLowerCase()) {
    case 'codeforces': return '#3182ce'; // Blue
    case 'atcoder':    return '#d69e2e'; // Yellow (原牛客色)
    case 'nowcoder':   return '#16a34a'; // Green  (新牛客色)
    case 'leetcode':   return '#d97706'; // Amber
    case 'hdu':        return '#e53e3e'; // Red    (HDU色)
    default:           return '#718096'; // Gray
  }
};

// 原生 JS 实现 HH:mm 补零格式化
export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

```

### 5.2 HDU 爬虫核心逻辑 (Rust Backend)

*位置: `src-tauri/src/platforms/hdu.rs*`
*注意: 包含列定位 (Index 2) 与 导航栏过滤逻辑*

```rust
pub async fn fetch_contests() -> Result<Vec<Contest>> {
    // ... (HTTP Request omitted)
    
    for row in document.select(&row_selector) {
        if count >= 5 { break; } // 仅抓取最近5场用于测试

        let tds: Vec<_> = row.select(&td_selector).collect();
        if tds.len() < 3 { continue; } // 至少要有 ID, Name, Time

        // Name at Index 1
        let name_el = match tds.get(1) { Some(el) => el, None => continue };
        let raw_name = name_el.text().collect::<Vec<_>>().join("").trim().to_string();

        // 关键：过滤导航行
        if raw_name.is_empty() || raw_name == "Problem Archive" || raw_name.contains("Contest Name") {
            continue;
        }

        // Time at Index 2 (经调试确认)
        let time_str = match tds.get(2) {
            Some(el) => el.text().collect::<Vec<_>>().join("").trim().to_string(),
            None => continue,
        };

        // 解析时间 (UTC+8 -> UTC)
        let start_time = match NaiveDateTime::parse_from_str(&time_str, "%Y-%m-%d %H:%M:%S") {
            Ok(dt) => {
                let offset = FixedOffset::east_opt(8 * 3600).unwrap();
                match offset.from_local_datetime(&dt).single() {
                    Some(local_dt) => local_dt.with_timezone(&chrono::Utc),
                    None => continue,
                }
            },
            Err(_) => continue,
        };

        contests.push(Contest {
            name: raw_name,
            start_time,
            url: full_url,
            platform: "HDU".to_string(),
        });
        count += 1;
    }
    Ok(contests)
}

```

### 5.3 并发调度中心 (Rust Backend)

*位置: `src-tauri/src/lib.rs*`

```rust
#[tauri::command]
async fn fetch_all_contests() -> Result<Vec<Contest>, String> {
    // 并发执行 5 个平台的爬虫
    let (cf_res, ac_res, nc_res, lc_res, hdu_res) = tokio::join!(
        platforms::codeforces::fetch_contests(),
        platforms::atcoder::fetch_contests(),
        platforms::nowcoder::fetch_contests(),
        platforms::leetcode::fetch_contests(),
        platforms::hdu::fetch_contests()
    );

    let mut all_contests = Vec::new();
    // ... (Error handling and merging omitted)
    
    // 统一按时间排序
    all_contests.sort_by(|a, b| a.start_time.cmp(&b.start_time));
    Ok(all_contests)
}

```