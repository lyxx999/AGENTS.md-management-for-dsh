# @lyxx/dsh-agents-md

DSH 指令文件（AGENTS.md）管理：在 DSH 设置里直接创建、查看、编辑、删除
**全局**与**工作区**的 AGENTS.md 指令文件，保存后内置加载器在对应会话的
下一个 agent step 自动读取新内容，**无需重启**。

## 功能

- **全局文件**
  - 默认存储在 DSH 主目录（`$DSH_HOME/AGENTS.md`），可改为任意目录；
  - 保存时自动**镜像**到内置加载器的固定读取点 `$DSH_HOME/AGENTS.md`
    （源文件即读取点时无需镜像）；镜像失败降级提示，可重试；
  - 源文件与镜像的实时状态卡片（存在/大小）。
- **工作区项目文件**
  - 列出当前 DSH 已知的工作区（会话 cwd 去重），每区一个
    `<工作区>/AGENTS.md`，只对该工作区的会话生效；
  - 行内展开纯文本编辑器。
- **编辑器**
  - 纯文本编辑，保存时做 **mtime 过期检测**（外部改动会提示重载，防覆盖）；
  - 删除需二次确认，源文件与镜像一并删除；
  - 每次覆盖保存前自动备份 `<文件>.bak`（仅保留最近一版）。
- **渲染预算**
  - 源文件上限 1 MiB（超出拒绝保存）；
  - 64 KiB 渲染预算提示：超出时加载器会截断/省略，页内给出告警。
- **安全边界**
  - 设置页与文件操作仅对 **loopback（本机 127.0.0.1）** 浏览器开放；
    远程浏览器只读提示，不暴露任何写接口。
- 设置一级页「指令文件 (AGENTS.md)」，中文界面，适配亮/暗主题。

## 安装

- **DSH 市场**（dshmarket）：搜索 `@lyxx/dsh-agents-md` 安装；
- **命令行**：
  ```powershell
  dsh plugin add @lyxx/dsh-agents-md
  ```
- **手动**：在 desktop profile 目录 `pnpm add @lyxx/dsh-agents-md`，
  再在 `profiles/desktop/package.json` 的 `dsh.profile.bundles`
  追加 `"@lyxx/dsh-agents-md"`，重启 DSH Desktop。

安装后重启一次 DSH Desktop 生效；bundle 内的 client 内容更新支持热替换，
无需再重启。

## 使用

DSH 设置（侧栏齿轮）→ 一级页面 **「指令文件 (AGENTS.md)」**：

1. **全局文件**：全局目录留空 = 默认主目录；填写目录后「保存」生效
   （只改下一次保存的写入位置，不搬迁旧文件）。点击「创建/编辑全局
   AGENTS.md」打开编辑器。
2. **工作区项目文件**：点击任意工作区行展开编辑器，再次点击收起；
   「保存」写入该工作区根目录的 `AGENTS.md`，「删除」确认后删除
   （全局文件的镜像会一并处理）。

保存或删除后，内置加载器在对应会话的**下一个 agent step** 自动读取新内容。

## 组成

```
package.json          包清单（dsh.bundle.patch + dsh.client 声明）
cordis.patch.yml      组合补丁：插入 agents-md 行（host+client 双面）
lib/index.js          宿主：agentsMd Remote 服务（listWorkspaces/readFile/
                      saveFile/deleteFile）、agent-instructions-ui 设置命名空间、
                      白名单/字节上限/mtime 过期门/.bak 备份/镜像同步
lib/client.js         浏览器：设置一级页（settings.section 插槽），
                      全局区（目录配置+状态卡片）+ 工作区行（行内编辑器），
                      手写 typert Remote contribution（严格 codec）
```

## 卸载

1. `profiles/desktop/package.json` 移除 bundle 条目（与依赖）→ `pnpm install`；
2. 重启 DSH。
   已保存的 AGENTS.md 文件不受影响，保留在磁盘上。

## 许可

MIT（见 [LICENSE](./LICENSE)）。
