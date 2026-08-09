import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { inputAccentProps } from '../../config/input';
import { useTodos } from '../../context/TodoContext';
import { translations } from '../../i18n/translations';
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
  const { width, height } = useWindowDimensions();
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

  const webMenuStyle =
    Platform.OS === 'web' && position
      ? {
          left: Math.max(12, Math.min(position.x, width - MENU_WIDTH - 12)),
          top: Math.max(12, Math.min(position.y, height - 180)),
        }
      : undefined;

  const menuContent = (
    <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={labels.cancel}
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView
          style={[
            styles.menuPosition,
            Platform.OS === 'web' && position
              ? styles.webPosition
              : styles.mobilePosition,
            webMenuStyle,
          ]}
        >
          <View
            className="overflow-hidden rounded-[12px] border border-[#E3E2EA] bg-white"
            style={styles.menuShadow}
          >
            <View className="border-b border-[#ECEBF1] px-3 py-2.5">
              <Text
                className="text-[13px] font-semibold text-[#4A4B5C]"
                numberOfLines={1}
              >
                {todo.title}
              </Text>
            </View>

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
                <Pressable
                  accessibilityLabel={labels.taskMenu.createSubtask}
                  accessibilityRole="button"
                  className={`h-8 items-center justify-center rounded-[7px] px-2.5 ${
                    draft.trim() ? 'bg-primary' : 'bg-[#C9C6DD]'
                  }`}
                  disabled={!draft.trim()}
                  onPress={submitSubtask}
                >
                  <Text className="text-[11px] font-bold text-white">
                    {labels.taskMenu.createSubtask}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                className="min-h-[40px] justify-center px-3 py-2.5"
                onPress={() => setIsAddingSubtask(true)}
              >
                <Text className="text-[13px] font-medium text-[#38394C]">
                  {labels.taskMenu.addSubtask}
                </Text>
              </Pressable>
            )}

            <View className="mx-3 h-px bg-[#ECEBF1]" />

            <Pressable
              accessibilityRole="button"
              className="min-h-[40px] justify-center px-3 py-2.5"
              onPress={moveToTrash}
            >
              <Text className="text-[13px] font-medium text-[#C84F60]">
                {labels.taskMenu.moveToTrash}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
    </View>
  );

  if (Platform.OS === 'web') {
    return <View style={styles.webOverlay}>{menuContent}</View>;
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible
    >
      {menuContent}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor:
      Platform.OS === 'web' ? 'rgba(28, 28, 40, 0.06)' : 'rgba(28, 28, 40, 0.25)',
  },
  webOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  menuPosition: {
    position: 'absolute',
    width: MENU_WIDTH,
  },
  webPosition: {},
  mobilePosition: {
    bottom: 12,
    left: 16,
    right: 16,
    width: undefined,
  },
  menuShadow: {
    shadowColor: '#242235',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
  },
});

export default TaskActionMenu;
