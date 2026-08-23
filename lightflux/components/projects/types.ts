import { Project, Todo } from '../../types/todo';

export interface ProjectSection {
  id: string;
  name: string;
  color: string;
  kind: Project['kind'];
  sortOrder: number;
  todos: Todo[];
}

export interface InlineComposerState {
  anchorId: string;
  projectId: string;
  parentId: string | null;
  renderAfterId: string;
  scheduledDate: string;
}
