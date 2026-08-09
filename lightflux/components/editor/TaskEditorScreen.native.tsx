import {
  RichText,
  TenTapStartKit,
  useEditorBridge,
} from '@10play/tentap-editor';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { inputAccentProps } from '../../config/input';
import { useTodos } from '../../context/TodoContext';
import { editorHtml } from '../../editor-web/build/editorHtml';
import { translations } from '../../i18n/translations';
import { RichTextDocument } from '../../types/todo';
import { fromDateKey } from '../../utils/date';
import { CodeBlockBridge } from './CodeBlockBridge';
import { TaskEditorScreenProps } from './TaskEditorScreen.types';

const TaskEditorScreen = ({
  todoId,
  onClose,
  readOnly = false,
}: TaskEditorScreenProps) => {
  const {
    language,
    todos,
    trashedTodos,
    groups,
    updateTodo,
  } = useTodos();
  const labels = translations[language];
  const todo = (readOnly ? trashedTodos : todos).find(
    (item) => item.id === todoId,
  );
  const [title, setTitle] = useState(todo?.title ?? '');
  const [titleError, setTitleError] = useState('');
  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    bridgeExtensions: [...TenTapStartKit, CodeBlockBridge],
    customSource: editorHtml,
    editable: !readOnly,
    initialContent: todo?.content,
    theme: {
      webview: {
        backgroundColor: '#FFFFFF',
      },
      webviewContainer: {
        backgroundColor: '#FFFFFF',
      },
    },
  });

  const groupName = useMemo(
    () => groups.find((group) => group.id === todo?.groupId)?.name,
    [groups, todo?.groupId],
  );

  if (!todo) {
    return null;
  }

  const save = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setTitleError(labels.editor.emptyTitle);
      return;
    }

    const content = (await editor.getJSON()) as RichTextDocument;
    updateTodo(todo.id, { title: normalizedTitle, content });
    onClose();
  };

  return (
    <View className="flex-1 bg-canvas">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between border-b border-[#E6E5EC] bg-white px-4 py-3">
          <Pressable
            accessibilityRole="button"
            className="min-h-10 justify-center pr-4"
            onPress={onClose}
          >
            <Text className="text-sm font-bold text-[#696B7D]">
              ‹ {labels.editor.close}
            </Text>
          </Pressable>
          <View className="items-center">
            <Text className="text-[16px] font-extrabold text-ink">
              {readOnly ? labels.editor.previewTitle : labels.editor.title}
            </Text>
            <Text className="mt-0.5 text-[10px] text-[#9293A0]">
              {readOnly
                ? labels.editor.readOnlyHint
                : labels.editor.richContentHint}
            </Text>
          </View>
          {readOnly ? (
            <View className="min-h-10 w-10" />
          ) : (
            <Pressable
              accessibilityRole="button"
              className="min-h-10 justify-center rounded-[13px] bg-primary px-4"
              onPress={() => void save()}
            >
              <Text className="text-sm font-extrabold text-white">
                {labels.editor.save}
              </Text>
            </Pressable>
          )}
        </View>

        <View className="bg-white px-5 pb-3 pt-4">
          {readOnly ? (
            <Text className="border-b border-[#DDDBE7] pb-3 text-[25px] font-extrabold text-[#252638]">
              {todo.title}
            </Text>
          ) : (
            <TextInput
              {...inputAccentProps}
              accessibilityLabel={labels.editor.titlePlaceholder}
              className="min-h-[52px] border-b border-[#DDDBE7] py-2 text-[25px] font-extrabold text-[#252638]"
              maxLength={160}
              onChangeText={(value) => {
                setTitle(value);
                setTitleError('');
              }}
              placeholder={labels.editor.titlePlaceholder}
              placeholderTextColor="#A5A6B1"
              value={title}
            />
          )}
          {titleError ? (
            <Text className="mt-2 text-xs font-semibold text-[#D45C6A]">
              {titleError}
            </Text>
          ) : null}
          <Text className="mt-2 text-[11px] text-[#9293A0]">
            {fromDateKey(todo.scheduledDate).toLocaleDateString(
              language === 'zh' ? 'zh-CN' : 'en-US',
              { dateStyle: 'long' },
            )}
            {groupName ? ` · ${groupName}` : ''}
          </Text>

        </View>

        <View className="mx-4 mb-3 flex-1 overflow-hidden rounded-[18px] border border-[#E2E1E9] bg-white">
          <RichText editor={editor} style={styles.richText} />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  richText: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default TaskEditorScreen;
