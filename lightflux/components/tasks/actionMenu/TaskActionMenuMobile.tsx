import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { translations } from '../../../content';
import type { Todo } from '../../../types/todo';
import { fromDateKey } from '../../../utils/date';
import DatePicker from '../../ui/DatePicker';
import MenuItem from '../../ui/MenuItem';
import MenuSurface from '../../ui/MenuSurface';
import { TASK_PRIORITY_THEME } from '../TaskPriorityIndicator';
import TaskTimePicker from '../TaskTimePicker';
import MobileAction from './MobileAction';
import PriorityPickerList from './PriorityPickerList';
import ProjectPickerList from './ProjectPickerList';
import TaskSheetHeader from './TaskSheetHeader';
import TitleComposer from './TitleComposer';
import type useTaskActionMenu from './useTaskActionMenu';

interface TaskActionMenuMobileProps {
  todo: Todo;
  menu: ReturnType<typeof useTaskActionMenu>;
  onClose: () => void;
}

/** The bottom-sheet presentation of the task action menu. */
const TaskActionMenuMobile = ({
  todo,
  menu,
  onClose,
}: TaskActionMenuMobileProps) => {
  const {
    closeMode,
    compactEdit,
    draft,
    language,
    mode,
    moveToProject,
    moveToTrash,
    openMode,
    orderedProjects,
    setDraft,
    setPriority,
    setScheduledDate,
    setScheduledTime,
    submit,
  } = menu;
  const labels = translations[language];

  const header = (title: string, back = false) => (
    <TaskSheetHeader
      back={back}
      backLabel={labels.taskMenu.backToActions}
      closeLabel={labels.cancel}
      onBack={closeMode}
      onClose={onClose}
      title={title}
    />
  );

  const renderContent = () => {
    if (mode === 'date') {
      return (
        <>
          {header(labels.editor.dateLabel, true)}
          <DatePicker
            language={language}
            labels={labels}
            onSelect={(dateKey) => setScheduledDate(todo, dateKey)}
            shortcuts
            value={todo.scheduledDate}
          />
        </>
      );
    }
    if (mode === 'time') {
      return (
        <>
          {header(labels.editor.timeLabel, true)}
          <TaskTimePicker
            labels={labels}
            onSelect={(time) => setScheduledTime(todo, time)}
            value={todo.scheduledTime}
          />
        </>
      );
    }
    if (mode === 'project') {
      return (
        <>
          {header(labels.taskMenu.moveToProject, true)}
          <ProjectPickerList
            mobile
            onSelect={(projectId) => moveToProject(todo, projectId)}
            projects={orderedProjects}
            selectedProjectId={todo.projectId}
          />
        </>
      );
    }
    if (mode === 'priority') {
      return (
        <>
          {header(labels.taskMenu.priority, true)}
          <PriorityPickerList
            labels={labels.taskMenu.priorityOptions}
            onSelect={(priority) => setPriority(todo, priority)}
            value={todo.priority}
          />
        </>
      );
    }
    if (mode === 'rename' || mode === 'subtask') {
      const renaming = mode === 'rename';
      return (
        <>
          {header(
            renaming ? labels.taskMenu.rename : labels.taskMenu.addSubtask,
            true,
          )}
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
            onChangeText={setDraft}
            onSubmit={() => submit(todo)}
            placeholder={
              renaming
                ? labels.editor.titlePlaceholder
                : labels.taskMenu.subtaskPlaceholder
            }
            value={draft}
            variant="sheet"
          />
        </>
      );
    }

    const projectName =
      orderedProjects.find((project) => project.id === todo.projectId)?.name ??
      labels.projects.inbox;
    const dateLabel = fromDateKey(todo.scheduledDate).toLocaleDateString(
      language === 'zh' ? 'zh-CN' : 'en-US',
      { day: 'numeric', month: 'short' },
    );
    const priorityTheme = TASK_PRIORITY_THEME[todo.priority];

    return (
      <>
        {header(todo.title)}
        <View style={styles.mobileActions}>
          <MobileAction
            icon="calendar-outline"
            label={labels.editor.dateLabel}
            onPress={() => openMode('date')}
            value={dateLabel}
          />
          <MobileAction
            icon="time-outline"
            label={labels.editor.timeLabel}
            onPress={() => openMode('time')}
            value={todo.scheduledTime ?? labels.editor.allDay}
          />
          <MobileAction
            icon="folder-outline"
            label={labels.editor.projectLabel}
            onPress={() => openMode('project')}
            value={projectName}
          />
          <MobileAction
            icon="flag-outline"
            label={labels.taskMenu.priority}
            onPress={() => openMode('priority')}
            tint={todo.priority === 'none' ? '#6759E8' : priorityTheme.color}
            value={labels.taskMenu.priorityOptions[todo.priority]}
          />
        </View>
        <View style={styles.sheetDivider} />
        <MenuItem
          icon={<Ionicons color="#6F7080" name="pencil-outline" size={17} />}
          label={labels.taskMenu.rename}
          onPress={() => openMode('rename', todo.title)}
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
          onPress={() => moveToTrash(todo)}
        />
      </>
    );
  };

  return (
    <MenuSurface
      closeLabel={labels.cancel}
      estimatedHeight={
        mode === 'date'
          ? 540
          : mode === 'project'
            ? Math.min(520, 80 + orderedProjects.length * 44)
            : mode === 'time'
              ? 370
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
          {renderContent()}
        </ScrollView>
      ) : (
        renderContent()
      )}
    </MenuSurface>
  );
};

const styles = StyleSheet.create({
  mobileActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  mobileSheetContent: {
    paddingBottom: 6,
  },
  mobileSheetScroll: {
    flexShrink: 1,
  },
  sheetDivider: {
    backgroundColor: '#ECEBF1',
    height: 1,
    marginVertical: 7,
  },
});

export default TaskActionMenuMobile;
