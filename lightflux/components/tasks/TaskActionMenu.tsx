import React, { useState } from 'react';
import {
  Keyboard,
  TextInput,
  View,
} from 'react-native';

import { inputAccentProps } from '../../config/input';
import { useTodos } from '../../context/TodoContext';
import { translations } from '../../i18n/translations';
import ActionButton from '../ui/ActionButton';
import MenuItem from '../ui/MenuItem';
import MenuSurface from '../ui/MenuSurface';
import { TaskMenuPosition } from './useTaskContextMenu';

const MENU_WIDTH = 220;

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
  const { language, todos, addTodo, trashTodo } = useTodos();
  const labels = translations[language];
  const todo = todos.find((item) => item.id === todoId);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [draft, setDraft] = useState('');

  if (!todo) {
    return null;
  }

  const submitSubtask = () => {
    const title = draft.trim();
    if (!title) {
      return;
    }

    addTodo({
      title,
      scheduledDate: todo.scheduledDate,
      groupId: todo.groupId,
      parentId: todo.id,
    });
    Keyboard.dismiss();
    onClose();
  };

  const moveToTrash = () => {
    trashTodo(todo.id);
    onTrash(todo.id);
    onClose();
  };

  return (
    <MenuSurface
      closeLabel={labels.cancel}
      estimatedHeight={isAddingSubtask ? 110 : 100}
      onClose={onClose}
      position={position}
      width={MENU_WIDTH}
    >
      {isAddingSubtask ? (
        <View
          className="m-2 flex-row rounded-[9px] border border-[#D8D4F0] bg-[#F7F6FA] p-1 pl-2.5"
          nativeID="context-subtask-composer"
        >
          <TextInput
            {...inputAccentProps}
            accessibilityLabel={labels.taskMenu.subtaskPlaceholder}
            autoFocus
            className="h-8 flex-1 text-[12px] text-[#303145]"
            onChangeText={setDraft}
            onSubmitEditing={submitSubtask}
            placeholder={labels.taskMenu.subtaskPlaceholder}
            placeholderTextColor="#9A9BA8"
            returnKeyType="done"
            value={draft}
          />
          <ActionButton
            disabled={!draft.trim()}
            label={labels.taskMenu.createSubtask}
            onPress={submitSubtask}
            size="small"
          />
        </View>
      ) : (
        <MenuItem
          label={labels.taskMenu.addSubtask}
          onPress={() => setIsAddingSubtask(true)}
        />
      )}

      <MenuItem
        danger
        label={labels.taskMenu.moveToTrash}
        onPress={moveToTrash}
      />
    </MenuSurface>
  );
};

export default TaskActionMenu;
