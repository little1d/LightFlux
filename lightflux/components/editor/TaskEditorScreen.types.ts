export interface TaskEditorScreenProps {
  todoId: string;
  onClose: () => void;
  embedded?: boolean;
  readOnly?: boolean;
}
