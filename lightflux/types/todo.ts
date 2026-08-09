export type Language = 'zh' | 'en';

export type TodoFilter = 'all' | 'active' | 'completed';

export interface RichTextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface RichTextNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
}

export interface RichTextDocument extends RichTextNode {
  type: 'doc';
  content: RichTextNode[];
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
  scheduledDate: string;
  groupId: string | null;
  parentId: string | null;
  trashedAt: number | null;
  content: RichTextDocument;
}

export interface TodoGroup {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface PersistedAppState {
  language: Language;
  todos: Todo[];
  groups: TodoGroup[];
}

export interface NewTodo {
  title: string;
  scheduledDate: string;
  groupId?: string | null;
  parentId?: string | null;
  content?: RichTextDocument;
}

export type TodoUpdate = Partial<
  Pick<
    Todo,
    'title' | 'scheduledDate' | 'groupId' | 'parentId' | 'content'
  >
>;
