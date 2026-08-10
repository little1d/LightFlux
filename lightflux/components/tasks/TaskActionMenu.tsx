import { useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../../config/input';
import { translations } from '../../i18n/translations';
import { useTodoStore } from '../../store/todoStore';
import { TodoPriority } from '../../types/todo';
import ActionButton from '../ui/ActionButton';
import MenuItem from '../ui/MenuItem';
import MenuSurface from '../ui/MenuSurface';
import TaskPrioritySelector from './TaskPrioritySelector';
import { TaskMenuPosition } from './useTaskContextMenu';

const MENU_WIDTH = 240;
const EDIT_MENU_WIDTH = 300;
type EditMode = 'subtask' | 'rename' | null;

interface TaskActionMenuProps {
  todoId: string;
  position?: TaskMenuPosition;
  onClose: () => void;
  onTrash: (todoId: string) => void;
}

const TaskActionMenu = ({
  todoId,
  position,
  onClose,
  onTrash,
}: TaskActionMenuProps) => {
  const { language, todos, addTodo, trashTodo, updateTodo } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      todos: state.todos,
      addTodo: state.addTodo,
      trashTodo: state.trashTodo,
      updateTodo: state.updateTodo,
    })),
  );
  const labels = translations[language];
  const todo = todos.find((item) => item.id === todoId);
  const [mode, setMode] = useState<EditMode>(null);
  const [draft, setDraft] = useState('');
  const viewport = useWindowDimensions();
  const compactEdit = viewport.width < 360;

  if (!todo) {
    return null;
  }

  const beginEdit = (nextMode: Exclude<EditMode, null>) => {
    setMode(nextMode);
    setDraft(nextMode === 'rename' ? todo.title : '');
  };

  const submit = () => {
    const title = draft.trim();
    if (!title || !mode) {
      return;
    }

    if (mode === 'rename') {
      updateTodo(todo.id, { title });
    } else {
      addTodo({
        title,
        scheduledDate: todo.scheduledDate,
        groupId: todo.groupId,
        parentId: todo.id,
      });
    }
    Keyboard.dismiss();
    onClose();
  };

  const moveToTrash = () => {
    trashTodo(todo.id);
    onTrash(todo.id);
    onClose();
  };

  const setPriority = (priority: TodoPriority) => {
    updateTodo(todo.id, { priority });
    onClose();
  };

  return (
    <MenuSurface
      closeLabel={labels.cancel}
      estimatedHeight={mode ? (compactEdit ? 164 : 118) : 195}
      onClose={onClose}
      position={position}
      width={mode ? EDIT_MENU_WIDTH : MENU_WIDTH}
    >
      {mode ? (
        <View
          nativeID={
            mode === 'rename'
              ? 'context-task-name-composer'
              : 'context-subtask-composer'
          }
          style={[
            styles.composer,
            compactEdit && styles.composerCompact,
          ]}
        >
          <TextInput
            {...inputAccentProps}
            accessibilityLabel={
              mode === 'rename'
                ? labels.editor.titlePlaceholder
                : labels.taskMenu.subtaskPlaceholder
            }
            autoFocus
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder={
              mode === 'rename'
                ? labels.editor.titlePlaceholder
                : labels.taskMenu.subtaskPlaceholder
            }
            placeholderTextColor="#9A9BA8"
            returnKeyType="done"
            style={[
              styles.input,
              compactEdit && styles.inputCompact,
            ]}
            value={draft}
          />
          <View
            style={[
              styles.submitButton,
              compactEdit && styles.submitButtonCompact,
            ]}
          >
            <ActionButton
              disabled={!draft.trim()}
              label={
                mode === 'rename'
                  ? labels.groups.confirmRename
                  : labels.taskMenu.createSubtask
              }
              onPress={submit}
              size="small"
            />
          </View>
        </View>
      ) : (
        <>
          <MenuItem
            label={labels.taskMenu.rename}
            onPress={() => beginEdit('rename')}
          />
          <TaskPrioritySelector
            label={labels.taskMenu.priority}
            labels={labels.taskMenu.priorityOptions}
            onChange={setPriority}
            value={todo.priority}
          />
          <MenuItem
            label={labels.taskMenu.addSubtask}
            onPress={() => beginEdit('subtask')}
          />
        </>
      )}

      <MenuItem
        danger
        label={labels.taskMenu.moveToTrash}
        onPress={moveToTrash}
      />
    </MenuSurface>
  );
};

const styles = StyleSheet.create({
  composer: {
    alignItems: 'center',
    backgroundColor: '#F7F6FA',
    borderColor: '#D8D4F0',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    margin: 8,
    padding: 4,
    paddingLeft: 10,
  },
  composerCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
    padding: 8,
  },
  input: {
    color: '#303145',
    flex: 1,
    fontSize: 12,
    height: 32,
    minWidth: 0,
    paddingHorizontal: 0,
  },
  inputCompact: {
    flex: 0,
    paddingHorizontal: 3,
    width: '100%',
  },
  submitButton: {
    flexShrink: 0,
    marginLeft: 6,
  },
  submitButtonCompact: {
    alignSelf: 'flex-end',
    marginLeft: 0,
    marginTop: 8,
  },
});

export default TaskActionMenu;
