import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { inputAccentProps } from '../config/input';
import { DESKTOP_LAYOUT_BREAKPOINT } from '../config/layout';
import ProjectActionMenu from './projects/ProjectActionMenu';
import ProjectSectionCard from './projects/ProjectSectionCard';
import { useProjectsController } from './projects/useProjectsController';
import { OpenTaskMenu } from './tasks/useTaskContextMenu';
import { useToast } from './ui/ToastProvider';
import { INBOX_PROJECT_ID } from '../types/todo';

const ProjectsScreen = ({
  onEditTask,
  onOpenTaskMenu,
  selectedTaskId,
}: {
  onEditTask: (id: string) => void;
  onOpenTaskMenu: OpenTaskMenu;
  selectedTaskId: string | null;
}) => {
  const notify = useToast();
  const controller = useProjectsController(selectedTaskId, notify);
  const { width } = useWindowDimensions();
  const compact = width < DESKTOP_LAYOUT_BREAKPOINT;

  return (
    <View style={styles.screen}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            compact && styles.contentCompact,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {!compact ? (
            <View className="flex-row items-center justify-between pb-5 pt-4">
              <Text className="text-[24px] font-extrabold text-ink">
                {controller.labels.projects.title}
              </Text>
            </View>
          ) : null}

          <View
            className="mb-5 flex-row rounded-[18px] border border-[#E7E6ED] bg-white p-1.5 pl-4"
            nativeID="project-name-composer"
            style={styles.cardShadow}
          >
            <TextInput
              {...inputAccentProps}
              accessibilityLabel={
                controller.labels.projects.projectPlaceholder
              }
              className="h-11 flex-1 text-[14px] text-[#303145]"
              onChangeText={controller.setProjectDraft}
              onSubmitEditing={controller.submitProject}
              placeholder={controller.labels.projects.projectPlaceholder}
              placeholderTextColor="#A0A1AD"
              returnKeyType="done"
              value={controller.projectDraft}
            />
            <Pressable
              accessibilityLabel={controller.labels.projects.addProject}
              accessibilityRole="button"
              className={`h-11 items-center justify-center rounded-[13px] px-4 ${
                controller.projectDraft.trim() ? 'bg-primary' : 'bg-[#C9C6DD]'
              }`}
              disabled={!controller.projectDraft.trim()}
              onPress={controller.submitProject}
            >
              <Text className="text-xs font-extrabold text-white">
                ＋ {controller.labels.projects.addProject}
              </Text>
            </Pressable>
          </View>

          {controller.sections.map((section) => (
            <ProjectSectionCard
              activeComposer={controller.activeComposer}
              childCountByParent={controller.childCountByParent}
              expanded={controller.expanded[section.id] ?? false}
              inlineComposer={controller.inlineComposer}
              inlineDraft={controller.inlineDraft}
              key={section.id}
              labels={controller.labels}
              onCancelInlineComposer={controller.cancelInlineComposer}
              onCancelTaskComposer={controller.cancelTaskComposer}
              onEditTask={onEditTask}
              onInlineDraftChange={controller.setInlineDraft}
              onMoveTask={controller.moveTask}
              onOpenProjectMenu={controller.openProjectMenu}
              onOpenInlineComposer={controller.openInlineComposer}
              onOpenTaskComposer={() => controller.openComposer(section.id)}
              onOpenTaskMenu={onOpenTaskMenu}
              onRenameTask={controller.renameTask}
              onSubmitInlineTask={controller.submitInlineTask}
              onSubmitTask={() => controller.submitTask(section.id)}
              onTaskDraftChange={controller.setTaskDraft}
              onToggle={() => controller.toggleProject(section.id)}
              onToggleTask={controller.toggleTodo}
              section={section}
              selected={controller.projectMenu?.sectionId === section.id}
              selectedTaskId={selectedTaskId}
              siblingIndexById={controller.siblingIndexById}
              taskDraft={controller.taskDraft}
            />
          ))}
        </ScrollView>
      </SafeAreaView>

      {controller.projectMenu && controller.activeMenuSection ? (
        <ProjectActionMenu
          canDelete={controller.activeMenuSection.id !== INBOX_PROJECT_ID}
          projectName={controller.activeMenuSection.name}
          onAdd={controller.addProjectNear}
          onClose={controller.closeProjectMenu}
          onDelete={controller.deleteActiveProject}
          onRename={controller.renameActiveProject}
          position={controller.projectMenu.position}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F5FA',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    alignSelf: 'center',
    maxWidth: 760,
    width: '100%',
  },
  content: {
    paddingBottom: 26,
    paddingHorizontal: 20,
  },
  contentCompact: {
    paddingTop: 70,
  },
  cardShadow: {
    shadowColor: '#4B4963',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
});

export default ProjectsScreen;
