import { Todo } from '../../types/todo';

export const UNGROUPED_ID = '__ungrouped__';

export interface GroupSection {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  todos: Todo[];
}

export interface InlineComposerState {
  anchorId: string;
  groupId: string | null;
  parentId: string | null;
  renderAfterId: string;
  scheduledDate: string;
}
