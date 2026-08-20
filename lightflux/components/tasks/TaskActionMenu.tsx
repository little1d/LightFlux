import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ComponentProps,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../../config/input';
import { translations } from '../../content';
import { useTodoStore } from '../../store/todoStore';
import { TodoPriority } from '../../types/todo';
import {
  addMonths,
  fromDateKey,
  monthGrid,
  toDateKey,
  todayKey,
} from '../../utils/date';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';
import MenuItem from '../ui/MenuItem';
import MenuSurface from '../ui/MenuSurface';
import TaskPrioritySelector from './TaskPrioritySelector';
import {
  TASK_PRIORITY_THEME,
  TaskPriorityIcon,
} from './TaskPriorityIndicator';
import { TaskMenuPosition } from './useTaskContextMenu';

const MENU_WIDTH = 240;
const EDIT_MENU_WIDTH = 300;
const GROUP_FLYOUT_WIDTH = 216;
type MenuMode =
  | 'date'
  | 'group'
  | 'priority'
  | 'rename'
  | 'subtask'
  | null;

interface TaskActionMenuProps {
  todoId: string;
  position?: TaskMenuPosition;
  onClose: () => void;
  onTrash: (todoId: string) => void;
}

const MobileAction = ({
  icon,
  label,
  onPress,
  tint = '#6759E8',
  value,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  tint?: string;
  value: string;
}) => (
  <Pressable
    accessibilityLabel={`${label}: ${value}`}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [
      styles.mobileAction,
      pressed && styles.mobileActionPressed,
    ]}
  >
    <View style={styles.mobileActionIcon}>
      <Ionicons color={tint} name={icon} size={18} />
    </View>
    <Text style={styles.mobileActionLabel}>{label}</Text>
    <Text numberOfLines={1} style={styles.mobileActionValue}>
      {value}
    </Text>
  </Pressable>
);

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
  const [calendarMonth, setCalendarMonth] = useState(() =>
    fromDateKey(todayKey()),
  );
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const viewport = useWindowDimensions();
  const mobileSheet = viewport.width < 900;
  const compactEdit = viewport.width < 360;
  const isWeb = Platform.OS === 'web';
  const desktopWeb = isWeb && !mobileSheet;
  const orderedGroups = [...groups].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt,
  );
  const flyoutOnLeft =
    desktopWeb &&
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

  const cancelFlyoutClose = () => {
    if (flyoutCloseTimer.current) {
      clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
  };
  const openFlyoutOnHover = () => {
    if (!desktopWeb) {
      return;
    }
    cancelFlyoutClose();
    setFlyoutOpen(true);
  };
  const scheduleFlyoutClose = () => {
    if (!desktopWeb) {
      return;
    }
    cancelFlyoutClose();
    flyoutCloseTimer.current = setTimeout(() => setFlyoutOpen(false), 140);
  };

  if (!todo) {
    return null;
  }

  const openMode = (nextMode: Exclude<MenuMode, null>) => {
    if (nextMode === 'rename' || nextMode === 'subtask') {
      setDraft(nextMode === 'rename' ? todo.title : '');
    }
    if (nextMode === 'date') {
      setCalendarMonth(fromDateKey(todo.scheduledDate));
    }
    setMode(nextMode);
  };

  const submit = () => {
    const title = draft.trim();
    if (!title || (mode !== 'rename' && mode !== 'subtask')) {
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

  const setScheduledDate = (scheduledDate: string) => {
    updateTodo(todo.id, { scheduledDate });
    onClose();
  };

  const renderGroupList = (mobile = false) => (
    <ScrollView
      contentContainerStyle={styles.groupListContent}
      showsVerticalScrollIndicator={false}
      style={[styles.groupList, mobile && styles.mobileGroupList]}
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
          icon={
            <View
              style={[styles.groupDot, { backgroundColor: group.color }]}
            />
          }
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

  const renderSheetHeader = (title: string, back = false) => (
    <>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        {back ? (
          <IconButton
            icon="chevron-back"
            label={labels.taskMenu.backToActions}
            onPress={() => setMode(null)}
            size="small"
            variant="transparent"
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={[styles.sheetTitle, back && styles.sheetTitleWithBack]}
        >
          {title}
        </Text>
        <IconButton
          icon="close"
          label={labels.cancel}
          onPress={onClose}
          showTooltip={false}
          size="small"
          variant="transparent"
        />
      </View>
    </>
  );

  const renderDatePicker = () => {
    const today = todayKey();
    return (
      <>
        {renderSheetHeader(labels.editor.dateLabel, true)}
        <View style={styles.calendar}>
          <View style={styles.calendarHeader}>
            <IconButton
              icon="chevron-back"
              label={labels.calendar.previousMonth}
              onPress={() =>
                setCalendarMonth((current) => addMonths(current, -1))
              }
              size="compact"
              variant="transparent"
            />
            <Text style={styles.calendarTitle}>
              {labels.calendar.monthTitle(
                calendarMonth.getFullYear(),
                calendarMonth.getMonth() + 1,
              )}
            </Text>
            <IconButton
              icon="chevron-forward"
              label={labels.calendar.nextMonth}
              onPress={() =>
                setCalendarMonth((current) => addMonths(current, 1))
              }
              size="compact"
              variant="transparent"
            />
          </View>
          <View style={styles.weekRow}>
            {labels.calendar.weekdays.map((weekday, index) => (
              <Text key={`${weekday}-${index}`} style={styles.weekday}>
                {weekday}
              </Text>
            ))}
          </View>
          <View style={styles.days}>
            {monthGrid(calendarMonth).map((day) => {
              const dateKey = toDateKey(day);
              const selected = dateKey === todo.scheduledDate;
              const isToday = dateKey === today;
              const inMonth = day.getMonth() === calendarMonth.getMonth();
              return (
                <Pressable
                  accessibilityLabel={day.toLocaleDateString(
                    language === 'zh' ? 'zh-CN' : 'en-US',
                  )}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={dateKey}
                  onPress={() => setScheduledDate(dateKey)}
                  style={({ pressed }) => [
                    styles.day,
                    selected && styles.daySelected,
                    pressed && !selected && styles.dayPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !inMonth && styles.dayTextMuted,
                      isToday && !selected && styles.dayTextToday,
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.sheetDivider} />
        <MenuItem
          icon={<Ionicons color="#6F7080" name="today-outline" size={17} />}
          label={labels.editor.scheduleToday}
          onPress={() => setScheduledDate(today)}
        />
        <MenuItem
          icon={
            <Ionicons
              color="#6F7080"
              name="arrow-forward-outline"
              size={17}
            />
          }
          label={labels.editor.scheduleTomorrow}
          onPress={() => {
            const tomorrow = fromDateKey(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            setScheduledDate(toDateKey(tomorrow));
          }}
        />
      </>
    );
  };

  const renderMobileContent = () => {
    if (mode === 'date') {
      return renderDatePicker();
    }
    if (mode === 'group') {
      return (
        <>
          {renderSheetHeader(labels.taskMenu.moveToGroup, true)}
          {renderGroupList(true)}
        </>
      );
    }
    if (mode === 'priority') {
      return (
        <>
          {renderSheetHeader(labels.taskMenu.priority, true)}
          <View style={styles.priorityList}>
            {(['none', 'high', 'medium', 'low'] as TodoPriority[]).map(
              (priority) => (
                <MenuItem
                  icon={<TaskPriorityIcon priority={priority} size={17} />}
                  key={priority}
                  label={labels.taskMenu.priorityOptions[priority]}
                  onPress={() => setPriority(priority)}
                  selected={todo.priority === priority}
                  trailing={
                    todo.priority === priority ? (
                      <Ionicons color="#6759E8" name="checkmark" size={17} />
                    ) : null
                  }
                />
              ),
            )}
          </View>
        </>
      );
    }
    if (mode === 'rename' || mode === 'subtask') {
      return (
        <>
          {renderSheetHeader(
            mode === 'rename'
              ? labels.taskMenu.rename
              : labels.taskMenu.addSubtask,
            true,
          )}
          <View style={styles.sheetComposer}>
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
              style={styles.sheetInput}
              value={draft}
            />
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
        </>
      );
    }

    const groupName =
      orderedGroups.find((group) => group.id === todo.groupId)?.name ??
      ungroupedName ??
      labels.groups.ungrouped;
    const dateLabel = fromDateKey(todo.scheduledDate).toLocaleDateString(
      language === 'zh' ? 'zh-CN' : 'en-US',
      { day: 'numeric', month: 'short' },
    );
    const priorityTheme = TASK_PRIORITY_THEME[todo.priority];

    return (
      <>
        {renderSheetHeader(todo.title)}
        <View style={styles.mobileActions}>
          <MobileAction
            icon="calendar-outline"
            label={labels.editor.dateLabel}
            onPress={() => openMode('date')}
            value={dateLabel}
          />
          <MobileAction
            icon="folder-outline"
            label={labels.editor.groupLabel}
            onPress={() => openMode('group')}
            value={groupName}
          />
          <MobileAction
            icon="flag-outline"
            label={labels.taskMenu.priority}
            onPress={() => openMode('priority')}
            tint={
              todo.priority === 'none' ? '#6759E8' : priorityTheme.color
            }
            value={labels.taskMenu.priorityOptions[todo.priority]}
          />
        </View>
        <View style={styles.sheetDivider} />
        <MenuItem
          icon={<Ionicons color="#6F7080" name="pencil-outline" size={17} />}
          label={labels.taskMenu.rename}
          onPress={() => openMode('rename')}
        />
        <MenuItem
          icon={
            <Ionicons color="#6F7080" name="git-branch-outline" size={17} />
          }
          label={labels.taskMenu.addSubtask}
          onPress={() => openMode('subtask')}
        />
        <MenuItem
          danger
          icon={<Ionicons color="#C84F60" name="trash-outline" size={17} />}
          label={labels.taskMenu.moveToTrash}
          onPress={moveToTrash}
        />
      </>
    );
  };

  if (mobileSheet) {
    return (
      <MenuSurface
        closeLabel={labels.cancel}
        estimatedHeight={
          mode === 'date'
            ? 510
            : mode === 'group'
              ? Math.min(520, 80 + (orderedGroups.length + 1) * 44)
              : mode
                ? 270
                : 350
        }
        onClose={onClose}
        presentation="sheet"
      >
        {mode === null || mode === 'date' ? (
          <ScrollView
            contentContainerStyle={styles.mobileSheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.mobileSheetScroll}
          >
            {renderMobileContent()}
          </ScrollView>
        ) : (
          renderMobileContent()
        )}
      </MenuSurface>
    );
  }

  return (
    <MenuSurface
      allowOverflow={desktopWeb}
      closeLabel={labels.cancel}
      estimatedHeight={
        mode === 'group'
          ? Math.min(370, 62 + (orderedGroups.length + 1) * 44)
          : mode === 'rename' || mode === 'subtask'
            ? compactEdit
              ? 164
              : 118
            : 240
      }
      onClose={onClose}
      position={position}
      width={
        mode === 'rename' || mode === 'subtask'
          ? EDIT_MENU_WIDTH
          : MENU_WIDTH
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
      ) : mode === 'rename' || mode === 'subtask' ? (
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
            style={[styles.input, compactEdit && styles.inputCompact]}
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
            onPress={() => openMode('rename')}
          />
          <TaskPrioritySelector
            label={labels.taskMenu.priority}
            labels={labels.taskMenu.priorityOptions}
            onChange={setPriority}
            value={todo.priority}
          />
          <MenuItem
            label={labels.taskMenu.addSubtask}
            onPress={() => openMode('subtask')}
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
              onPress={() =>
                desktopWeb ? openFlyoutOnHover() : openMode('group')
              }
              selected={desktopWeb && flyoutOpen}
              trailing={
                <Ionicons
                  color="#A0A1AD"
                  name="chevron-forward"
                  size={15}
                />
              }
            />
            {desktopWeb && flyoutOpen ? (
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
  mobileAction: {
    alignItems: 'center',
    backgroundColor: '#F7F6FA',
    borderColor: '#E7E5EC',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minHeight: 84,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  mobileActionPressed: {
    backgroundColor: '#EEEBFF',
    borderColor: '#C9C2F5',
    transform: [{ scale: 0.98 }],
  },
  mobileActionIcon: {
    alignItems: 'center',
    backgroundColor: '#EEEBFF',
    borderRadius: 9,
    height: 32,
    justifyContent: 'center',
    marginBottom: 6,
    width: 32,
  },
  mobileActionLabel: {
    color: '#777887',
    fontSize: 10,
    fontWeight: '700',
  },
  mobileActionValue: {
    color: '#393A4D',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    maxWidth: '100%',
  },
  mobileActions: {
    flexDirection: 'row',
    gap: 7,
  },
  mobileSheetContent: {
    paddingBottom: 6,
  },
  mobileSheetScroll: {
    flexShrink: 1,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#D7D5DF',
    borderRadius: 2,
    height: 4,
    marginBottom: 5,
    width: 34,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 42,
  },
  sheetTitle: {
    color: '#303145',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
  },
  sheetTitleWithBack: {
    marginLeft: 3,
  },
  sheetDivider: {
    backgroundColor: '#ECEBF1',
    height: 1,
    marginVertical: 7,
  },
  sheetComposer: {
    alignItems: 'center',
    backgroundColor: '#F7F6FA',
    borderColor: '#D8D4F0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    padding: 7,
    paddingLeft: 12,
  },
  sheetInput: {
    color: '#303145',
    flex: 1,
    fontSize: 14,
    minHeight: 36,
    minWidth: 0,
    paddingHorizontal: 0,
  },
  calendar: {
    paddingHorizontal: 2,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calendarTitle: {
    color: '#3D3E51',
    fontSize: 13,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    color: '#9A9BA8',
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  day: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  daySelected: {
    backgroundColor: '#6759E8',
  },
  dayPressed: {
    backgroundColor: '#EEECFF',
  },
  dayText: {
    color: '#424356',
    fontSize: 11,
    fontWeight: '600',
  },
  dayTextMuted: {
    color: '#C2C3CC',
  },
  dayTextToday: {
    color: '#6759E8',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  priorityList: {
    paddingBottom: 4,
  },
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
    marginRight: 8,
    right: '100%',
  },
  flyoutRight: {
    left: '100%',
    marginLeft: 8,
  },
  groupDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  groupList: {
    maxHeight: 264,
  },
  mobileGroupList: {
    maxHeight: 380,
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
