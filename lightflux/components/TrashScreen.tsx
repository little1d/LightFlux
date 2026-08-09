import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTodos } from '../context/TodoContext';
import { translations } from '../i18n/translations';
import { requestConfirmation } from '../utils/confirm';
import { fromDateKey } from '../utils/date';

const TrashScreen = ({
  onPreviewTask,
  selectedTaskId,
}: {
  onPreviewTask: (id: string) => void;
  selectedTaskId: string | null;
}) => {
  const {
    language,
    trashedTodos,
    restoreTodo,
    deleteTodoPermanently,
    emptyTrash,
  } = useTodos();
  const labels = translations[language];

  const requestPermanentDelete = (id: string) => {
    requestConfirmation({
      cancelText: labels.cancel,
      confirmText: labels.trash.deleteForever,
      message: labels.trash.deleteForeverMessage,
      onConfirm: () => deleteTodoPermanently(id),
      title: labels.trash.deleteForeverTitle,
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
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View className="flex-row items-center justify-between pb-5 pt-4">
            <View>
              <Text className="text-[24px] font-extrabold text-ink">
                {labels.trash.title}
              </Text>
              <Text className="mt-1 text-xs text-[#858797]">
                {labels.trash.subtitle}
              </Text>
            </View>
            <View className="flex-row items-center">
              {trashedTodos.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  className="mr-2 h-9 items-center justify-center rounded-[13px] bg-[#FCECEF] px-3"
                  onPress={requestEmptyTrash}
                >
                  <Text className="text-xs font-extrabold text-[#C84F60]">
                    {labels.trash.emptyTrash}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {trashedTodos.length === 0 ? (
            <View className="min-h-[360px] items-center justify-center rounded-[24px] border border-[#E6E5EC] bg-white px-8">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-[24px] bg-[#EEEAF8]">
                <Text className="text-[28px] text-[#8479C4]">⌫</Text>
              </View>
              <Text className="text-[17px] font-extrabold text-[#393A4D]">
                {labels.trash.emptyTitle}
              </Text>
              <Text className="mt-2 text-center text-[13px] leading-5 text-[#8A8C9A]">
                {labels.trash.emptyDescription}
              </Text>
            </View>
          ) : (
            trashedTodos.map((todo) => (
              <View
                className={`mb-1 flex-row items-center rounded-[12px] border px-3 py-1.5 ${
                  todo.parentId ? 'ml-6 min-h-[40px]' : 'min-h-[48px]'
                } ${
                  selectedTaskId === todo.id
                    ? 'border-[#D5D1EF] bg-[#EFEDFA]'
                    : 'border-[#E9E8EE] bg-white'
                }`}
                key={todo.id}
              >
                {todo.parentId ? (
                  <View className="mr-2 h-5 w-5 items-center justify-center">
                    <Text className="text-[13px] text-[#9492A1]">↳</Text>
                  </View>
                ) : (
                  <View className="mr-2 h-6 w-6 items-center justify-center rounded-[8px] bg-[#F2F0F7]">
                    <Text className="text-[12px] text-[#858393]">⌫</Text>
                  </View>
                )}
                <Pressable
                  accessibilityLabel={`${labels.trash.preview}: ${todo.title}`}
                  accessibilityRole="button"
                  className="flex-1 py-1"
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
                  <Text className="text-[10px] font-extrabold text-primary">
                    {labels.trash.restore}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`${labels.trash.deleteForever}: ${todo.title}`}
                  accessibilityRole="button"
                  className="ml-1.5 h-7 items-center justify-center rounded-[9px] bg-[#FCECEF] px-2.5"
                  onPress={() => requestPermanentDelete(todo.id)}
                >
                  <Text className="text-[10px] font-extrabold text-[#C84F60]">
                    {labels.trash.deleteForever}
                  </Text>
                </Pressable>
              </View>
            ))
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
  cardShadow: {
    shadowColor: '#4B4963',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
});

export default TrashScreen;
