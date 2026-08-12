import type { Translation } from '../../types';
type CommonContent = Pick<Translation, 'appName' | 'tagline' | 'navigation' | 'search' | 'account' | 'signedOut' | 'notifications' | 'cancel' | 'delete' | 'clear'>;
export const common: CommonContent = {
  appName: '流光清单',
  tagline: '把今天，安排得刚刚好',
  navigation: {
    today: '今天',
    completed: '已完成',
    calendar: '日历',
    milestones: '倒数纪念日',
    groups: '分组',
    trash: '垃圾桶',
  },
  search: {
    title: '搜索任务',
    placeholder: '输入关键词…',
    clear: '清除搜索',
    close: '关闭搜索',
    tasks: '任务',
    shortcut: 'Esc 关闭 · Enter 打开任务',
    resultCount: (count) => `${count} 项结果`,
    idleTitle: '查找你的任务',
    idleDescription: '输入标题、详情内容或分组名称开始搜索。',
    emptyTitle: '没有找到任务',
    emptyDescription: '换一个关键词，或检查任务是否已移至垃圾桶。',
  },
  account: {
    localAccount: '本地账户',
    settings: '设置',
    signOut: '退出登录',
    signOutTitle: '退出当前会话？',
    signOutMessage: '任务数据不会被删除，重新进入后仍可继续使用。',
  },
  signedOut: {
    title: '已退出登录',
    description: '本地任务仍安全保存在此设备上。',
    continue: '重新进入 LightFlux',
    wechat: '微信登录 / 注册',
    wechatError: '暂时无法启动微信登录，请检查认证服务配置。',
  },
  notifications: {
    orderUpdated: '顺序已更新',
    saveFailed: '保存失败，本地数据仍会保留，请稍后重试',
  },
  cancel: '取消',
  delete: '删除',
  clear: '清除',
};
