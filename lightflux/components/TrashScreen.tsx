import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { translations } from '../content';
import { DESKTOP_LAYOUT_BREAKPOINT } from '../config/layout';
import { useTodoStore } from '../store/todoStore';
import { fromDateKey } from '../utils/date';
import { useConfirmation } from './ui/ConfirmationProvider';

const TrashScreen = ({
  onPreviewTask,
  selectedTaskId,
}: {
  onPreviewTask: (id: string) => void;
  selectedTaskId: string | null;
}) => {
  const requestConfirmation = useConfirmation();
  const {
    language,
    trashedTodos,
    trashedMilestones,
    restoreTodo,
    restoreMilestone,
    deleteTodoPermanently,
    deleteMilestonePermanently,
    emptyTrash,
  } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      trashedTodos: state.trashedTodos,
      trashedMilestones: state.trashedMilestones,
      restoreTodo: state.restoreTodo,
      restoreMilestone: state.restoreMilestone,
      deleteTodoPermanently: state.deleteTodoPermanently,
      deleteMilestonePermanently: state.deleteMilestonePermanently,
      emptyTrash: state.emptyTrash,
    })),
  );
  const labels = translations[language];
  const { width } = useWindowDimensions();
  const compact = width < DESKTOP_LAYOUT_BREAKPOINT;
  const hasTrash =
    trashedTodos.length > 0 || trashedMilestones.length > 0;

  const requestPermanentDelete = (id: string) => {
    requestConfirmation({
      cancelText: labels.cancel,
      confirmText: labels.trash.deleteForever,
      message: labels.trash.deleteForeverMessage,
      onConfirm: () => deleteTodoPermanently(id),
      title: labels.trash.deleteForeverTitle,
    });
  };

  const requestPermanentMilestoneDelete = (id: string) => {
    requestConfirmation({
      cancelText: labels.cancel,
      confirmText: labels.trash.deleteForever,
      message: labels.trash.deleteMilestoneForeverMessage,
      onConfirm: () => deleteMilestonePermanently(id),
      title: labels.trash.deleteMilestoneForeverTitle,
    });
  };

  const requestEmptyTrash = () => {
    requestConfirmation({
      cancelText: labels.cancel,
      confirmText: labels.trash.emptyTrash,
      message: labels.trash.emptyTrashMessage,
      onConfirm: emptyTrash,
      title: labels.trash.emptyTrashTitle,
    });
  };

  return (
    <View className="flex-1 bg-canvas">
      <ExpoStatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={[
            styles.content,
            compact && styles.contentCompact,
          ]}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {!compact || hasTrash ? (
            <View className="flex-row items-center justify-between pb-5 pt-4">
              {!compact ? (
                <View>
                  <Text className="text-[24px] font-semibold text-ink">
                    {labels.trash.title}
                  </Text>
                </View>
              ) : (
                <View />
              )}
              <View className="flex-row items-center">
                {hasTrash ? (
                  <Pressable
                    accessibilityRole="button"
                    className="h-9 items-center justify-center rounded-[11px] border border-[#EACBD0] px-3"
                    onPress={requestEmptyTrash}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#FDF3F5' : 'transparent',
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text className="text-xs font-semibold text-[#C84F60]">
                      {labels.trash.emptyTrash}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {!hasTrash ? (
            <View className="min-h-[360px] items-center justify-center px-8">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-[24px] bg-[#EEEAF8]">
                <Text className="text-[28px] text-[#8479C4]">⌫</Text>
              </View>
              <Text className="text-[17px] font-semibold text-[#393A4D]">
                {labels.trash.emptyTitle}
              </Text>
            </View>
          ) : (
            <>
              {trashedTodos.length > 0 ? (
                <View className="mb-5">
                  <Text className="mb-2 px-1 text-[11px] font-semibold text-[#767786]">
                    {labels.trash.tasksSection} · {trashedTodos.length}
                  </Text>
                  {trashedTodos.map((todo) => (
                    <View
                      className={`mb-1 flex-row items-center rounded-[12px] px-3 py-2 ${
                        todo.parentId ? 'ml-6 min-h-[40px]' : 'min-h-[46px]'
                      } ${
                        selectedTaskId === todo.id
                          ? 'bg-[#F2F1FC]'
                          : 'border border-[#ECEAF1] bg-transparent'
                      }`}
                      key={todo.id}
                    >
                      {todo.parentId ? (
                        <Text className="mr-2 text-[13px] text-[#B6B7C2]">
                          ↳
                        </Text>
                      ) : null}
                      <Pressable
                        accessibilityLabel={`${labels.trash.preview}: ${todo.title}`}
                        accessibilityRole="button"
                        className="flex-1 py-0.5"
                        onPress={() => onPreviewTask(todo.id)}
                      >
                        <Text
                          className="text-[13px] font-semibold text-[#4B4C5D]"
                          numberOfLines={1}
                        >
                          {todo.title}
                        </Text>
                        <Text className="mt-0.5 text-[9px] text-[#9A9BA8]">
                          {fromDateKey(todo.scheduledDate).toLocaleDateString(
                            language === 'zh' ? 'zh-CN' : 'en-US',
                            { month: 'short', day: 'numeric' },
                          )}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`${labels.trash.restore}: ${todo.title}`}
                        accessibilityRole="button"
                        className="h-7 items-center justify-center rounded-[9px] bg-[#ECE9FF] px-2.5"
                        onPress={() => restoreTodo(todo.id)}
                      >
                        <Text className="text-[10px] font-semibold text-primary">
                          {labels.trash.restore}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`${labels.trash.deleteForever}: ${todo.title}`}
                        accessibilityRole="button"
                        className="ml-1.5 h-7 w-7 items-center justify-center rounded-[9px] bg-[#FCECEF]"
                        onPress={() => requestPermanentDelete(todo.id)}
                      >
                        <Text className="text-[12px] font-semibold text-[#C84F60]">
                          ×
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              {trashedMilestones.length > 0 ? (
                <View>
                  <Text className="mb-2 px-1 text-[11px] font-semibold text-[#767786]">
                    {labels.trash.milestonesSection} ·{' '}
                    {trashedMilestones.length}
                  </Text>
                  {trashedMilestones.map((milestone) => (
                    <View
                      className="mb-1 min-h-[52px] flex-row items-center rounded-[12px] border border-[#ECEAF1] px-3 py-2"
                      key={milestone.id}
                    >
                      <View
                        className="mr-2.5 h-8 w-8 items-center justify-center rounded-[10px]"
                        style={{ backgroundColor: `${milestone.color}20` }}
                      >
                        <Ionicons
                          color={milestone.color}
                          name={
                            milestone.icon as React.ComponentProps<
                              typeof Ionicons
                            >['name']
                          }
                          size={16}
                        />
                      </View>
                      <View className="flex-1 py-1">
                        <Text
                          className="text-[13px] font-semibold text-[#4B4C5D]"
                          numberOfLines={1}
                        >
                          {milestone.title}
                        </Text>
                        <Text className="mt-0.5 text-[9px] text-[#9A9BA8]">
                          {labels.milestones.templates[milestone.type]}
                          {milestone.dateRule.calendar === 'lunar'
                            ? ` · ${labels.milestones.lunarDate}`
                            : ''}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityLabel={`${labels.trash.restore}: ${milestone.title}`}
                        accessibilityRole="button"
                        className="h-7 items-center justify-center rounded-[9px] bg-[#ECE9FF] px-2.5"
                        onPress={() => restoreMilestone(milestone.id)}
                      >
                        <Text className="text-[10px] font-semibold text-primary">
                          {labels.trash.restore}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`${labels.trash.deleteForever}: ${milestone.title}`}
                        accessibilityRole="button"
                        className="ml-1.5 h-7 w-7 items-center justify-center rounded-[9px] bg-[#FCECEF]"
                        onPress={() =>
                          requestPermanentMilestoneDelete(milestone.id)
                        }
                      >
                        <Text className="text-[12px] font-semibold text-[#C84F60]">
                          ×
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
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
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  contentCompact: {
    paddingTop: 70,
  },
});

export default TrashScreen;
