export type Language = 'zh' | 'en';

export type TodoFilter = 'all' | 'active' | 'completed';

export type TodoPriority = 'none' | 'high' | 'medium' | 'low';

export const NAVIGATION_ITEM_IDS = [
  'search',
  'today',
  'completed',
  'calendar',
  'groups',
  'trash',
] as const;

export type NavigationItemId = (typeof NAVIGATION_ITEM_IDS)[number];

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
  priority: TodoPriority;
  sortOrder: number;
  trashedAt: number | null;
  content: RichTextDocument;
}

export interface TodoGroup {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  sortOrder: number;
}

export interface PersistedAppState {
  schemaVersion: 6;
  language: Language;
  navigationOrder: NavigationItemId[];
  ungroupedName: string | null;
  todos: Todo[];
  groups: TodoGroup[];
}

export interface GroupPlacement {
  anchorGroupId: string | null;
  position: 'before' | 'after';
}

export interface NewTodo {
  title: string;
  scheduledDate: string;
  groupId?: string | null;
  parentId?: string | null;
  insertAfterId?: string;
  content?: RichTextDocument;
}

export type TodoUpdate = Partial<
  Pick<
    Todo,
    | 'title'
    | 'scheduledDate'
    | 'groupId'
    | 'parentId'
    | 'priority'
    | 'sortOrder'
    | 'content'
  >
>;
