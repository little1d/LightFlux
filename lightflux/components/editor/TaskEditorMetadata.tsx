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
import { fromDateKey } from '../../utils/date';
import DatePicker from '../ui/DatePicker';
import MenuItem from '../ui/MenuItem';
import MenuSurface, {
  MenuSurfacePosition,
} from '../ui/MenuSurface';
import {
  TASK_PRIORITY_THEME,
  TaskPriorityIcon,
} from '../tasks/TaskPriorityIndicator';
import TaskTimePicker from '../tasks/TaskTimePicker';

type PickerKind = 'date' | 'time' | 'milestone' | 'project' | 'priority';

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
  const milestones = useTodoStore((state) => state.milestones);
  const allMilestones = useTodoStore((state) => state.allMilestones);
  const updateTodo = useTodoStore((state) => state.updateTodo);
  const moveTodoToProject = useTodoStore((state) => state.moveTodoToProject);
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [position, setPosition] = useState<MenuSurfacePosition>();

  const orderedProjects = [...projects].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt,
  );
  const priorityTheme = TASK_PRIORITY_THEME[todo.priority];
  const milestoneName =
    allMilestones.find((milestone) => milestone.id === todo.milestoneId)
      ?.title ??
    labels.editor.noMilestone;
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
  const setTime = (scheduledTime: string | null) => {
    updateTodo(todo.id, { scheduledTime });
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
  const setMilestone = (milestoneId: string | null) => {
    updateTodo(todo.id, { milestoneId });
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
        active={picker === 'time'}
        icon="time-outline"
        label={todo.scheduledTime ?? labels.editor.allDay}
        onPress={openPicker('time')}
        tint={todo.scheduledTime ? '#6759E8' : undefined}
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
      <MetadataChip
        active={picker === 'milestone'}
        icon="diamond-outline"
        label={milestoneName}
        onPress={openPicker('milestone')}
        tint={todo.milestoneId ? '#6759E8' : undefined}
      />

      {picker === 'date' ? (
        <MenuSurface
          closeLabel={labels.cancel}
          estimatedHeight={360}
          onClose={closePicker}
          position={position}
          width={288}
        >
          <DatePicker
            language={language}
            labels={labels}
            onSelect={setDate}
            shortcuts
            value={todo.scheduledDate}
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

      {picker === 'time' ? (
        <MenuSurface
          closeLabel={labels.cancel}
          estimatedHeight={330}
          onClose={closePicker}
          position={position}
          width={240}
        >
          <TaskTimePicker
            labels={labels}
            onSelect={setTime}
            value={todo.scheduledTime}
          />
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

      {picker === 'milestone' ? (
        <MenuSurface
          closeLabel={labels.cancel}
          estimatedHeight={Math.min(370, 44 + (milestones.length + 1) * 44)}
          onClose={closePicker}
          position={position}
          width={240}
        >
          <MenuItem
            label={labels.editor.noMilestone}
            onPress={() => setMilestone(null)}
            selected={todo.milestoneId === null}
          />
          {milestones.map((milestone) => (
            <MenuItem
              key={milestone.id}
              label={milestone.title}
              onPress={() => setMilestone(milestone.id)}
              selected={todo.milestoneId === milestone.id}
              trailing={
                todo.milestoneId === milestone.id ? (
                  <Ionicons color="#6759E8" name="checkmark" size={17} />
                ) : null
              }
            />
          ))}
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
});

export default TaskEditorMetadata;
