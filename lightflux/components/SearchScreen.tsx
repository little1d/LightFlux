import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../config/input';
import { translations } from '../i18n/translations';
import { buildChildCountByParent } from '../store/todoDomain';
import { useTodoStore } from '../store/todoStore';
import { Todo } from '../types/todo';
import { fromDateKey } from '../utils/date';
import { richTextPreview } from '../utils/richText';
import TaskIndicators from './tasks/TaskIndicators';
import {
  TaskCheckbox,
  TaskMoreButton,
  TaskNestingIndicator,
} from './tasks/TaskRowControls';
import TaskSelectionMarker from './tasks/TaskSelectionMarker';
import {
  OpenTaskMenu,
  useTaskContextMenu,
} from './tasks/useTaskContextMenu';

const HighlightedText = ({
  query,
  text,
}: {
  query: string;
  text: string;
}) => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return <>{text}</>;
  }

  const parts: React.ReactNode[] = [];
  const normalizedText = text.toLocaleLowerCase();
  let offset = 0;
  let matchIndex = normalizedText.indexOf(normalizedQuery);

  while (matchIndex >= 0) {
    if (matchIndex > offset) {
      parts.push(text.slice(offset, matchIndex));
    }
    parts.push(
      <Text
        className="rounded-sm bg-[#FFE8A3] text-[#343548]"
        key={`${matchIndex}-${text.slice(matchIndex, matchIndex + normalizedQuery.length)}`}
      >
        {text.slice(matchIndex, matchIndex + normalizedQuery.length)}
      </Text>,
    );
    offset = matchIndex + normalizedQuery.length;
    matchIndex = normalizedText.indexOf(normalizedQuery, offset);
  }

  if (offset < text.length) {
    parts.push(text.slice(offset));
  }

  return <>{parts}</>;
};

interface SearchTaskRowProps {
  childCount: number;
  groupName?: string;
  onEdit: (id: string) => void;
  onOpenMenu: OpenTaskMenu;
  onToggle: (id: string) => void;
  query: string;
  selected: boolean;
  todo: Todo;
}

const SearchTaskRow = ({
  childCount,
  groupName,
  onEdit,
  onOpenMenu,
  onToggle,
  query,
  selected,
  todo,
}: SearchTaskRowProps) => {
  const language = useTodoStore((state) => state.language);
  const labels = translations[language];
  const { targetRef, openFromButton, openFromLongPress } = useTaskContextMenu(
    todo.id,
    onOpenMenu,
  );
  const preview = richTextPreview(todo.content, 120);

  return (
    <View
      className={`${todo.parentId ? 'ml-6 min-h-[44px]' : 'min-h-[54px]'} flex-row items-center border-b px-2 ${
        selected
          ? 'border-[#D6D2EF] bg-[#EEECFF]'
          : 'border-[#ECEBF1] bg-transparent'
      }`}
      ref={targetRef}
    >
      <TaskSelectionMarker visible={selected} />
      {todo.parentId ? <TaskNestingIndicator /> : null}
      <TaskCheckbox
        completed={todo.completed}
        markActive={labels.markActive}
        markComplete={labels.markComplete}
        onPress={() => onToggle(todo.id)}
        uncheckedBorderColor="#BFC1CB"
      />

      <Pressable
        accessibilityLabel={`${labels.editor.title}: ${todo.title}`}
        accessibilityRole="button"
        className="ml-2.5 flex-1 py-2"
        delayLongPress={350}
        onLongPress={openFromLongPress}
        onPress={() => onEdit(todo.id)}
      >
        <Text
          className={`text-[14px] font-semibold leading-[19px] ${
            todo.completed
              ? 'text-[#999AAA] line-through'
              : 'text-[#303145]'
          }`}
          numberOfLines={1}
        >
          <HighlightedText query={query} text={todo.title} />
        </Text>
        {preview ? (
          <Text
            className="mt-0.5 text-[10px] leading-4 text-[#858695]"
            numberOfLines={1}
          >
            <HighlightedText query={query} text={preview} />
          </Text>
        ) : null}
        <Text className="mt-0.5 text-[9px] text-[#A0A1AD]">
          {fromDateKey(todo.scheduledDate).toLocaleDateString(
            language === 'zh' ? 'zh-CN' : 'en-US',
            { month: 'short', day: 'numeric' },
          )}
          {groupName ? ` · ${groupName}` : ''}
        </Text>
      </Pressable>

      <TaskIndicators childCount={childCount} todo={todo} />
      <TaskMoreButton
        label={labels.taskMenu.moreActions}
        onPress={openFromButton}
      />
    </View>
  );
};

const SearchScreen = ({
  onEditTask,
  onOpenTaskMenu,
  selectedTaskId,
}: {
  onEditTask: (id: string) => void;
  onOpenTaskMenu: OpenTaskMenu;
  selectedTaskId: string | null;
}) => {
  const {
    language,
    todos,
    groups,
    toggleTodo,
  } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      todos: state.todos,
      groups: state.groups,
      toggleTodo: state.toggleTodo,
    })),
  );
  const labels = translations[language];
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const groupNames = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  );
  const childCountByParent = useMemo(
    () => buildChildCountByParent(todos),
    [todos],
  );
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return todos.filter((todo) => {
      const searchableText = [
        todo.title,
        richTextPreview(todo.content, Number.MAX_SAFE_INTEGER),
        groupNames.get(todo.groupId ?? '') ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [groupNames, normalizedQuery, todos]);

  const header = (
    <>
      <View className="flex-row items-center justify-between pb-5 pt-4">
        <View>
          <Text className="text-[24px] font-extrabold text-ink">
            {labels.search.title}
          </Text>
        </View>
      </View>

      <View
        className="mb-4 flex-row items-center rounded-[17px] border border-[#DEDDE6] bg-white px-4"
        nativeID="task-search-input"
        style={styles.searchShadow}
      >
        <Ionicons color="#777987" name="search-outline" size={21} />
        <TextInput
          {...inputAccentProps}
          accessibilityLabel={labels.search.placeholder}
          autoFocus={Platform.OS === 'web'}
          className="ml-2 h-[52px] flex-1 py-3.5 text-[15px] text-[#292A3D]"
          onChangeText={setQuery}
          placeholder={labels.search.placeholder}
          placeholderTextColor="#999BA8"
          returnKeyType="search"
          value={query}
        />
        {query ? (
          <Pressable
            accessibilityLabel={labels.search.clear}
            accessibilityRole="button"
            className="h-8 w-8 items-center justify-center rounded-[16px] bg-[#ECEBF1]"
            onPress={() => setQuery('')}
          >
            <Text className="text-[14px] font-bold text-[#777987]">×</Text>
          </Pressable>
        ) : null}
      </View>

      {normalizedQuery ? (
        <Text className="mb-2 px-1 text-[11px] font-bold text-[#858695]">
          {labels.search.resultCount(results.length)}
        </Text>
      ) : null}
    </>
  );

  return (
    <View className="flex-1 bg-canvas">
      <ExpoStatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <FlatList
          contentContainerStyle={styles.content}
          data={results}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(todo) => todo.id}
          ListEmptyComponent={
            <View className="min-h-[360px] items-center justify-center px-8">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-[20px] bg-[#ECE9FF]">
                <Ionicons color="#7468DC" name="search-outline" size={25} />
              </View>
              <Text className="text-[17px] font-extrabold text-[#393A4D]">
                {normalizedQuery
                  ? labels.search.emptyTitle
                  : labels.search.idleTitle}
              </Text>
              <Text className="mt-2 max-w-[340px] text-center text-[13px] leading-5 text-[#8A8C9A]">
                {normalizedQuery
                  ? labels.search.emptyDescription
                  : labels.search.idleDescription}
              </Text>
            </View>
          }
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <SearchTaskRow
              childCount={childCountByParent.get(item.id) ?? 0}
              groupName={groupNames.get(item.groupId ?? '')}
              onEdit={onEditTask}
              onOpenMenu={onOpenTaskMenu}
              onToggle={toggleTodo}
              query={query}
              selected={selectedTaskId === item.id}
              todo={item}
            />
          )}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    alignSelf: 'center',
    maxWidth: 860,
    width: '100%',
  },
  content: {
    flexGrow: 1,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  searchShadow: {
    shadowColor: '#45435F',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
});

export default SearchScreen;
