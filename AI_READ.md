# CPC Helper (Contest App) 项目维护文档 v1.1.3

## 1. 项目概述 (Project Overview)

本项目是一个基于 **Tauri v2** (Rust) + **React** (TypeScript/Vite) 的跨平台桌面应用，专为算法竞赛选手设计。核心宗旨是“聚合”与“直观”，通过统一的界面管理多平台比赛日程、个人战绩以及每日刷题计划。

**v1.1.3 核心更新**：

* **OTA 自动更新修复**：修复了 GitHub Actions 发布流程，新增自动生成 `latest.json` 的步骤，确保 Tauri v2 客户端能正确检测并下载更新。
* **Problem Pool (题库/待办)**：新增基于日期的任务管理功能。支持任务跨日继承（自动携带未完成任务到今日）、逾期警示、以及自定义的 Glassmorphism 风格日历组件。
* **组件重构**：将通用日期选择逻辑剥离为独立组件 (`DatePicker`)，提升代码复用性。

**核心技术栈**：

* **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts (可视化), Framer Motion.
* **Backend**: Rust (Tauri v2), Reqwest (异步爬虫), Tokio, Regex.
* **Storage**: LocalStorage (前端持久化 Todo 数据).
* **CI/CD**: GitHub Actions (自动构建 Windows/macOS/Linux 安装包 + 自动生成更新清单).

---

## 2. 目录结构 (Directory Structure)

```text
cpc_helper/
├── .github/
│   └── workflows/
│       └── release.yml     # [CI/CD] 包含构建、签名及 latest.json 生成脚本
├── src/                    # 前端源码 (React + TS)
│   ├── components/
│   │   ├── DashboardGrid.tsx   # [核心] 战绩仪表盘
│   │   ├── ContestList.tsx     # [核心] 比赛列表
│   │   ├── TodoPanel.tsx       # [新增] 题库/待办面板 (业务逻辑层)
│   │   ├── DatePicker.tsx      # [新增] 通用日历选择器 (纯 UI 组件)
│   │   ├── PlatformCard.tsx    # 通用平台卡片
│   │   └── ...
│   ├── utils.ts            # 工具函数
│   └── App.tsx             # 主入口 (Tab 路由、更新检测、全局布局)
├── src-tauri/              # 后端源码 (Rust)
│   ├── src/
│   │   ├── platforms/      # 爬虫实现 (daimayuan.rs, codeforces.rs 等)
│   │   ├── lib.rs          # 插件注册与并发调度
│   │   └── main.rs
│   ├── tauri.conf.json     # [配置] 包含公钥 (pubkey) 与版本号
│   └── Cargo.toml
└── package.json

```

---

## 3. 核心设计与实现细节 (Core Design & Implementation)

### 3.1. Problem Pool (GTD 任务系统)

* **数据结构**：
```typescript
interface TodoItem {
  id: string;
  title: string;
  link: string; // 可选链接
  targetDate: string; // YYYY-MM-DD
  completed: boolean;
  // ...
}

```


* **继承机制 (Inheritance)**：
系统不物理移动“过去未完成”的任务数据，而是通过**视图过滤**逻辑实现继承。
* **渲染逻辑**：当用户查看“今天”的视图时，过滤器会抓取 `targetDate == Today` **OR** `(targetDate < Today AND !completed)` 的所有条目。
* **警示 UI**：继承的任务会强制显示红色边框及 "Overdue" 动画标签。


* **组件分离**：
* `TodoPanel.tsx`：负责 CRUD、LocalStorage 同步、日期导航逻辑。
* `DatePicker.tsx`：独立的 UI 组件，封装了日历网格计算、点击外部关闭 (Click-Outside) 等交互细节，样式完全适配 App 的磨砂玻璃主题。



### 3.2. 自动更新系统 (Auto-Update System)

* **生成逻辑**：在 GitHub Actions 的 `generate-updater-json` 任务中，使用 JavaScript 脚本遍历 Release Assets。
* **动态签名**：脚本会自动下载 `.sig` 文件内容，并将其嵌入生成的 `latest.json` 中，结构符合 Tauri v2 规范：
```json
{
  "version": "1.1.3",
  "platforms": {
    "windows-x86_64": { "signature": "...", "url": "..." },
    "darwin-aarch64": { "signature": "...", "url": "..." }
  }
}

```



### 3.3. 前端交互策略

* **Tab 保持**：使用 `display: none` 而非条件渲染 (`{active && <Component />}`) 来切换 Tab，确保切换回 `ContestList` 或 `TodoPanel` 时，滚动位置和未保存的表单状态不丢失。

---

## 4. 维护指南 (Maintenance Guide)

### 4.1. 发布新版本流程

1. **版本号同步**：修改 `package.json` 和 `src-tauri/tauri.conf.json` 中的 `version` 字段。
2. **提交与打标**：
```bash
git add .
git commit -m "chore: bump version to v1.1.4"
git push
git tag v1.1.4
git push origin v1.1.4

```


3. **CI 验证**：确保 GitHub Actions 的 `publish-tauri` 和 `generate-updater-json` 两个 Job 都执行成功。
4. **发布**：在 GitHub Releases 页面编辑 Draft，点击 Publish。

### 4.2. 扩展 Todo 功能

* **修改 UI**：如需修改日历样式，请仅修改 `src/components/DatePicker.tsx`。
* **修改逻辑**：如需增加“标签”或“优先级”功能，请修改 `src/components/TodoPanel.tsx` 中的 `TodoItem` 接口，并确保存储逻辑兼容旧数据。

---

## 5. 关键代码片段备份 (Key Code Snippets)

### 5.1. 任务继承与筛选逻辑 (`TodoPanel.tsx`)

```typescript
const visibleItems = items.filter(item => {
  // 1. 显示目标日期是当前视图日期的任务
  if (item.targetDate === viewDate) return true;

  // 2. [核心] 继承机制：
  // 如果当前视图是"今天"，且任务"未完成"且"属于过去"，则强制显示（逾期）
  if (isViewToday && !item.completed && item.targetDate < todayStr) {
    return true;
  }
  return false;
});

```

### 5.2. GitHub Actions 生成 Update JSON (`release.yml`)

```javascript
// script snippet inside generate-updater-json job
const updateData = {
  version: version,
  notes: release.body,
  pub_date: release.published_at,
  platforms: {}
};

// 遍历 assets 匹配签名与二进制文件
for (const asset of assets) {
  if (asset.name.endsWith('.sig')) {
    const platform = getPlatform(asset.name.slice(0, -4)); // 辅助函数判断平台
    if (platform) {
      const signature = await fetch(asset.browser_download_url).then(r => r.text());
      updateData.platforms[platform] = {
        signature: signature.trim(),
        url: binaryAsset.browser_download_url
      };
    }
  }
}
fs.writeFileSync('latest.json', JSON.stringify(updateData, null, 2));

```

### 5.3. 独立日历组件结构 (`DatePicker.tsx`)

```typescript
// 纯 UI 组件，不包含业务逻辑
const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, triggerContent }) => {
  const [isOpen, setIsOpen] = useState(false);
  // ... ref click outside logic ...

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        {triggerContent || <span>{value}</span>}
      </button>
      {isOpen && (
        <div className="absolute top-full z-50">
          <CalendarPanel selectedDate={value} onSelect={onChange} />
        </div>
      )}
    </div>
  );
};

```

---

## 6. 尚未解决的问题 (Known Issues)

1. **LocalStorage 容量**：Todo 数据完全存储在 LocalStorage 中，虽然文本数据占用很小，但长期使用（数年）可能会积累大量已完成任务。建议未来增加“归档”或“导出/导入”功能。
2. **爬虫稳定性**：NowCoder 的 Cookie 依然需要定期手动维护；HDU 偶尔超时。
3. **日历本地化**：目前的 `DatePicker` 仅支持英文 (Su/Mo/Tu) 和公历，未适配其他语言环境。