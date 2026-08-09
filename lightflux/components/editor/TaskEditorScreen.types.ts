export interface TaskEditorScreenProps {
  todoId: string;
  onClose: () => void;
  embedded?: boolean;
  focusTitle?: boolean;
  readOnly?: boolean;
}
