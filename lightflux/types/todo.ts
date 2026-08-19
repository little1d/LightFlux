export type Language = 'zh' | 'en';

export type TodoFilter = 'all' | 'active' | 'completed';

export type TodoPriority = 'none' | 'high' | 'medium' | 'low';

export const NAVIGATION_ITEM_IDS = [
  'today',
  'completed',
  'calendar',
  'milestones',
  'groups',
  'trash',
] as const;

export type NavigationItemId = (typeof NAVIGATION_ITEM_IDS)[number];

export const OPTIONAL_NAVIGATION_ITEM_IDS = [
  'completed',
  'calendar',
  'milestones',
  'trash',
] as const;

export type OptionalNavigationItemId =
  (typeof OPTIONAL_NAVIGATION_ITEM_IDS)[number];

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
  milestoneId: string | null;
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

export type TaskEventType =
  | 'created'
  | 'completed'
  | 'reopened'
  | 'rescheduled'
  | 'trashed'
  | 'restored';

export interface TaskEventMetadata {
  scheduledDate?: string;
  previousScheduledDate?: string;
  migrated?: boolean;
}

export interface TaskEvent {
  id: string;
  taskId: string;
  type: TaskEventType;
  occurredAt: number;
  metadata?: TaskEventMetadata;
}

export type MilestoneType =
  | 'anniversary'
  | 'countdown'
  | 'birthday'
  | 'holiday'
  | 'custom';

export interface SolarMilestoneDateRule {
  calendar: 'solar';
  year: number | null;
  month: number;
  day: number;
  leapDayPolicy: 'feb-28' | 'mar-1';
}

export interface LunarMilestoneDateRule {
  calendar: 'lunar';
  year: number | null;
  month: number;
  day: number;
  isLeapMonth: boolean;
  missingLeapMonthPolicy: 'regular-month' | 'skip-year';
}

export type MilestoneDateRule =
  | SolarMilestoneDateRule
  | LunarMilestoneDateRule;

export interface Milestone {
  id: string;
  title: string;
  type: MilestoneType;
  dateRule: MilestoneDateRule;
  startYear: number | null;
  reminderOffsets: number[];
  notes: string;
  icon: string;
  color: string;
  pinned: boolean;
  archivedAt: number | null;
  trashedAt: number | null;
  createdAt: number;
  updatedAt: number;
  revision: number;
}

export interface PersistedAppState {
  schemaVersion: 10;
  updatedAt: number;
  analyticsStartedAt: number;
  language: Language;
  navigationOrder: NavigationItemId[];
  hiddenNavigationItems: OptionalNavigationItemId[];
  ungroupedName: string | null;
  todos: Todo[];
  groups: TodoGroup[];
  milestones: Milestone[];
  taskEvents: TaskEvent[];
}

export interface GroupPlacement {
  anchorGroupId: string | null;
  position: 'before' | 'after';
}

export interface NewTodo {
  title: string;
  scheduledDate: string;
  groupId?: string | null;
  milestoneId?: string | null;
  parentId?: string | null;
  priority?: TodoPriority;
  insertAfterId?: string;
  content?: RichTextDocument;
}

export interface NewMilestone {
  title: string;
  type: MilestoneType;
  dateRule: MilestoneDateRule;
  startYear?: number | null;
  reminderOffsets?: number[];
  notes?: string;
  icon?: string;
  color?: string;
  pinned?: boolean;
}

export type MilestoneUpdate = Partial<
  Pick<
    Milestone,
    | 'title'
    | 'type'
    | 'dateRule'
    | 'startYear'
    | 'reminderOffsets'
    | 'notes'
    | 'icon'
    | 'color'
    | 'pinned'
  >
>;

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
