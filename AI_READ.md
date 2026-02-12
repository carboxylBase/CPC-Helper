# CPC Helper Project Documentation

## 1. Project Overview

**CPC Helper** (Competitive Programming Companion Helper) 是一款专为算法竞赛选手设计的跨平台桌面应用程序。它旨在提供一站式的刷题管理体验，集成了各大主流 OJ 平台（Codeforces, LeetCode, AtCoder, NowCoder, Luogu 等）的数据统计、GTD (Getting Things Done) 刷题计划管理以及可视化的战绩仪表盘。

* **核心架构**: Tauri v2 (Rust) + React (TypeScript/Vite)
* **UI 风格**: 磨砂玻璃 (Glassmorphism) + 现代化深色主题
* **当前版本**: v1.2.6
* **主要功能**:
* 多平台战绩查询与聚合展示 (Pie Chart).
* Problem Pool (刷题池) 与每日计划管理.
* OTA 自动更新 (基于 GitHub Releases).



---

## 2. Directory Structure (目录结构)

```text
CPC-Helper/
├── .github/
│   └── workflows/
│       ├── release.yml         # 核心 CI/CD 脚本，负责构建、签名、生成 latest.json
│       └── ...
├── src/                        # 前端源码 (React)
│   ├── assets/
│   ├── components/
│   │   ├── DashboardGrid.tsx   # 仪表盘主组件 (包含图表懒加载逻辑)
│   │   ├── PlatformCard.tsx    # 单个 OJ 平台的卡片组件
│   │   └── ...
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                  # 后端源码 (Rust)
│   ├── src/
│   │   ├── lib.rs
│   │   ├── main.rs
│   │   └── ...                 # 包含 fetch_user_stats 等指令实现
│   ├── tauri.conf.json         # Tauri 核心配置文件 (版本号、权限、更新公钥)
│   ├── tauri.key               # (本地开发用) 私钥文件，用于签名
│   └── tauri.key.pub           # 公钥文件
├── package.json                # 前端依赖与版本定义
└── README.md

```

---

## 3. Core Design & Implementation (核心设计与实现)

### 3.1 自动更新系统 (OTA)

* **机制**: 使用 Tauri 内置 Updater 插件。
* **数据源**: GitHub Releases。
* **流程**:
1. GitHub Actions (`release.yml`) 编译多平台二进制文件 (`.exe`, `.AppImage`, `.app.tar.gz`)。
2. 使用 `TAURI_SIGNING_PRIVATE_KEY` 对产物进行签名，生成 `.sig` 文件。
3. `generate-updater-json` 脚本扫描 Release Assets，读取签名，生成符合 Tauri v2 标准的 `latest.json`。
4. 客户端通过 `tauri.conf.json` 中的 `pubkey` 验证签名并下载更新。



### 3.2 前端图表渲染

* **库**: Recharts。
* **优化**: 由于 Tab 切换会导致隐藏 DOM 宽度为 0，进而引发 Recharts 报错。项目中实现了 `LazyChartWrapper` 组件，使用 `ResizeObserver` 监听容器尺寸，仅在容器可见且有尺寸时渲染图表。

### 3.3 构建与发布规范

* **Tag 命名**: 统一使用 `vX.X.X` 格式（如 `v1.2.6`）。移除了旧版混乱的 `app-` 前缀。
* **密钥管理**: 私钥存储于 GitHub Secrets，公钥硬编码于 `tauri.conf.json`。

---

## 4. Maintenance Guide (维护指南)

### 4.1 发布新版本流程 (Standard Release Procedure)

这是目前最关键的维护操作，请严格遵循：

1. **修改版本号**:
* `package.json`: `"version": "1.2.7"`
* `src-tauri/tauri.conf.json`: `"version": "1.2.7"`


2. **提交代码**:
```bash
git add .
git commit -m "release: v1.2.7"
git push

```


3. **打标签并推送** (触发 CI 构建):
* **注意**: 标签必须是 `v` 开头，**不要**加 `app-`。


```bash
git tag v1.2.7
git push origin v1.2.7

```


4. **验证**:
* 等待 GitHub Actions 完成。
* 检查 Release Assets 中是否包含 `.sig` 文件和 `latest.json`。



### 4.2 GitHub Secrets 配置

如果 CI 构建失败提示签名错误，请检查 GitHub 仓库的 Secrets：

* `TAURI_SIGNING_PRIVATE_KEY`: 必须包含 `-----BEGIN PRIVATE KEY-----` 头尾的完整 PEM 内容。
* `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: 如果私钥生成时无密码，此项**必须删除**或留空。

### 4.3 常用开发指令

* 启动开发环境: `npm run tauri dev`
* 本地构建测试: `npm run tauri build`

---

## 5. Key Code Snippets (关键代码备份)

### 5.1 `release.yml` - 生成 latest.json 的逻辑

这是确保自动更新可用的核心脚本，位于 `generate-updater-json` 任务中：

```javascript
// 获取版本与Tag (vX.X.X)
const tagName = `v${version}`; 

// 平台匹配逻辑 (尤其是 Windows 的双 Key 匹配)
function getPlatformKeys(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.app.tar.gz')) return lower.includes('aarch64') ? ['darwin-aarch64'] : ['darwin-x86_64'];
  if (lower.endsWith('.appimage.tar.gz') || lower.endsWith('.appimage')) return ['linux-x86_64'];
  // 关键：同时匹配 exe 和 nsis.zip
  if (lower.endsWith('.msi.zip') || lower.endsWith('.exe') || lower.endsWith('.nsis.zip')) {
    return ['windows-x86_64', 'windows-x86_64-nsis'];
  }
  return [];
}

// 遍历并读取 .sig 内容写入 json ...

```

### 5.2 `DashboardGrid.tsx` - 图表懒加载修复

解决 Recharts `width(0)` 报错的封装组件：

```tsx
const LazyChartWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const domRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!domRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setShouldRender(true);
          observer.disconnect();
        }
      }
    });
    observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={domRef} className={className} style={{ width: '100%', height: '100%' }}>{shouldRender ? children : null}</div>;
};

```

### 5.3 `tauri.conf.json` - Updater 配置

```json
"plugins": {
  "updater": {
    "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDlCN0QxQjkxM0Q1QUQxMDUKUldRRjBWbzlrUnQ5bTVlcmxnRVFSR3BJNU5va2tnZ3JxMlRoa2JOby9YMk1vQVhDRStvaThSNG4K",
    "endpoints": [
      "https://github.com/carboxylBase/CPC-Helper/releases/latest/download/latest.json"
    ]
  }
}

```

---

## 6. 尚未解决的问题 / 待办事项 (Known Issues & TODO)

1. **Cookie 持久化与过期处理**:
* 目前日志显示 Cookie 已读取，但如果用户修改了 OJ 密码或 Session 过期，后端尚无自动检测或重新登录的引导机制。


2. **网络请求与代理**:
* 由于 OJ 平台（如 Codeforces）可能有反爬虫限制或网络墙，国内用户直接连接可能不稳定。未来可能需要考虑内置代理配置功能。


3. **Release 草稿自动发布**:
* 目前 Action 跑完后，Release 可能是 Draft (草稿) 状态，需要确认是否需要人工点击 Publish，或者在脚本中将 `draft: true` 改为 `false`。


4. **平台兼容性**:
* 目前主要针对 Windows 进行了大量测试。macOS (特别是 ARM64/M1) 和 Linux 的自动更新虽然理论上已配置，但建议进行真机验证。