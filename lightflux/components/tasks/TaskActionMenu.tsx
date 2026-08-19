import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../../config/input';
import { translations } from '../../content';
import { useTodoStore } from '../../store/todoStore';
import { TodoPriority } from '../../types/todo';
import ActionButton from '../ui/ActionButton';
import MenuItem from '../ui/MenuItem';
import MenuSurface from '../ui/MenuSurface';
import TaskPrioritySelector from './TaskPrioritySelector';
import { TaskMenuPosition } from './useTaskContextMenu';

const MENU_WIDTH = 240;
const EDIT_MENU_WIDTH = 300;
const GROUP_FLYOUT_WIDTH = 216;
type MenuMode = 'subtask' | 'rename' | 'group' | null;

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
  const {
    language,
    todos,
    groups,
    ungroupedName,
    addTodo,
    moveTodoToGroup,
    trashTodo,
    updateTodo,
  } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      todos: state.todos,
      groups: state.groups,
      ungroupedName: state.ungroupedName,
      addTodo: state.addTodo,
      moveTodoToGroup: state.moveTodoToGroup,
      trashTodo: state.trashTodo,
      updateTodo: state.updateTodo,
    })),
  );
  const labels = translations[language];
  const todo = todos.find((item) => item.id === todoId);
  const [mode, setMode] = useState<MenuMode>(null);
  const [draft, setDraft] = useState('');
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const viewport = useWindowDimensions();
  const compactEdit = viewport.width < 360;
  const isWeb = Platform.OS === 'web';
  const orderedGroups = [...groups].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt,
  );
  // The cascading group list opens to the right of the menu, unless the
  // menu is already near the viewport edge, in which case it flips left.
  const flyoutOnLeft =
    isWeb &&
    position !== undefined &&
    position.x + MENU_WIDTH + GROUP_FLYOUT_WIDTH + 20 > viewport.width;

  useEffect(
    () => () => {
      if (flyoutCloseTimer.current) {
        clearTimeout(flyoutCloseTimer.current);
      }
    },
    [],
  );

  // Hovering the "move to group" row flies the group list open; a short grace
  // period keeps it open while the pointer travels into the flyout.
  const cancelFlyoutClose = () => {
    if (flyoutCloseTimer.current) {
      clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
  };
  const openFlyoutOnHover = () => {
    if (!isWeb) {
      return;
    }
    cancelFlyoutClose();
    setFlyoutOpen(true);
  };
  const scheduleFlyoutClose = () => {
    if (!isWeb) {
      return;
    }
    cancelFlyoutClose();
    flyoutCloseTimer.current = setTimeout(() => setFlyoutOpen(false), 140);
  };

  if (!todo) {
    return null;
  }

  const beginEdit = (
    nextMode: Exclude<MenuMode, 'group' | null>,
  ) => {
    setMode(nextMode);
    setDraft(nextMode === 'rename' ? todo.title : '');
  };

  const submit = () => {
    const title = draft.trim();
    if (!title || !mode || mode === 'group') {
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

  const moveToGroup = (groupId: string | null) => {
    moveTodoToGroup(todo.id, groupId);
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

  const renderGroupList = () => (
    <ScrollView
      contentContainerStyle={styles.groupListContent}
      showsVerticalScrollIndicator={false}
      style={styles.groupList}
    >
      <MenuItem
        label={ungroupedName ?? labels.groups.ungrouped}
        onPress={() => moveToGroup(null)}
        selected={todo.groupId === null}
        trailing={
          todo.groupId === null ? (
            <Ionicons color="#6759E8" name="checkmark" size={17} />
          ) : null
        }
      />
      {orderedGroups.map((group) => (
        <MenuItem
          key={group.id}
          label={group.name}
          onPress={() => moveToGroup(group.id)}
          selected={todo.groupId === group.id}
          trailing={
            todo.groupId === group.id ? (
              <Ionicons color="#6759E8" name="checkmark" size={17} />
            ) : null
          }
        />
      ))}
    </ScrollView>
  );

  return (
    <MenuSurface
      allowOverflow={isWeb}
      closeLabel={labels.cancel}
      estimatedHeight={
        mode === 'group'
          ? Math.min(370, 62 + (orderedGroups.length + 1) * 44)
          : mode
            ? compactEdit
              ? 164
              : 118
            : 240
      }
      onClose={onClose}
      position={position}
      width={
        mode && mode !== 'group' ? EDIT_MENU_WIDTH : MENU_WIDTH
      }
    >
      {mode === 'group' ? (
        <View style={styles.groupPicker}>
          <MenuItem
            icon={
              <Ionicons
                color="#696A7A"
                name="chevron-back"
                size={17}
              />
            }
            label={labels.taskMenu.backToActions}
            onPress={() => setMode(null)}
          />
          <View style={styles.divider} />
          {renderGroupList()}
        </View>
      ) : mode ? (
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
          <View
            onPointerEnter={openFlyoutOnHover}
            onPointerLeave={scheduleFlyoutClose}
            style={styles.moveRow}
          >
            <MenuItem
              icon={
                <Ionicons
                  color="#6F7080"
                  name="folder-outline"
                  size={16}
                />
              }
              label={labels.taskMenu.moveToGroup}
              onHoverIn={openFlyoutOnHover}
              onPress={() => (isWeb ? openFlyoutOnHover() : setMode('group'))}
              selected={isWeb && flyoutOpen}
              trailing={
                <Ionicons
                  color="#A0A1AD"
                  name="chevron-forward"
                  size={15}
                />
              }
            />
            {isWeb && flyoutOpen ? (
              <View
                onPointerEnter={cancelFlyoutClose}
                onPointerLeave={scheduleFlyoutClose}
                style={[
                  styles.flyout,
                  flyoutOnLeft ? styles.flyoutLeft : styles.flyoutRight,
                ]}
              >
                {renderGroupList()}
              </View>
            ) : null}
          </View>
        </>
      )}

      {mode !== 'group' ? (
        <MenuItem
          danger
          label={labels.taskMenu.moveToTrash}
          onPress={moveToTrash}
        />
      ) : null}
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
  divider: {
    backgroundColor: '#ECEBF1',
    height: 1,
    marginHorizontal: 8,
    marginVertical: 3,
  },
  flyout: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E0E7',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 6,
    position: 'absolute',
    shadowColor: '#242235',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 22,
    top: -6,
    width: 216,
    zIndex: 20,
  },
  flyoutLeft: {
    right: '100%',
    marginRight: 8,
  },
  flyoutRight: {
    left: '100%',
    marginLeft: 8,
  },
  groupList: {
    maxHeight: 264,
  },
  groupListContent: {
    paddingBottom: 2,
  },
  groupPicker: {
    paddingBottom: 2,
  },
  moveRow: {
    position: 'relative',
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
