import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ComponentProps,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Translation } from '../../content';
import { useTodoStore } from '../../store/todoStore';
import { Language, Todo, TodoPriority } from '../../types/todo';
import {
  addMonths,
  fromDateKey,
  monthGrid,
  toDateKey,
  todayKey,
} from '../../utils/date';
import MenuItem from '../ui/MenuItem';
import MenuSurface, {
  MenuSurfacePosition,
} from '../ui/MenuSurface';
import {
  TASK_PRIORITY_THEME,
  TaskPriorityIcon,
} from '../tasks/TaskPriorityIndicator';

type PickerKind = 'date' | 'project' | 'priority';

const MetadataChip = ({
  active,
  icon,
  label,
  onPress,
  tint,
}: {
  active: boolean;
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: (position: MenuSurfacePosition) => void;
  tint?: string;
}) => {
  const ref = useRef<View>(null);
  const [hovered, setHovered] = useState(false);

  const open = () => {
    if (Platform.OS === 'web') {
      const element = ref.current as unknown as HTMLElement | null;
      const bounds = element?.getBoundingClientRect?.();
      if (bounds) {
        onPress({
          x: bounds.left,
          y: bounds.bottom + 6,
        });
        return;
      }
    }
    ref.current?.measureInWindow((x, y, _width, height) => {
      onPress({ x, y: y + height + 6 });
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={open}
      ref={ref}
      style={({ pressed }) => [
        styles.chip,
        hovered && styles.chipHovered,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}
    >
      <Ionicons color={tint ?? '#777888'} name={icon} size={13} />
      <Text numberOfLines={1} style={styles.chipText}>
        {label}
      </Text>
      <Ionicons color="#B0B1BC" name="chevron-down" size={12} />
    </Pressable>
  );
};

const MiniCalendar = ({
  labels,
  language,
  onSelect,
  value,
}: {
  labels: Translation;
  language: Language;
  onSelect: (dateKey: string) => void;
  value: string;
}) => {
  const [month, setMonth] = useState(() => fromDateKey(value || todayKey()));
  const days = monthGrid(month);
  const today = todayKey();
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarHeader}>
        <Pressable
          accessibilityLabel={labels.calendar.previousMonth}
          accessibilityRole="button"
          hitSlop={6}
          onPress={() => setMonth((current) => addMonths(current, -1))}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
        >
          <Ionicons color="#6C6D7E" name="chevron-back" size={16} />
        </Pressable>
        <Text style={styles.calendarTitle}>
          {labels.calendar.monthTitle(
            month.getFullYear(),
            month.getMonth() + 1,
          )}
        </Text>
        <Pressable
          accessibilityLabel={labels.calendar.nextMonth}
          accessibilityRole="button"
          hitSlop={6}
          onPress={() => setMonth((current) => addMonths(current, 1))}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
        >
          <Ionicons color="#6C6D7E" name="chevron-forward" size={16} />
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {labels.calendar.weekdays.map((weekday, index) => (
          <Text key={`${weekday}-${index}`} style={styles.weekday}>
            {weekday}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const key = toDateKey(day);
          const inMonth = day.getMonth() === month.getMonth();
          const selected = key === value;
          const isToday = key === today;
          return (
            <Pressable
              accessibilityLabel={day.toLocaleDateString(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={key}
              onPress={() => onSelect(key)}
              style={({ pressed }) => [
                styles.dayCell,
                selected && styles.dayCellSelected,
                pressed && !selected && styles.dayCellPressed,
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
  );
};

const TaskEditorMetadata = ({
  projectName,
  labels,
  language,
  todo,
}: {
  projectName: string;
  labels: Translation;
  language: Language;
  todo: Todo;
}) => {
  const projects = useTodoStore((state) => state.projects);
  const updateTodo = useTodoStore((state) => state.updateTodo);
  const moveTodoToProject = useTodoStore((state) => state.moveTodoToProject);
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [position, setPosition] = useState<MenuSurfacePosition>();

  const orderedProjects = [...projects].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt,
  );
  const priorityTheme = TASK_PRIORITY_THEME[todo.priority];
  const dateLabel = todo.scheduledDate
    ? fromDateKey(todo.scheduledDate).toLocaleDateString(
        language === 'zh' ? 'zh-CN' : 'en-US',
        { day: 'numeric', month: 'short', weekday: 'short' },
      )
    : labels.editor.noDate;

  const openPicker = (kind: PickerKind) => (next: MenuSurfacePosition) => {
    setPosition(next);
    setPicker(kind);
  };
  const closePicker = () => setPicker(null);

  const setDate = (dateKey: string) => {
    updateTodo(todo.id, { scheduledDate: dateKey });
    closePicker();
  };
  const setPriority = (priority: TodoPriority) => {
    updateTodo(todo.id, { priority });
    closePicker();
  };
  const setProject = (projectId: string) => {
    moveTodoToProject(todo.id, projectId);
    closePicker();
  };

  return (
    <View style={styles.container}>
      <MetadataChip
        active={picker === 'date'}
        icon="calendar-outline"
        label={dateLabel}
        onPress={openPicker('date')}
      />
      <MetadataChip
        active={picker === 'project'}
        icon="folder-outline"
        label={projectName}
        onPress={openPicker('project')}
      />
      <MetadataChip
        active={picker === 'priority'}
        icon="flag-outline"
        label={labels.taskMenu.priorityOptions[todo.priority]}
        onPress={openPicker('priority')}
        tint={
          todo.priority === 'none' ? undefined : priorityTheme.color
        }
      />

      {picker === 'date' ? (
        <MenuSurface
          closeLabel={labels.cancel}
          estimatedHeight={360}
          onClose={closePicker}
          position={position}
          width={288}
        >
          <MiniCalendar
            labels={labels}
            language={language}
            onSelect={setDate}
            value={todo.scheduledDate}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<Ionicons color="#6F7080" name="today-outline" size={16} />}
            label={labels.editor.scheduleToday}
            onPress={() => setDate(todayKey())}
          />
          <MenuItem
            icon={
              <Ionicons color="#6F7080" name="arrow-forward-outline" size={16} />
            }
            label={labels.editor.scheduleTomorrow}
            onPress={() => {
              const tomorrow = fromDateKey(todayKey());
              tomorrow.setDate(tomorrow.getDate() + 1);
              setDate(toDateKey(tomorrow));
            }}
          />
        </MenuSurface>
      ) : null}

      {picker === 'project' ? (
        <MenuSurface
          closeLabel={labels.cancel}
          estimatedHeight={Math.min(370, 44 + orderedProjects.length * 44)}
          onClose={closePicker}
          position={position}
          width={240}
        >
          {orderedProjects.map((project) => (
            <MenuItem
              key={project.id}
              label={project.name}
              onPress={() => setProject(project.id)}
              selected={todo.projectId === project.id}
              trailing={
                todo.projectId === project.id ? (
                  <Ionicons color="#6759E8" name="checkmark" size={17} />
                ) : null
              }
            />
          ))}
        </MenuSurface>
      ) : null}

      {picker === 'priority' ? (
        <MenuSurface
          closeLabel={labels.cancel}
          estimatedHeight={220}
          onClose={closePicker}
          position={position}
          width={240}
        >
          {(['none', 'high', 'medium', 'low'] as TodoPriority[]).map(
            (priority) => (
              <MenuItem
                icon={<TaskPriorityIcon priority={priority} size={16} />}
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
        </MenuSurface>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#F2F1F6',
    borderColor: '#E7E5EC',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 9,
  },
  chipHovered: {
    backgroundColor: '#ECEAF3',
    borderColor: '#DAD7E4',
  },
  chipActive: {
    backgroundColor: '#EEECFF',
    borderColor: '#C6BEF6',
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    color: '#666778',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 180,
  },
  divider: {
    backgroundColor: '#ECEBF1',
    height: 1,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  calendar: {
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  calendarTitle: {
    color: '#303145',
    fontSize: 13,
    fontWeight: '700',
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    color: '#9A9BA8',
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  dayCell: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  dayCellSelected: {
    backgroundColor: '#6759E8',
  },
  dayCellPressed: {
    backgroundColor: '#EEECFF',
  },
  dayText: {
    color: '#3B3C4E',
    fontSize: 12,
    fontWeight: '600',
  },
  dayTextMuted: {
    color: '#C3C4CE',
  },
  dayTextToday: {
    color: '#6759E8',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.6,
  },
});

export default TaskEditorMetadata;
