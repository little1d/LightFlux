import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { translations } from '../../../content';
import type { Todo } from '../../../types/todo';
import { fromDateKey } from '../../../utils/date';
import DatePicker from '../../ui/DatePicker';
import MenuItem from '../../ui/MenuItem';
import MenuSurface from '../../ui/MenuSurface';
import TaskPrioritySelector from '../TaskPrioritySelector';
import TaskTimePicker from '../TaskTimePicker';
import type { TaskMenuPosition } from '../useTaskContextMenu';
import ProjectPickerList from './ProjectPickerList';
import TitleComposer from './TitleComposer';
import type useTaskActionMenu from './useTaskActionMenu';
import {
  EDIT_MENU_WIDTH,
  MENU_WIDTH,
} from './useTaskActionMenu';

interface TaskActionMenuDesktopProps {
  todo: Todo;
  menu: ReturnType<typeof useTaskActionMenu>;
  position?: TaskMenuPosition;
  onClose: () => void;
}

/** The anchored popover presentation of the task action menu. */
const TaskActionMenuDesktop = ({
  todo,
  menu,
  position,
  onClose,
}: TaskActionMenuDesktopProps) => {
  const {
    cancelFlyoutClose,
    closeMode,
    compactEdit,
    desktopWeb,
    draft,
    flyoutOnLeft,
    flyoutOpen,
    language,
    mode,
    moveToProject,
    moveToTrash,
    openFlyoutOnHover,
    openMode,
    orderedProjects,
    scheduleFlyoutClose,
    setDraft,
    setPriority,
    setScheduledDate,
    setScheduledTime,
    submit,
  } = menu;
  const labels = translations[language];

  const backItem = (
    <MenuItem
      icon={<Ionicons color="#696A7A" name="chevron-back" size={17} />}
      label={labels.taskMenu.backToActions}
      onPress={closeMode}
    />
  );

  const renderBody = () => {
    if (mode === 'date') {
      return (
        <View style={styles.projectPicker}>
          {backItem}
          <View style={styles.divider} />
          <DatePicker
            language={language}
            labels={labels}
            onSelect={(dateKey) => setScheduledDate(todo, dateKey)}
            shortcuts
            value={todo.scheduledDate}
          />
        </View>
      );
    }
    if (mode === 'time') {
      return (
        <View style={styles.projectPicker}>
          {backItem}
          <View style={styles.divider} />
          <TaskTimePicker
            labels={labels}
            onSelect={(time) => setScheduledTime(todo, time)}
            value={todo.scheduledTime}
          />
        </View>
      );
    }
    if (mode === 'project') {
      return (
        <View style={styles.projectPicker}>
          {backItem}
          <View style={styles.divider} />
          <ProjectPickerList
            onSelect={(projectId) => moveToProject(todo, projectId)}
            projects={orderedProjects}
            selectedProjectId={todo.projectId}
          />
        </View>
      );
    }
    if (mode === 'rename' || mode === 'subtask') {
      const renaming = mode === 'rename';
      return (
        <TitleComposer
          accessibilityLabel={
            renaming
              ? labels.editor.titlePlaceholder
              : labels.taskMenu.subtaskPlaceholder
          }
          compact={compactEdit}
          confirmLabel={
            renaming
              ? labels.projects.confirmRename
              : labels.taskMenu.createSubtask
          }
          nativeID={
            renaming
              ? 'context-task-name-composer'
              : 'context-subtask-composer'
          }
          onChangeText={setDraft}
          onSubmit={() => submit(todo)}
          placeholder={
            renaming
              ? labels.editor.titlePlaceholder
              : labels.taskMenu.subtaskPlaceholder
          }
          value={draft}
          variant="popover"
        />
      );
    }

    return (
      <>
        <MenuItem
          label={labels.taskMenu.rename}
          onPress={() => openMode('rename', todo.title)}
        />
        <MenuItem
          icon={
            <Ionicons color="#6F7080" name="calendar-outline" size={16} />
          }
          label={`${labels.editor.dateLabel}: ${fromDateKey(
            todo.scheduledDate,
          ).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
            day: 'numeric',
            month: 'short',
          })}`}
          onPress={() => openMode('date')}
        />
        <MenuItem
          icon={<Ionicons color="#6F7080" name="time-outline" size={16} />}
          label={`${labels.editor.timeLabel}: ${todo.scheduledTime ?? labels.editor.allDay}`}
          onPress={() => openMode('time')}
        />
        <TaskPrioritySelector
          label={labels.taskMenu.priority}
          labels={labels.taskMenu.priorityOptions}
          onChange={(priority) => setPriority(todo, priority)}
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
              <Ionicons color="#6F7080" name="folder-outline" size={16} />
            }
            label={labels.taskMenu.moveToProject}
            onHoverIn={openFlyoutOnHover}
            onPress={() =>
              desktopWeb ? openFlyoutOnHover() : openMode('project')
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
              <ProjectPickerList
                onSelect={(projectId) => moveToProject(todo, projectId)}
                projects={orderedProjects}
                selectedProjectId={todo.projectId}
              />
            </View>
          ) : null}
        </View>
      </>
    );
  };

  return (
    <MenuSurface
      allowOverflow={desktopWeb}
      closeLabel={labels.cancel}
      estimatedHeight={
        mode === 'date'
          ? 460
          : mode === 'time'
            ? 350
            : mode === 'project'
              ? Math.min(370, 62 + orderedProjects.length * 44)
              : mode === 'rename' || mode === 'subtask'
                ? compactEdit
                  ? 164
                  : 118
                : 320
      }
      onClose={onClose}
      position={position}
      width={
        mode === 'rename' || mode === 'subtask'
          ? EDIT_MENU_WIDTH
          : MENU_WIDTH
      }
    >
      {renderBody()}
      {mode !== 'project' && mode !== 'date' && mode !== 'time' ? (
        <MenuItem
          danger
          label={labels.taskMenu.moveToTrash}
          onPress={() => moveToTrash(todo)}
        />
      ) : null}
    </MenuSurface>
  );
};

const styles = StyleSheet.create({
  projectPicker: {
    paddingBottom: 2,
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
  moveRow: {
    position: 'relative',
  },
});

export default TaskActionMenuDesktop;
