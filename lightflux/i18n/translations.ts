import { Language, TodoFilter, TodoPriority } from '../types/todo';

export interface Translation {
  appName: string;
  tagline: string;
  navigation: {
    search: string;
    today: string;
    completed: string;
    calendar: string;
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
    emptyTitle: string;
    previewTitle: string;
    resizePane: string;
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
      emptyTitle: '任务标题不能为空。',
      previewTitle: '任务预览',
      resizePane: '调整任务列表与详情宽度',
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
      emptyTrashMessage: '所有任务都将被永久删除。',
      preview: '预览任务',
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
      emptyTitle: 'A task title is required.',
      previewTitle: 'Task preview',
      resizePane: 'Resize task list and details',
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
      emptyTrashMessage: 'All tasks will be permanently deleted.',
      preview: 'Preview task',
    },
  },
};
