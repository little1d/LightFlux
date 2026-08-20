import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../config/input';
import { translations } from '../content';
import { buildChildCountByParent } from '../store/todoDomain';
import { useTodoStore } from '../store/todoStore';
import { Todo } from '../types/todo';
import { fromDateKey } from '../utils/date';
import { richTextPreview } from '../utils/richText';
import TaskIndicators from './tasks/TaskIndicators';
import {
  TaskCheckbox,
  TaskNestingIndicator,
} from './tasks/TaskRowControls';
import TaskSelectionMarker from './tasks/TaskSelectionMarker';
import IconButton from './ui/IconButton';

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
        key={`${matchIndex}-${text.slice(matchIndex, matchIndex + normalizedQuery.length)}`}
        style={styles.highlight}
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

interface SearchResultRowProps {
  childCount: number;
  groupName?: string;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  query: string;
  selected: boolean;
  todo: Todo;
}

const SearchResultRow = ({
  childCount,
  groupName,
  onOpen,
  onToggle,
  query,
  selected,
  todo,
}: SearchResultRowProps) => {
  const language = useTodoStore((state) => state.language);
  const labels = translations[language];
  const preview = richTextPreview(todo.content, 140);

  return (
    <View
      style={[
        styles.resultRow,
        todo.parentId && styles.childResultRow,
        selected && styles.resultRowSelected,
      ]}
    >
      <TaskSelectionMarker visible={selected} />
      {todo.parentId ? <TaskNestingIndicator /> : null}
      <TaskCheckbox
        completed={todo.completed}
        markActive={labels.markActive}
        markComplete={labels.markComplete}
        onPress={() => onToggle(todo.id)}
        uncheckedBorderColor="#C2C3CD"
      />
      <Pressable
        accessibilityLabel={`${labels.editor.title}: ${todo.title}`}
        accessibilityRole="button"
        onPress={() => onOpen(todo.id)}
        style={({ pressed }) => [
          styles.resultContent,
          pressed && styles.resultPressed,
        ]}
      >
        <View style={styles.resultTitleRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.resultTitle,
              todo.completed && styles.resultTitleCompleted,
            ]}
          >
            <HighlightedText query={query} text={todo.title} />
          </Text>
          {groupName ? (
            <Text numberOfLines={1} style={styles.groupName}>
              {groupName}
            </Text>
          ) : null}
        </View>
        {preview ? (
          <Text numberOfLines={1} style={styles.preview}>
            <HighlightedText query={query} text={preview} />
          </Text>
        ) : null}
        <Text style={styles.date}>
          {fromDateKey(todo.scheduledDate).toLocaleDateString(
            language === 'zh' ? 'zh-CN' : 'en-US',
            { month: 'short', day: 'numeric' },
          )}
        </Text>
      </Pressable>
      <TaskIndicators childCount={childCount} todo={todo} />
    </View>
  );
};

interface SearchOverlayProps {
  onClose: () => void;
  onOpenTask: (id: string) => void;
  selectedTaskId: string | null;
  visible: boolean;
}

const SearchOverlay = ({
  onClose,
  onOpenTask,
  selectedTaskId,
  visible,
}: SearchOverlayProps) => {
  const { language, todos, groups, toggleTodo } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      todos: state.todos,
      groups: state.groups,
      toggleTodo: state.toggleTodo,
    })),
  );
  const labels = translations[language];
  const inputRef = useRef<TextInput>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const nativeWorkspace = Platform.OS !== 'web';
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
    return todos.filter((todo) =>
      [
        todo.title,
        richTextPreview(todo.content, Number.MAX_SAFE_INTEGER),
        groupNames.get(todo.groupId ?? '') ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [groupNames, normalizedQuery, todos]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    setQuery('');
    progress.setValue(0);
    Animated.timing(progress, {
      duration: 140,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(focusTimer);
  }, [progress, visible]);

  if (!visible) {
    return null;
  }

  const openTask = (id: string) => {
    onOpenTask(id);
    onClose();
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible
    >
      <View style={styles.overlay}>
        {!nativeWorkspace ? (
          <Pressable
            accessibilityLabel={labels.search.close}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <SafeAreaView
          edges={nativeWorkspace ? ['top', 'bottom'] : []}
          style={
            nativeWorkspace
              ? styles.nativePosition
              : compact
                ? styles.compactPosition
                : styles.desktopPosition
          }
        >
          <Animated.View
            accessibilityLabel={labels.search.title}
            accessibilityViewIsModal
            style={[
              styles.panel,
              nativeWorkspace
                ? styles.nativePanel
                : compact
                  ? styles.compactPanel
                  : styles.desktopPanel,
              {
                opacity: progress,
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                    outputRange: [nativeWorkspace ? 8 : compact ? 18 : -8, 0],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                    outputRange: [nativeWorkspace ? 1 : 0.985, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.searchBar}>
              <Ionicons color="#7D7F8D" name="search-outline" size={24} />
              <TextInput
                {...inputAccentProps}
                accessibilityLabel={labels.search.placeholder}
                autoFocus
                onChangeText={setQuery}
                onSubmitEditing={() => {
                  if (results[0]) {
                    openTask(results[0].id);
                  }
                }}
                placeholder={labels.search.placeholder}
                placeholderTextColor="#9698A5"
                ref={inputRef}
                returnKeyType="search"
                style={styles.input}
                value={query}
              />
              {query ? (
                <IconButton
                  icon="close-circle"
                  label={labels.search.clear}
                  onPress={() => setQuery('')}
                  size="small"
                  tooltipPosition="bottom"
                  variant="transparent"
                />
              ) : null}
              <View style={styles.closeButtonDivider}>
                <IconButton
                  icon="close"
                  label={labels.search.close}
                  onPress={onClose}
                  size="small"
                  tooltipPosition="bottom"
                  variant="transparent"
                />
              </View>
            </View>

            {normalizedQuery ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{labels.search.tasks}</Text>
                <Text style={styles.resultCount}>{results.length}</Text>
              </View>
            ) : null}

            <FlatList
              contentContainerStyle={[
                styles.listContent,
                results.length === 0 && styles.emptyListContent,
              ]}
              data={results}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(todo) => todo.id}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      color="#7468DC"
                      name="search-outline"
                      size={25}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {normalizedQuery
                      ? labels.search.emptyTitle
                      : labels.search.idleTitle}
                  </Text>
                  <Text style={styles.emptyDescription}>
                    {normalizedQuery
                      ? labels.search.emptyDescription
                      : labels.search.idleDescription}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <SearchResultRow
                  childCount={childCountByParent.get(item.id) ?? 0}
                  groupName={groupNames.get(item.groupId ?? '')}
                  onOpen={openTask}
                  onToggle={toggleTodo}
                  query={query}
                  selected={selectedTaskId === item.id}
                  todo={item}
                />
              )}
              showsVerticalScrollIndicator={false}
              style={styles.list}
            />
            {!compact ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>{labels.search.shortcut}</Text>
              </View>
            ) : null}
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(31, 30, 43, 0.24)',
    flex: 1,
  },
  desktopPosition: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 96,
    pointerEvents: 'box-none',
    zIndex: 1,
  },
  compactPosition: {
    flex: 1,
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
    zIndex: 1,
  },
  nativePosition: {
    backgroundColor: '#F6F5F8',
    flex: 1,
    zIndex: 1,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E0E8',
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#252336',
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 34,
  },
  desktopPanel: {
    borderRadius: 20,
    maxHeight: '72%',
    maxWidth: 760,
    minHeight: 320,
    width: '100%',
  },
  compactPanel: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    minHeight: 420,
    width: '100%',
  },
  nativePanel: {
    borderColor: 'transparent',
    borderRadius: 0,
    flex: 1,
    maxHeight: undefined,
    minHeight: undefined,
    shadowOpacity: 0,
    width: '100%',
  },
  searchBar: {
    alignItems: 'center',
    borderBottomColor: '#D8D4F8',
    borderBottomWidth: 2,
    flexDirection: 'row',
    marginHorizontal: 22,
    minHeight: 70,
  },
  input: {
    color: '#292A3D',
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    minHeight: 56,
    paddingVertical: 14,
  },
  closeButtonDivider: {
    borderLeftColor: '#ECEBF1',
    borderLeftWidth: 1,
    marginLeft: 5,
    paddingLeft: 5,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  sectionTitle: {
    color: '#3C3D4F',
    fontSize: 12,
    fontWeight: '800',
  },
  resultCount: {
    color: '#9A9BA7',
    fontSize: 11,
    marginLeft: 7,
  },
  list: {
    flexShrink: 1,
  },
  listContent: {
    paddingBottom: 8,
    paddingHorizontal: 14,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 230,
    padding: 28,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#ECE9FF',
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    marginBottom: 13,
    width: 52,
  },
  emptyTitle: {
    color: '#393A4D',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyDescription: {
    color: '#8A8C9A',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    maxWidth: 360,
    textAlign: 'center',
  },
  resultRow: {
    alignItems: 'center',
    borderBottomColor: '#ECEBF1',
    borderBottomWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 10,
  },
  childResultRow: {
    marginLeft: 20,
  },
  resultRowSelected: {
    backgroundColor: '#F0EEFF',
    borderBottomColor: '#D8D3F5',
  },
  resultContent: {
    flex: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  resultPressed: {
    opacity: 0.68,
  },
  resultTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  resultTitle: {
    color: '#303145',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  resultTitleCompleted: {
    color: '#999AAA',
    textDecorationLine: 'line-through',
  },
  groupName: {
    color: '#A0A1AC',
    fontSize: 10,
    marginLeft: 12,
    maxWidth: 120,
  },
  preview: {
    color: '#777987',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },
  date: {
    color: '#AAABB5',
    fontSize: 9,
    marginTop: 2,
  },
  highlight: {
    backgroundColor: '#FFE4A3',
    color: '#343548',
  },
  footer: {
    alignItems: 'center',
    borderTopColor: '#F0EFF4',
    borderTopWidth: 1,
    minHeight: 38,
    paddingHorizontal: 18,
  },
  footerText: {
    color: '#A0A1AC',
    fontSize: 10,
    paddingVertical: 11,
  },
});

export default SearchOverlay;
