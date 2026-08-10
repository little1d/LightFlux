import { Language, TodoFilter, TodoPriority } from '../types/todo';
import type { AgentOperation, AgentRisk } from '../agent/types';

export interface Translation {
  appName: string;
  tagline: string;
  navigation: {
    search: string;
    today: string;
    completed: string;
    calendar: string;
    milestones: string;
    groups: string;
    trash: string;
  };
  search: {
    title: string;
    placeholder: string;
    clear: string;
    resultCount: (count: number) => string;
    idleTitle: string;
    idleDescription: string;
    emptyTitle: string;
    emptyDescription: string;
  };
  completed: {
    title: string;
    count: (count: number) => string;
    today: string;
    yesterday: string;
    emptyTitle: string;
    emptyDescription: string;
  };
  account: {
    localAccount: string;
    settings: string;
    signOut: string;
    signOutTitle: string;
    signOutMessage: string;
  };
  settings: {
    title: string;
    languageTitle: string;
    chinese: string;
    english: string;
    shortcutsTitle: string;
    shortcutSearch: string;
    shortcutClose: string;
    shortcutBold: string;
    shortcutItalic: string;
    shortcutHeading: string;
    shortcutList: string;
    shortcutQuote: string;
    shortcutCode: string;
    keySearch: string;
    keyClose: string;
    keyBold: string;
    keyItalic: string;
    keyHeading: string;
    keyList: string;
    keyQuote: string;
    keyCode: string;
  };
  signedOut: {
    title: string;
    description: string;
    continue: string;
    wechat: string;
    wechatError: string;
  };
  notifications: {
    orderUpdated: string;
    saveFailed: string;
  };
  overview: string;
  remaining: string;
  taskUnit: string;
  progress: (completed: number, total: number) => string;
  inputPlaceholder: string;
  addTask: string;
  filters: Record<TodoFilter, string>;
  clearCompleted: string;
  emptyTitle: Record<TodoFilter, string>;
  emptyDescription: Record<TodoFilter, string>;
  deleteTask: string;
  deleteTitle: string;
  deleteMessage: string;
  cancel: string;
  delete: string;
  clearTitle: string;
  clearMessage: string;
  clear: string;
  markComplete: string;
  markActive: string;
  calendar: {
    title: string;
    monthTitle: (year: number, month: number) => string;
    weekdays: string[];
    previousMonth: string;
    nextMonth: string;
    today: string;
    selectedDate: string;
    tasksForDate: (count: number) => string;
    empty: string;
    inputPlaceholder: string;
  };
  groups: {
    title: string;
    ungrouped: string;
    addGroup: string;
    groupPlaceholder: string;
    taskPlaceholder: string;
    addTaskTitle: string;
    cancelTask: string;
    reorderTask: string;
    addGroupAbove: string;
    addGroupBelow: string;
    renameGroup: string;
    deleteGroup: string;
    confirmAdd: string;
    confirmRename: string;
    deleteGroupTitle: string;
    deleteGroupMessage: string;
    count: (count: number) => string;
    expand: string;
    collapse: string;
  };
  editor: {
    title: string;
    titlePlaceholder: string;
    bodyPlaceholder: string;
    close: string;
    bold: string;
    italic: string;
    heading: string;
    bulletList: string;
    orderedList: string;
    quote: string;
    inlineCode: string;
    codeBlock: string;
    undo: string;
    redo: string;
    image: string;
    imageUrl: string;
    insertImage: string;
    invalidImageUrl: string;
    imageUploading: string;
    imageUploadNotConfigured: string;
    imageUploadTooLarge: string;
    imageUploadUnsupported: string;
    imageUploadFailed: string;
    emptyTitle: string;
    previewTitle: string;
    resizePane: string;
  };
  agent: {
    title: string;
    shortcut: string;
    close: string;
    empty: string;
    inputPlaceholder: string;
    send: string;
    thinking: string;
    clarification: string;
    proposal: string;
    assumptions: string;
    confirm: string;
    reject: string;
    undo: string;
    applied: string;
    undone: string;
    requestFailed: string;
    resultReportFailed: string;
    undoFailed: string;
    risk: Record<AgentRisk, string>;
    operations: Record<AgentOperation['type'], string>;
  };
  milestones: {
    title: string;
    add: string;
    addTemplate: string;
    templates: {
      anniversary: string;
      countdown: string;
      birthday: string;
      holiday: string;
      custom: string;
    };
    filters: {
      all: string;
      anniversary: string;
      countdown: string;
      birthday: string;
      holiday: string;
      custom: string;
      archived: string;
    };
    emptyTitle: string;
    emptyArchived: string;
    titlePlaceholder: string;
    calendar: string;
    repeat: string;
    solar: string;
    lunar: string;
    repeatYearly: string;
    oneTime: string;
    year: string;
    month: string;
    day: string;
    startYear: string;
    notes: string;
    notesPlaceholder: string;
    reminders: string;
    reminderDay: (days: number) => string;
    leapMonth: string;
    leapMonthFallback: string;
    leapMonthSkip: string;
    lunarDayThirtySkip: string;
    februaryFallback: string;
    february28: string;
    march1: string;
    style: string;
    save: string;
    cancel: string;
    today: string;
    tomorrow: string;
    remainingDays: (days: number) => string;
    pastDays: (days: number) => string;
    anniversaryYears: (years: number) => string;
    birthdayYears: (years: number) => string;
    lunarDate: string;
    pinned: string;
    archived: string;
    edit: string;
    pin: string;
    unpin: string;
    editStyle: string;
    editNotes: string;
    createTask: string;
    archive: string;
    unarchive: string;
    moveToTrash: string;
    restored: string;
    trashed: string;
    created: string;
    updated: string;
    relatedTaskCreated: string;
    invalidDate: string;
    notificationPermissionDenied: string;
    moreActions: string;
    todaySection: string;
    openMilestones: string;
  };
  taskMenu: {
    addSubtask: string;
    rename: string;
    priority: string;
    priorityOptions: Record<TodoPriority, string>;
    subtaskPlaceholder: string;
    createSubtask: string;
    moveToTrash: string;
    moreActions: string;
  };
  trash: {
    title: string;
    emptyTitle: string;
    restore: string;
    deleteForever: string;
    deleteForeverTitle: string;
    deleteForeverMessage: string;
    emptyTrash: string;
    emptyTrashTitle: string;
    emptyTrashMessage: string;
    preview: string;
    tasksSection: string;
    milestonesSection: string;
    deleteMilestoneForeverTitle: string;
    deleteMilestoneForeverMessage: string;
  };
}

export const translations: Record<Language, Translation> = {
  zh: {
    appName: '流光清单',
    tagline: '把今天，安排得刚刚好',
    navigation: {
      search: '搜索',
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
      resultCount: (count) => `${count} 项结果`,
      idleTitle: '查找你的任务',
      idleDescription: '输入标题、详情内容或分组名称开始搜索。',
      emptyTitle: '没有找到任务',
      emptyDescription: '换一个关键词，或检查任务是否已移至垃圾桶。',
    },
    completed: {
      title: '已完成',
      count: (count) => `${count} 项`,
      today: '今天',
      yesterday: '昨天',
      emptyTitle: '还没有已完成的任务',
      emptyDescription: '完成的任务会按日期整理在这里。',
    },
    account: {
      localAccount: '本地账户',
      settings: '设置',
      signOut: '退出登录',
      signOutTitle: '退出当前会话？',
      signOutMessage: '任务数据不会被删除，重新进入后仍可继续使用。',
    },
    settings: {
      title: '设置',
      languageTitle: '语言',
      chinese: '简体中文',
      english: 'English',
      shortcutsTitle: '键盘快捷键',
      shortcutSearch: '搜索任务',
      shortcutClose: '关闭详情或菜单',
      shortcutBold: '粗体',
      shortcutItalic: '斜体',
      shortcutHeading: '一级标题',
      shortcutList: '无序列表',
      shortcutQuote: '引用',
      shortcutCode: '代码块',
      keySearch: '⌘ / Ctrl + K',
      keyClose: 'Esc',
      keyBold: '⌘ / Ctrl + B',
      keyItalic: '⌘ / Ctrl + I',
      keyHeading: '# + 空格',
      keyList: '- + 空格',
      keyQuote: '> + 空格',
      keyCode: '``` + 空格',
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
    overview: '今日概览',
    remaining: '待完成',
    taskUnit: '项任务',
    progress: (completed, total) =>
      total === 0 ? '添加第一项任务，开始今天' : `已完成 ${completed} / ${total}`,
    inputPlaceholder: '写下要完成的事情…',
    addTask: '添加任务',
    filters: {
      all: '全部',
      active: '待办',
      completed: '已完成',
    },
    clearCompleted: '清除已完成',
    emptyTitle: {
      all: '清单还是空的',
      active: '待办任务已清空',
      completed: '还没有已完成的任务',
    },
    emptyDescription: {
      all: '从一件小事开始，让计划慢慢发生。',
      active: '做得不错，可以放松一下了。',
      completed: '完成任务后，它们会出现在这里。',
    },
    deleteTask: '删除任务',
    deleteTitle: '删除这项任务？',
    deleteMessage: '删除后无法恢复。',
    cancel: '取消',
    delete: '删除',
    clearTitle: '清除已完成任务？',
    clearMessage: '所有已完成的任务都会移至垃圾桶，可随时恢复。',
    clear: '清除',
    markComplete: '标记为已完成',
    markActive: '标记为待办',
    calendar: {
      title: '日历计划',
      monthTitle: (year, month) => `${year}年${month}月`,
      weekdays: ['日', '一', '二', '三', '四', '五', '六'],
      previousMonth: '上个月',
      nextMonth: '下个月',
      today: '今天',
      selectedDate: '当天任务',
      tasksForDate: (count) => `${count} 项任务`,
      empty: '这一天还没有安排',
      inputPlaceholder: '添加到这一天…',
    },
    groups: {
      title: '任务分组',
      ungrouped: '未分组',
      addGroup: '新建分组',
      groupPlaceholder: '分组名称',
      taskPlaceholder: '添加任务到此分组…',
      addTaskTitle: '添加主任务',
      cancelTask: '取消',
      reorderTask: '拖拽排序任务',
      addGroupAbove: '在上方添加分组',
      addGroupBelow: '在下方添加分组',
      renameGroup: '重命名',
      deleteGroup: '删除分组',
      confirmAdd: '添加',
      confirmRename: '保存',
      deleteGroupTitle: '删除这个分组？',
      deleteGroupMessage: '分组内的任务会移至“未分组”，任务不会被删除。',
      count: (count) => `${count} 项`,
      expand: '展开分组',
      collapse: '收起分组',
    },
    editor: {
      title: '任务详情',
      titlePlaceholder: '任务标题',
      bodyPlaceholder: '记录说明、代码或图片…',
      close: '返回',
      bold: '粗体',
      italic: '斜体',
      heading: '标题',
      bulletList: '无序列表',
      orderedList: '有序列表',
      quote: '引用',
      inlineCode: '行内代码',
      codeBlock: '代码块',
      undo: '撤销',
      redo: '重做',
      image: '图片',
      imageUrl: '图片 URL（https://…）',
      insertImage: '插入图片',
      invalidImageUrl: '请输入有效的 http 或 https 图片地址。',
      imageUploading: '正在上传图片…',
      imageUploadNotConfigured: '图片上传服务尚未配置。',
      imageUploadTooLarge: '图片不能超过 8 MB。',
      imageUploadUnsupported: '仅支持 PNG、JPEG、WebP、GIF 或 AVIF 图片。',
      imageUploadFailed: '图片上传失败，请稍后重试。',
      emptyTitle: '任务标题不能为空。',
      previewTitle: '任务预览',
      resizePane: '调整任务列表与详情宽度',
    },
    agent: {
      title: 'AI 任务助理',
      shortcut: '⌘ / Ctrl + J',
      close: '关闭 AI 助理',
      empty: '用自然语言新增、查找或调整任务。所有修改都会先展示预览。',
      inputPlaceholder: '例如：明天处理报销，先整理发票，优先级高…',
      send: '发送给 AI 助理',
      thinking: '正在理解并生成计划…',
      clarification: '需要确认',
      proposal: '操作预览',
      assumptions: '当前假设',
      confirm: '确认执行',
      reject: '取消',
      undo: '撤销上一次 AI 操作',
      applied: 'AI 操作已执行',
      undone: 'AI 操作已撤销',
      requestFailed: 'AI 请求失败，请稍后重试。',
      resultReportFailed: '操作已执行，但未能回传结果。',
      undoFailed: '数据已变化，无法安全撤销。',
      risk: {
        low: '低风险',
        medium: '中风险',
        high: '高风险',
      },
      operations: {
        'task.create': '新增任务',
        'task.update': '修改任务',
        'task.set_completion': '设置完成状态',
        'task.move': '移动任务',
        'task.trash': '移至垃圾桶',
        'task.restore': '恢复任务',
        'group.create': '新增分组',
        'group.update': '修改分组',
        'milestone.create': '新增节点',
        'milestone.update': '修改节点',
        'milestone.archive': '归档节点',
        'milestone.unarchive': '取消归档节点',
        'milestone.restore': '恢复节点',
        'milestone.trash': '移至垃圾桶',
      },
    },
    milestones: {
      title: '倒数纪念日',
      add: '新增节点',
      addTemplate: '选择节点类型',
      templates: {
        anniversary: '纪念日',
        countdown: '倒数日',
        birthday: '生日',
        holiday: '节日',
        custom: '自定义',
      },
      filters: {
        all: '全部',
        anniversary: '纪念日',
        countdown: '倒数日',
        birthday: '生日',
        holiday: '节日',
        custom: '自定义',
        archived: '已归档',
      },
      emptyTitle: '还没有倒数或纪念日',
      emptyArchived: '没有已归档节点',
      titlePlaceholder: '节点名称',
      calendar: '历法',
      repeat: '重复',
      solar: '公历',
      lunar: '农历',
      repeatYearly: '每年重复',
      oneTime: '仅一次',
      year: '年份',
      month: '月份',
      day: '日期',
      startYear: '起始年份（可选）',
      notes: '备注',
      notesPlaceholder: '添加简短备注…',
      reminders: '提前提醒',
      reminderDay: (days) => (days === 0 ? '当天' : `提前 ${days} 天`),
      leapMonth: '闰月',
      leapMonthFallback: '无闰月时按普通月份',
      leapMonthSkip: '无闰月时跳过该年',
      lunarDayThirtySkip: '农历小月没有三十时跳过该年',
      februaryFallback: '非闰年规则',
      february28: '按 2 月 28 日',
      march1: '按 3 月 1 日',
      style: '主题颜色',
      save: '保存节点',
      cancel: '取消',
      today: '今天',
      tomorrow: '明天',
      remainingDays: (days) => `还有 ${days} 天`,
      pastDays: (days) => `已过去 ${days} 天`,
      anniversaryYears: (years) => `第 ${years} 周年`,
      birthdayYears: (years) => `${years} 岁生日`,
      lunarDate: '农历',
      pinned: '置顶',
      archived: '已归档',
      edit: '编辑',
      pin: '置顶',
      unpin: '取消置顶',
      editStyle: '修改样式',
      editNotes: '编辑备注',
      createTask: '创建相关任务',
      archive: '归档',
      unarchive: '取消归档',
      moveToTrash: '移至垃圾桶',
      restored: '节点已恢复',
      trashed: '节点已移至垃圾桶',
      created: '节点已创建',
      updated: '节点已更新',
      relatedTaskCreated: '相关任务已创建',
      invalidDate: '请填写有效日期',
      notificationPermissionDenied: '需要允许系统通知才能启用提前提醒',
      moreActions: '更多节点操作',
      todaySection: '今天的节点',
      openMilestones: '查看倒数纪念日',
    },
    taskMenu: {
      addSubtask: '添加子任务',
      rename: '重命名',
      priority: '优先级',
      priorityOptions: {
        none: '无优先级',
        high: '高优先级',
        medium: '中优先级',
        low: '低优先级',
      },
      subtaskPlaceholder: '输入子任务名称…',
      createSubtask: '创建',
      moveToTrash: '移至垃圾桶',
      moreActions: '更多任务操作',
    },
    trash: {
      title: '垃圾桶',
      emptyTitle: '垃圾桶是空的',
      restore: '恢复',
      deleteForever: '永久删除',
      deleteForeverTitle: '永久删除任务？',
      deleteForeverMessage: '任务及其子任务将无法恢复。',
      emptyTrash: '清空垃圾桶',
      emptyTrashTitle: '清空垃圾桶？',
      emptyTrashMessage: '所有任务和节点都将被永久删除。',
      preview: '预览任务',
      tasksSection: '任务',
      milestonesSection: '倒数纪念日',
      deleteMilestoneForeverTitle: '永久删除节点？',
      deleteMilestoneForeverMessage:
        '节点将无法恢复，已有相关任务会保留但解除关联。',
    },
  },
  en: {
    appName: 'LightFlux',
    tagline: 'Make space for what matters',
    navigation: {
      search: 'Search',
      today: 'Today',
      completed: 'Completed',
      calendar: 'Calendar',
      milestones: 'Milestones',
      groups: 'Groups',
      trash: 'Trash',
    },
    search: {
      title: 'Search tasks',
      placeholder: 'Type a keyword…',
      clear: 'Clear search',
      resultCount: (count) => `${count} ${count === 1 ? 'result' : 'results'}`,
      idleTitle: 'Find your tasks',
      idleDescription: 'Search by title, task details, or group name.',
      emptyTitle: 'No tasks found',
      emptyDescription: 'Try another keyword or check whether the task is in trash.',
    },
    completed: {
      title: 'Completed',
      count: (count) => `${count} ${count === 1 ? 'task' : 'tasks'}`,
      today: 'Today',
      yesterday: 'Yesterday',
      emptyTitle: 'No completed tasks yet',
      emptyDescription: 'Completed tasks will be organized here by date.',
    },
    account: {
      localAccount: 'Local account',
      settings: 'Settings',
      signOut: 'Sign out',
      signOutTitle: 'Sign out of this session?',
      signOutMessage: 'Your tasks will remain on this device and will be available when you return.',
    },
    settings: {
      title: 'Settings',
      languageTitle: 'Language',
      chinese: '简体中文',
      english: 'English',
      shortcutsTitle: 'Keyboard shortcuts',
      shortcutSearch: 'Search tasks',
      shortcutClose: 'Close details or menus',
      shortcutBold: 'Bold',
      shortcutItalic: 'Italic',
      shortcutHeading: 'Heading 1',
      shortcutList: 'Bullet list',
      shortcutQuote: 'Quote',
      shortcutCode: 'Code block',
      keySearch: 'Cmd / Ctrl + K',
      keyClose: 'Esc',
      keyBold: 'Cmd / Ctrl + B',
      keyItalic: 'Cmd / Ctrl + I',
      keyHeading: '# + Space',
      keyList: '- + Space',
      keyQuote: '> + Space',
      keyCode: '``` + Space',
    },
    signedOut: {
      title: 'You are signed out',
      description: 'Your local tasks are still safely stored on this device.',
      continue: 'Return to LightFlux',
      wechat: 'Continue with WeChat',
      wechatError: 'Unable to start WeChat login. Check the auth service configuration.',
    },
    notifications: {
      orderUpdated: 'Order updated.',
      saveFailed: 'Save failed. Local data is preserved; try again later.',
    },
    overview: 'TODAY AT A GLANCE',
    remaining: 'Remaining',
    taskUnit: 'tasks',
    progress: (completed, total) =>
      total === 0 ? 'Add your first task to get started' : `${completed} of ${total} completed`,
    inputPlaceholder: 'What needs to be done?',
    addTask: 'Add task',
    filters: {
      all: 'All',
      active: 'Active',
      completed: 'Completed',
    },
    clearCompleted: 'Clear completed',
    emptyTitle: {
      all: 'Your list is clear',
      active: 'Nothing left to do',
      completed: 'No completed tasks yet',
    },
    emptyDescription: {
      all: 'Start small. Add one thing you want to finish.',
      active: 'Everything is done. Take a well-earned break.',
      completed: 'Finished tasks will show up here.',
    },
    deleteTask: 'Delete task',
    deleteTitle: 'Delete this task?',
    deleteMessage: 'This action cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    clearTitle: 'Clear completed tasks?',
    clearMessage: 'All completed tasks will move to trash and can be restored.',
    clear: 'Clear',
    markComplete: 'Mark as completed',
    markActive: 'Mark as active',
    calendar: {
      title: 'Calendar',
      monthTitle: (year, month) =>
        new Date(year, month - 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      today: 'Today',
      selectedDate: 'Tasks for this day',
      tasksForDate: (count) => `${count} ${count === 1 ? 'task' : 'tasks'}`,
      empty: 'Nothing scheduled for this day',
      inputPlaceholder: 'Add to this day…',
    },
    groups: {
      title: 'Task groups',
      ungrouped: 'Ungrouped',
      addGroup: 'New group',
      groupPlaceholder: 'Group name',
      taskPlaceholder: 'Add a task to this group…',
      addTaskTitle: 'Add main task',
      cancelTask: 'Cancel',
      reorderTask: 'Drag to reorder task',
      addGroupAbove: 'Add group above',
      addGroupBelow: 'Add group below',
      renameGroup: 'Rename',
      deleteGroup: 'Delete group',
      confirmAdd: 'Add',
      confirmRename: 'Save',
      deleteGroupTitle: 'Delete this group?',
      deleteGroupMessage:
        'Tasks in this group will move to Ungrouped and will not be deleted.',
      count: (count) => `${count} ${count === 1 ? 'task' : 'tasks'}`,
      expand: 'Expand group',
      collapse: 'Collapse group',
    },
    editor: {
      title: 'Task details',
      titlePlaceholder: 'Task title',
      bodyPlaceholder: 'Add notes, code, or images…',
      close: 'Back',
      bold: 'Bold',
      italic: 'Italic',
      heading: 'Heading',
      bulletList: 'Bullet list',
      orderedList: 'Ordered list',
      quote: 'Quote',
      inlineCode: 'Inline code',
      codeBlock: 'Code block',
      undo: 'Undo',
      redo: 'Redo',
      image: 'Image',
      imageUrl: 'Image URL (https://…)',
      insertImage: 'Insert image',
      invalidImageUrl: 'Enter a valid http or https image URL.',
      imageUploading: 'Uploading image…',
      imageUploadNotConfigured: 'Image upload is not configured.',
      imageUploadTooLarge: 'Images must be 8 MB or smaller.',
      imageUploadUnsupported:
        'Use a PNG, JPEG, WebP, GIF, or AVIF image.',
      imageUploadFailed: 'Unable to upload the image. Try again.',
      emptyTitle: 'A task title is required.',
      previewTitle: 'Task preview',
      resizePane: 'Resize task list and details',
    },
    agent: {
      title: 'AI task assistant',
      shortcut: 'Cmd / Ctrl + J',
      close: 'Close AI assistant',
      empty:
        'Create, find, or adjust tasks with natural language. Every change is previewed first.',
      inputPlaceholder:
        'For example: Handle expenses tomorrow, organize receipts first, high priority…',
      send: 'Send to AI assistant',
      thinking: 'Understanding and preparing a plan…',
      clarification: 'Clarification',
      proposal: 'Operation preview',
      assumptions: 'Assumptions',
      confirm: 'Confirm',
      reject: 'Cancel',
      undo: 'Undo last AI operation',
      applied: 'AI operations applied',
      undone: 'AI operations undone',
      requestFailed: 'Unable to reach the AI assistant. Try again.',
      resultReportFailed: 'Changes were applied, but the result was not reported.',
      undoFailed: 'Task data changed, so this operation cannot be safely undone.',
      risk: {
        low: 'Low risk',
        medium: 'Medium risk',
        high: 'High risk',
      },
      operations: {
        'task.create': 'Create task',
        'task.update': 'Update task',
        'task.set_completion': 'Set completion',
        'task.move': 'Move task',
        'task.trash': 'Move to trash',
        'task.restore': 'Restore task',
        'group.create': 'Create group',
        'group.update': 'Update group',
        'milestone.create': 'Create milestone',
        'milestone.update': 'Update milestone',
        'milestone.archive': 'Archive milestone',
        'milestone.unarchive': 'Unarchive milestone',
        'milestone.restore': 'Restore milestone',
        'milestone.trash': 'Move milestone to trash',
      },
    },
    milestones: {
      title: 'Milestones',
      add: 'Add milestone',
      addTemplate: 'Choose milestone type',
      templates: {
        anniversary: 'Anniversary',
        countdown: 'Countdown',
        birthday: 'Birthday',
        holiday: 'Holiday',
        custom: 'Custom',
      },
      filters: {
        all: 'All',
        anniversary: 'Anniversary',
        countdown: 'Countdown',
        birthday: 'Birthday',
        holiday: 'Holiday',
        custom: 'Custom',
        archived: 'Archived',
      },
      emptyTitle: 'No milestones yet',
      emptyArchived: 'No archived milestones',
      titlePlaceholder: 'Milestone name',
      calendar: 'Calendar',
      repeat: 'Repeat',
      solar: 'Solar',
      lunar: 'Lunar',
      repeatYearly: 'Repeat yearly',
      oneTime: 'One time',
      year: 'Year',
      month: 'Month',
      day: 'Day',
      startYear: 'Start year (optional)',
      notes: 'Notes',
      notesPlaceholder: 'Add a short note…',
      reminders: 'Reminders',
      reminderDay: (days) => (days === 0 ? 'On the day' : `${days} days before`),
      leapMonth: 'Leap month',
      leapMonthFallback: 'Use regular month when unavailable',
      leapMonthSkip: 'Skip years without this leap month',
      lunarDayThirtySkip: 'Skip lunar years where this month has no day 30',
      februaryFallback: 'Non-leap-year rule',
      february28: 'Use February 28',
      march1: 'Use March 1',
      style: 'Theme color',
      save: 'Save milestone',
      cancel: 'Cancel',
      today: 'Today',
      tomorrow: 'Tomorrow',
      remainingDays: (days) => `${days} days left`,
      pastDays: (days) => `${days} days ago`,
      anniversaryYears: (years) => `${years} year anniversary`,
      birthdayYears: (years) => `Age ${years}`,
      lunarDate: 'Lunar',
      pinned: 'Pinned',
      archived: 'Archived',
      edit: 'Edit',
      pin: 'Pin',
      unpin: 'Unpin',
      editStyle: 'Change style',
      editNotes: 'Edit notes',
      createTask: 'Create related task',
      archive: 'Archive',
      unarchive: 'Unarchive',
      moveToTrash: 'Move to trash',
      restored: 'Milestone restored',
      trashed: 'Milestone moved to trash',
      created: 'Milestone created',
      updated: 'Milestone updated',
      relatedTaskCreated: 'Related task created',
      invalidDate: 'Enter a valid date',
      notificationPermissionDenied:
        'Allow system notifications to enable reminders',
      moreActions: 'More milestone actions',
      todaySection: "Today's milestones",
      openMilestones: 'Open milestones',
    },
    taskMenu: {
      addSubtask: 'Add subtask',
      rename: 'Rename',
      priority: 'Priority',
      priorityOptions: {
        none: 'No priority',
        high: 'High priority',
        medium: 'Medium priority',
        low: 'Low priority',
      },
      subtaskPlaceholder: 'Subtask name…',
      createSubtask: 'Create',
      moveToTrash: 'Move to trash',
      moreActions: 'More task actions',
    },
    trash: {
      title: 'Trash',
      emptyTitle: 'Trash is empty',
      restore: 'Restore',
      deleteForever: 'Delete forever',
      deleteForeverTitle: 'Delete task forever?',
      deleteForeverMessage: 'The task and its subtasks cannot be restored.',
      emptyTrash: 'Empty trash',
      emptyTrashTitle: 'Empty trash?',
      emptyTrashMessage: 'All tasks and milestones will be permanently deleted.',
      preview: 'Preview task',
      tasksSection: 'Tasks',
      milestonesSection: 'Milestones',
      deleteMilestoneForeverTitle: 'Delete milestone forever?',
      deleteMilestoneForeverMessage:
        'The milestone cannot be restored. Related tasks will remain but be unlinked.',
    },
  },
};
