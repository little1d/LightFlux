---
layout: home

hero:
  name: LightFlux
  text: 流光
  tagline: 本地优先的桌面任务工具。不需要账号、网络或自建服务器，双击打开就能用。
  image:
    src: /brand-mark.png
    alt: LightFlux
  actions:
    - theme: brand
      text: 功能一览
      link: /screenshots
    - theme: alt
      text: 下载安装包
      link: https://github.com/little1d/LightFlux/releases
    - theme: alt
      text: 在 GitHub 上看源码
      link: https://github.com/little1d/LightFlux

features:
  - icon: ✅
    title: 任务与子任务
    details: 今日列表、多 Project、日历视图、完成记录与回收站。任务可以拆成子任务，拖动排序。
  - icon: ⏳
    title: Milestone
    details: 公历、农历、纪念日与生日，支持提醒与置顶。今天到期的节点会直接出现在今日列表顶部。
  - icon: 📝
    title: 富文本详情
    details: 每个任务都有独立正文，可以嵌入本地图片，跟着备份一起走，不依赖任何图床。
  - icon: 📊
    title: 基于事实的统计
    details: 所有数字都来自 TaskEvent 历史记录，不做推测性估算——没有记录就不显示。
  - icon: 💾
    title: 备份与恢复
    details: 自动保留最近 30 次变更前的本地快照，也可以手动导出 JSON 在另一台设备上恢复。
  - icon: 🤖
    title: 小光 AI 与 CLI
    details: 多会话对话可以查询和修改任务，写操作先预览、确认后执行、结果可撤销；CLI 与 Agent 走同一套本机协议。
---

## 数据在你手里

LightFlux 把状态保存在本机：桌面端是应用数据目录里的 `local-state-v12.json`，
浏览器预览是 IndexedDB。没有账号体系，没有云同步，也没有内置的托管 AI——
对话模型由你自己配置，密钥存在系统凭据库里。

> 只存在云端、尚未同步到本机的数据**不会**自动下载。旧服务器的数据没有被删除，
> 停服前必须另行导出、核对任务及附件。

## 平台

macOS 为首选平台（Apple Silicon 与 Intel 都有 `.dmg`），Windows 次之，
Linux 为 best effort。安装包发布在
[GitHub Releases](https://github.com/little1d/LightFlux/releases)。

以下**不属于**维护范围：iOS、Android、微信、账号体系、云同步、内置云 AI。
