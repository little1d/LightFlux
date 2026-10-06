import { Language } from '../types/todo';

const zh = {
  title: '小光', newChat: '新会话', untitled: '新会话', history: '会话记录',
  noHistory: '还没有会话', noHistoryHint: '从一个想法开始，随时回来继续。',
  today: '今天', earlier: '更早',
  welcome: '我是小光，陪你理清思绪', welcomeHint: '安排任务、拆解问题，或只是聊聊你的灵感。',
  suggestions: ['帮我创建一个今天的任务', '帮我把一个目标拆成可执行的步骤', '一起梳理今天的工作思路'],
  placeholder: '写下你的想法…', send: '发送消息', stop: '停止生成', retry: '重新生成',
  thinking: '正在思考…', stopped: '已停止生成', interrupted: '回复中断，可重新生成',
  rename: '重命名', delete: '删除会话', deleteTitle: '删除这个会话？',
  deleteHint: '这个会话及其中的消息将从本机移除。', cancel: '取消', save: '保存',
  menu: '会话操作', showHistory: '展开会话列表', hideHistory: '收起会话列表', close: '关闭',
  you: '你', assistant: '小光', copy: '复制回复', copied: '已复制',
  shortcut: 'Enter 发送 · Shift + Enter 换行',
  scope: '仅发送当前会话内容 · 最近 20 轮',
  setupTitle: '连接模型，开始对话', setupHint: '添加 API Key，使用你自己的模型服务。',
  openSettings: '配置模型', settings: '模型配置', backToChat: '返回对话',
  provider: '服务商', custom: '自定义', baseUrl: '服务地址', model: '模型名称', apiKey: 'API Key',
  urlMode: '地址类型', baseUrlMode: '基础地址', endpointMode: '完整接口地址',
  keySaved: '已保存密钥', keyMissing: '未配置密钥', keyPlaceholder: '输入你的 API Key',
  keyReplacePlaceholder: '输入新 Key 以替换已保存的密钥',
  showKey: '显示密钥', hideKey: '隐藏密钥', saveSettings: '保存配置', saving: '正在保存…',
  removeKey: '移除密钥', removeKeyTitle: '移除 API Key？',
  removeKeyHint: '会话仍会保留。再次发送消息前，需要重新添加密钥。',
  test: '测试连接', testing: '正在测试…', connected: '连接成功', saved: '配置已保存',
  localHistory: '会话保存在本机', loading: '正在读取会话…',
  historyError: '无法安全读取会话记录', historyErrorHint: '原始数据已保留，暂时停止写入。请检查本地 chat-v1.json 或恢复其备份。',
  saveError: '会话尚未保存，内容仍在当前窗口中。', retrySave: '重试保存',
  generatingElsewhere: '另一会话正在回复，完成或停止后可发送。',
  responseError: '回复未完成', draftLimit: '消息最多 12,000 字符',
};

type ChatContent = { [K in keyof typeof zh]: (typeof zh)[K] extends string[] ? string[] : string };
const en: ChatContent = {
  title: 'Xiaoguang', newChat: 'New chat', untitled: 'New chat', history: 'Conversations',
  noHistory: 'No conversations yet', noHistoryHint: 'Start with a thought. Come back anytime.',
  today: 'Today', earlier: 'Earlier',
  welcome: 'Hi, I’m Xiaoguang. Let’s think it through.', welcomeHint: 'Make a plan, untangle a problem, or follow a spark of inspiration.',
  suggestions: ['Create a task for today', 'Break a goal into actionable steps', 'Help me think through my workday'],
  placeholder: 'What’s on your mind?', send: 'Send message', stop: 'Stop generating', retry: 'Regenerate',
  thinking: 'Thinking…', stopped: 'Generation stopped', interrupted: 'Reply interrupted. You can retry.',
  rename: 'Rename', delete: 'Delete conversation', deleteTitle: 'Delete this conversation?',
  deleteHint: 'This conversation and its messages will be removed from this device.', cancel: 'Cancel', save: 'Save',
  menu: 'Conversation actions', showHistory: 'Show conversations', hideHistory: 'Hide conversations', close: 'Close',
  you: 'You', assistant: 'Xiaoguang', copy: 'Copy reply', copied: 'Copied',
  shortcut: 'Enter to send · Shift + Enter for a new line',
  scope: 'Only this conversation is sent · Latest 20 turns',
  setupTitle: 'Connect a model to get started', setupHint: 'Add your API key to use your model provider.',
  openSettings: 'Set up model', settings: 'Model configuration', backToChat: 'Back to chat',
  provider: 'Provider', custom: 'Custom', baseUrl: 'Base URL', model: 'Model name', apiKey: 'API Key',
  urlMode: 'URL type', baseUrlMode: 'Base URL', endpointMode: 'Full endpoint URL',
  keySaved: 'Key saved', keyMissing: 'No key configured', keyPlaceholder: 'Enter your API key',
  keyReplacePlaceholder: 'Enter a new key to replace the saved one',
  showKey: 'Show key', hideKey: 'Hide key', saveSettings: 'Save configuration', saving: 'Saving…',
  removeKey: 'Remove key', removeKeyTitle: 'Remove API key?',
  removeKeyHint: 'Your conversations will remain. Add a key again before sending messages.',
  test: 'Test connection', testing: 'Testing…', connected: 'Connection successful', saved: 'Configuration saved',
  localHistory: 'Conversations stay on this device', loading: 'Loading conversations…',
  historyError: 'Conversation history could not be loaded safely',
  historyErrorHint: 'Original data is preserved and writes are paused. Check the local chat-v1.json file or restore its backup.',
  saveError: 'History is not saved yet. Your messages are still in this window.', retrySave: 'Retry saving',
  generatingElsewhere: 'Another conversation is generating. Wait for it to finish or stop it.',
  responseError: 'Reply incomplete', draftLimit: 'Messages are limited to 12,000 characters',
};

export const chatContent: Record<Language, ChatContent> = { zh, en };

const zhTools = {
  preview: '任务操作', pending: '等待确认', done: '已完成', cancelled: '已取消', undone: '已撤销',
  confirm: '确认执行', share: '允许发送', cancel: '取消', retry: '继续完成', undo: '撤销', working: '处理中…',
  confirmDelete: '永久删除', deleteWarning: '此任务及其子任务将直接删除，不会进入回收站。',
  shareHint: '这些本地结果仅在你允许后发送给模型。',
  recover: '操作可能已提交。继续完成将安全地核对结果，不会重复创建。',
  empty: '没有匹配的结果。', more: '共 {n} 条，仅显示前几条。',
  none: '无优先级', low: '低优先级', medium: '中优先级', high: '高优先级',
  active: '未完成', completed: '已完成', trash: '回收站',
  actions: {
    search_tasks: '查询任务', list_projects: '查询项目', 'task.create': '创建任务',
    'task.update': '修改任务', 'task.complete': '完成任务', 'task.reopen': '重新打开任务',
    'task.trash': '移入回收站', 'task.restore': '恢复任务', 'task.delete': '永久删除任务',
  } as Record<string, string>,
};
type ChatToolContent = typeof zhTools;
const enTools: ChatToolContent = {
  preview: 'Task action', pending: 'Awaiting approval', done: 'Completed', cancelled: 'Cancelled', undone: 'Undone',
  confirm: 'Confirm', share: 'Allow sharing', cancel: 'Cancel', retry: 'Finish safely', undo: 'Undo', working: 'Working…',
  confirmDelete: 'Delete permanently',
  deleteWarning: 'This task and its subtasks will be deleted without going to Trash.',
  shareHint: 'These local results are sent to the model only after you allow it.',
  recover: 'The action may already be committed. Finishing safely checks the result without creating a duplicate.',
  empty: 'No matching results.', more: '{n} total; showing the first results.',
  none: 'No priority', low: 'Low priority', medium: 'Medium priority', high: 'High priority',
  active: 'Active', completed: 'Completed', trash: 'Trash',
  actions: {
    search_tasks: 'Find tasks', list_projects: 'List projects', 'task.create': 'Create task',
    'task.update': 'Update task', 'task.complete': 'Complete task', 'task.reopen': 'Reopen task',
    'task.trash': 'Move to Trash', 'task.restore': 'Restore task', 'task.delete': 'Delete permanently',
  },
};
export const chatToolContent: Record<Language, ChatToolContent> = { zh: zhTools, en: enTools };

const errors: Record<string, [string, string]> = {
  'invalid-url': ['请输入 HTTPS 服务地址；本地模型可使用 localhost 的 HTTP 地址。', 'Use an HTTPS base URL. HTTP is allowed for localhost models.'],
  'invalid-model': ['请输入有效的模型名称。', 'Enter a valid model name.'],
  'invalid-key': ['请输入有效的 API Key。', 'Enter a valid API key.'],
  'missing-key': ['请先保存此服务的 API Key。', 'Save an API key for this provider first.'],
  'key-store-unavailable': ['系统凭据库不可用，请解锁后重试。', 'The system credential vault is unavailable. Unlock it and retry.'],
  'http-401': ['API Key 无效或已过期，请在模型配置中更新。', 'The API key is invalid or expired. Update it in Model configuration.'],
  'http-403': ['此密钥无权访问该模型，请检查服务权限。', 'This key does not have access to the selected model.'],
  'http-404': ['找不到接口或模型，请检查服务地址和模型名称。', 'Endpoint or model not found. Check the base URL and model name.'],
  'http-429': ['请求过于频繁或额度不足，请稍后重试或检查账户额度。', 'Rate limit or quota reached. Retry later or check your provider balance.'],
  'browser-network': ['浏览器无法连接此服务，可能受跨域或网络限制。请检查网络，或在桌面端重试。', 'The browser could not connect. The service may block cross-origin requests. Check your network or retry in the desktop app.'],
  'timeout': ['回复超时，请重试。', 'The response timed out. Please retry.'],
  'empty-response': ['服务没有返回文字回复，请检查模型是否支持对话。', 'The provider returned no text. Check that this model supports chat.'],
  'invalid-response': ['服务返回了无法识别的回复，请使用支持流式 Chat Completions 的接口。', 'Unrecognized response. Use an endpoint supporting streaming Chat Completions.'],
  'response-truncated': ['回复达到模型长度限制，可重新生成或缩小问题范围。', 'The reply reached the model length limit. Retry or narrow your question.'],
  'context-too-long': ['当前对话过长，请新建会话后继续。', 'This conversation is too long. Start a new conversation.'],
  'response-too-long': ['回复过长，已停止接收。请缩小问题范围。', 'The reply is too long. Please narrow your question.'],
  'content-filter': ['服务商未能完成此回复，请调整问题后重试。', 'The provider could not complete this reply. Rephrase and retry.'],
  'interrupted': ['连接中断，可重新生成回复。', 'The connection was interrupted. You can regenerate the reply.'],
  'busy': ['请先等待当前回复完成，或停止生成。', 'Wait for the current reply or stop generation first.'],
  'save-failed': ['保存失败，内容已留在当前窗口。请重试保存。', 'Saving failed. Your content remains in this window. Retry saving.'],
  'message-too-long': ['消息最多 12,000 字符。', 'Messages are limited to 12,000 characters.'],
  'tool-arguments': ['模型给出的任务参数无效，请换一种说法重试。', 'The model returned invalid task parameters. Rephrase and retry.'],
  'tool-unsupported': ['当前不支持模型请求的这项操作。', 'The requested model action is not supported.'],
  'tool-multiple': ['一次只能处理一个任务操作，请让小光分步执行。', 'Only one task action can be handled at a time. Ask Xiaoguang to proceed step by step.'],
  'tool-ambiguous': ['找到多个同名项目或任务，请补充项目、日期或任务 ID。', 'Multiple matching projects or tasks were found. Add a project, date, or task ID.'],
  'tool-not-found': ['没有找到对应的项目或任务，请先查询确认。', 'The matching project or task was not found. Search first to confirm it.'],
  'tool-conflict': ['任务数据已发生变化，请取消后重新发起操作。', 'Task data changed. Cancel this action and request it again.'],
  'tool-workspace': ['本地任务数据尚未就绪，请稍后重试。', 'Local task data is not ready. Try again shortly.'],
  'tool-unconfirmed': ['操作尚未确认，未执行任何更改。', 'The action was not confirmed. No changes were made.'],
  'tool-save-failed': ['任务已留在当前窗口，但尚未安全保存，请重试。', 'The task remains in this window but is not safely saved yet. Retry.'],
  'tool-undo-conflict': ['只能撤销最近一次且未被继续修改的操作。', 'Only the latest unchanged action can be undone.'],
  'tool-unfinished': ['请先完成或取消当前任务操作。', 'Finish or cancel the current task action first.'],
};

export function chatErrorText(code: string, language: Language): string {
  const known = errors[code]?.[language === 'zh' ? 0 : 1];
  if (known) return known;
  const status = /^http-(\d{3})$/.exec(code)?.[1];
  if (status) return language === 'zh'
    ? `服务返回 HTTP ${status}，请检查服务地址和模型配置。`
    : `The service returned HTTP ${status}. Check the endpoint and model configuration.`;
  return language === 'zh'
    ? '连接失败，请检查网络、服务地址和模型配置后重试。'
    : 'Connection failed. Check your network, base URL and model, then retry.';
}
