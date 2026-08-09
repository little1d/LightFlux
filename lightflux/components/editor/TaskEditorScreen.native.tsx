import {
  RichText,
  TenTapStartKit,
  useEditorBridge,
  useEditorContent,
} from '@10play/tentap-editor';
import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
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
import { CodeBlockBridge } from './CodeBlockBridge';
import { TaskEditorScreenProps } from './TaskEditorScreen.types';

const TaskEditorScreen = ({
  todoId,
  onClose,
  focusTitle = false,
  readOnly = false,
}: TaskEditorScreenProps) => {
  const {
    language,
    todos,
    trashedTodos,
    updateTodo,
  } = useTodos();
  const labels = translations[language];
  const todo = (readOnly ? trashedTodos : todos).find(
    (item) => item.id === todoId,
  );
  const [title, setTitle] = useState(todo?.title ?? '');
  const [titleError, setTitleError] = useState('');
  const lastSavedContent = useRef(
    JSON.stringify(todo?.content ?? null),
  );
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
  const editorContent = useEditorContent(editor, {
    debounceInterval: 350,
    type: 'json',
  }) as RichTextDocument | undefined;

  useEffect(() => {
    if (!readOnly && editorContent) {
      const serializedContent = JSON.stringify(editorContent);
      if (serializedContent !== lastSavedContent.current) {
        lastSavedContent.current = serializedContent;
        updateTodo(todoId, { content: editorContent });
      }
    }
  }, [editorContent, readOnly, todoId, updateTodo]);

  if (!todo) {
    return null;
  }

  const closeEditor = async () => {
    if (readOnly) {
      onClose();
      return;
    }

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
        <View className="min-h-[48px] flex-row items-center border-b border-[#E6E5EC] bg-white px-4">
          <Pressable
            accessibilityRole="button"
            className="min-h-10 justify-center pr-5"
            onPress={(event) => {
              event.stopPropagation();
              void closeEditor();
            }}
          >
            <Text className="text-sm font-bold text-[#696B7D]">
              ‹ {labels.editor.close}
            </Text>
          </Pressable>
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
              autoFocus={focusTitle}
              className="min-h-[52px] border-b border-[#DDDBE7] py-2 text-[25px] font-extrabold text-[#252638]"
              maxLength={160}
              onChangeText={(value) => {
                setTitle(value);
                setTitleError('');
                if (value.trim()) {
                  updateTodo(todo.id, { title: value });
                }
              }}
              placeholder={labels.editor.titlePlaceholder}
              placeholderTextColor="#A5A6B1"
              selectTextOnFocus={focusTitle}
              value={title}
            />
          )}
          {titleError ? (
            <Text className="mt-2 text-xs font-semibold text-[#D45C6A]">
              {titleError}
            </Text>
          ) : null}
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
