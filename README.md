# 提示词 · 个人提示词库

> 把自己的常用提示词放进浏览器侧边栏：分类、置顶、搜索、手动排序、一键复制。
> A minimal personal prompt library living in the browser side panel.

一个面向**个人使用**的提示词管理扩展（Chrome / Edge，Manifest V3）。数据全部保存在本机浏览器中，不联网、不上传、不需要账号。基于开源项目 Qiaomu-QuickPrompt 精简改造：移除了内置公共提示词市场、社区内容、简写展开等模块，只保留私人提示词库需要的能力，并补充了分类管理与手动排序。

## 特色

- **纯本地、零上传**：所有提示词只存在 `chrome.storage.local` 里，整个扩展没有任何网络请求、账号体系和统计埋点，代码可以逐行审阅。
- **零依赖、零构建**：纯原生 HTML / CSS / JavaScript，没有 node_modules、没有打包步骤，下载仓库就能直接加载使用。
- **侧边栏常驻**：边浏览网页边查提示词、一键复制，快捷键 `Ctrl+Shift+P` 随叫随到。
- **按私人库设计**：分类管理、置顶、手动拖拽排序、全文搜索，围绕「自己的一百条提示词怎么快速找到」做减法，不做公共市场。
- **可备份可迁移**：JSON 一键导出 / 导入，换电脑、重装浏览器不丢数据。

## 功能

- 侧边栏布局：顶部工具栏（搜索 / 新建 / 设置）、分类栏、提示词列表
- 分类管理：新建、重命名、删除（删除时该分类下的提示词自动移入「未分类」，不会丢失）、显示条数；管理界面内可拖动排序
- 提示词：标题、正文、分类、置顶、创建时间、最近修改时间
- 置顶的提示词始终排在最前；卡片右下角把手可上下拖动，手动调整顺序
- 按标题和正文全文搜索
- 一键复制完整正文，复制后有反馈
- 新建 / 编辑用对话框完成：窗口可上下拖动，关闭前有未保存修改保护
- 删除前确认
- JSON 导入 / 导出备份：导入前校验格式、显示合并说明，重复 ID 按提示合并
- 数据保存在本地 `chrome.storage.local`，并从旧版扩展自动迁移

## 安装（Chrome / Edge）

1. 下载本仓库：点右上角 `Code → Download ZIP` 解压，或 `git clone` 到任意目录。
2. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）。
3. 开启右上角「开发者模式」。
4. 点击左上角「加载解压缩的扩展」，选择解压后的文件夹（含 `manifest.json` 的那层目录）。
5. 更新代码后回到扩展管理页点击「重新加载」即可，本地数据不会丢失。

点击工具栏中的扩展图标即可打开侧边栏，快捷键 `Ctrl+Shift+P`。

## 数据存储

- 提示词、分类、设置保存在浏览器为扩展分配的本地存储（`chrome.storage.local`）中；卸载扩展或点击「设置 → 清空全部提示词」才会丢失。
- 存储键名为 `personalPromptsItems` / `personalPromptsSettings` / `personalPromptsCategories`。
- 从原版 Qiaomu-QuickPrompt 更新而来的用户：首次启动时会自动把旧键 `qiaomuQuickPrompt*` 中的数据迁移到新键，旧键保留不删除。
- 原版预置的公共提示词（如有）可在「设置 → 清理内置公共提示词」中一键确认移除。
- 建议定期在「设置 → 导出备份」生成 JSON 文件；换电脑或重装浏览器后可用「导入备份」恢复。

## 项目结构

纯原生 HTML / CSS / JavaScript，无构建步骤、无依赖，仓库根目录即可作为未打包扩展加载。

```
manifest.json      扩展清单（MV3）
background.js      Service Worker：点击图标打开侧边栏
storage.js         本地存储层（串行写入队列、旧键迁移、导入合并）
sidepanel.html     侧边栏页面结构
sidepanel.js       界面逻辑
styles.css         莫兰迪绿玻璃风格样式
tools/make-icon.ps1  重新生成图标的 PowerShell 脚本
```

在浏览器中直接打开 `sidepanel.html` 可以预览界面（此时数据退化为 localStorage，仅用于开发调试）。

## 归属与许可

- 本项目代码基于 Qiaomu-QuickPrompt（作者 joeseesun，MIT License）精简改造，遵循 MIT License，见 [LICENSE](LICENSE)。
- 原版内置的第三方提示词集（Yao Open Prompts / CC BY 4.0、awesome-gpt-image-2 / MIT、ai-boost awesome-prompts / GPL-3.0）已在本项目中移除，特此保留来源说明与致谢。
