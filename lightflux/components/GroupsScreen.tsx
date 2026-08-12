import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { inputAccentProps } from '../config/input';
import GroupActionMenu from './groups/GroupActionMenu';
import GroupSectionCard from './groups/GroupSectionCard';
import { UNGROUPED_ID } from './groups/types';
import { useGroupsController } from './groups/useGroupsController';
import { OpenTaskMenu } from './tasks/useTaskContextMenu';
import Toast from './ui/Toast';

const GroupsScreen = ({
  onEditTask,
  onOpenTaskMenu,
  selectedTaskId,
}: {
  onEditTask: (id: string) => void;
  onOpenTaskMenu: OpenTaskMenu;
  selectedTaskId: string | null;
}) => {
  const controller = useGroupsController(selectedTaskId);

  return (
    <View className="flex-1 bg-canvas">
      <ExpoStatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View className="flex-row items-center justify-between pb-5 pt-4">
            <Text className="text-[24px] font-extrabold text-ink">
              {controller.labels.groups.title}
            </Text>
          </View>

          <View
            className="mb-5 flex-row rounded-[18px] border border-[#E7E6ED] bg-white p-1.5 pl-4"
            nativeID="group-name-composer"
            style={styles.cardShadow}
          >
            <TextInput
              {...inputAccentProps}
              accessibilityLabel={
                controller.labels.groups.groupPlaceholder
              }
              className="h-11 flex-1 text-[14px] text-[#303145]"
              onChangeText={controller.setGroupDraft}
              onSubmitEditing={controller.submitGroup}
              placeholder={controller.labels.groups.groupPlaceholder}
              placeholderTextColor="#A0A1AD"
              returnKeyType="done"
              value={controller.groupDraft}
            />
            <Pressable
              accessibilityLabel={controller.labels.groups.addGroup}
              accessibilityRole="button"
              className={`h-11 items-center justify-center rounded-[13px] px-4 ${
                controller.groupDraft.trim() ? 'bg-primary' : 'bg-[#C9C6DD]'
              }`}
              disabled={!controller.groupDraft.trim()}
              onPress={controller.submitGroup}
            >
              <Text className="text-xs font-extrabold text-white">
                ＋ {controller.labels.groups.addGroup}
              </Text>
            </Pressable>
          </View>

          {controller.sections.map((section) => (
            <GroupSectionCard
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
              onOpenGroupMenu={controller.openGroupMenu}
              onOpenInlineComposer={controller.openInlineComposer}
              onOpenTaskComposer={() => controller.openComposer(section.id)}
              onOpenTaskMenu={onOpenTaskMenu}
              onRenameTask={controller.renameTask}
              onSubmitInlineTask={controller.submitInlineTask}
              onSubmitTask={() => controller.submitTask(section.id)}
              onTaskDraftChange={controller.setTaskDraft}
              onToggle={() => controller.toggleGroup(section.id)}
              onToggleTask={controller.toggleTodo}
              section={section}
              selected={controller.groupMenu?.sectionId === section.id}
              selectedTaskId={selectedTaskId}
              siblingIndexById={controller.siblingIndexById}
              taskDraft={controller.taskDraft}
            />
          ))}
        </ScrollView>
      </SafeAreaView>

      {controller.groupMenu && controller.activeMenuSection ? (
        <GroupActionMenu
          groupId={
            controller.activeMenuSection.id === UNGROUPED_ID
              ? null
              : controller.activeMenuSection.id
          }
          groupName={controller.activeMenuSection.name}
          onAdd={controller.addGroupNear}
          onClose={controller.closeGroupMenu}
          onDelete={controller.deleteActiveGroup}
          onRename={controller.renameActiveGroup}
          position={controller.groupMenu.position}
        />
      ) : null}

      {controller.toast ? (
        <Toast
          key={controller.toast.id}
          message={controller.toast.message}
          onDismiss={controller.dismissToast}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    alignSelf: 'center',
    maxWidth: 760,
    width: '100%',
  },
  content: {
    paddingBottom: 26,
    paddingHorizontal: 20,
  },
  cardShadow: {
    shadowColor: '#4B4963',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
});

export default GroupsScreen;
