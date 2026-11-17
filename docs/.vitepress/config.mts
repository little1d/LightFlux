import { defineConfig } from 'vitepress';

// The docs site is a thin layer over the markdown already in `docs/`. It builds
// to a static bundle that the Pages workflow publishes; nothing here is needed
// to run the desktop app.
// GitHub Pages serves a project site from /<repo>/, so the workflow passes the
// base explicitly. Local `docs:dev` and `docs:build` fall back to the root.
const base = process.env.DOCS_BASE ?? '/';

export default defineConfig({
  base,
  title: 'LightFlux',
  description: '本地优先的桌面任务工具 · A local-first desktop task manager',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#7265E8' }],
  ],
  themeConfig: {
    logo: '/brand-mark.png',
    nav: [
      { text: '功能一览', link: '/screenshots' },
      { text: '本地架构', link: '/local-desktop' },
      { text: '发布流程', link: '/desktop-release' },
      { text: '更新日志', link: 'https://github.com/little1d/LightFlux/blob/main/CHANGELOG.md' },
    ],
    sidebar: [
      {
        text: '开始了解',
        items: [
          { text: '功能一览', link: '/screenshots' },
          { text: '本地架构', link: '/local-desktop' },
        ],
      },
      {
        text: '版本与发布',
        items: [
          { text: '1.1.3 小光 AI 对话', link: '/releases/ai-chat' },
          { text: '桌面发布流程', link: '/desktop-release' },
        ],
      },
      {
        text: '归档',
        items: [
          { text: '归档说明', link: '/archive/README' },
          { text: 'PostgreSQL 后端', link: '/archive/backend-postgresql' },
          { text: '落地页调研', link: '/archive/landing-page-research' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/little1d/LightFlux' },
    ],
    editLink: {
      pattern: 'https://github.com/little1d/LightFlux/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },
    footer: {
      message: 'MIT License · 数据留在你自己的机器上',
      copyright: 'LightFlux 流光',
    },
    docFooter: { prev: '上一篇', next: '下一篇' },
    outline: { label: '本页目录' },
    lastUpdated: { text: '最后更新' },
    returnToTopLabel: '回到顶部',
    darkModeSwitchLabel: '主题',
    sidebarMenuLabel: '目录',
  },
});
