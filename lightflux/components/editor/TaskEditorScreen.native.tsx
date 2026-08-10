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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../../config/input';
import { editorHtml } from '../../editor-web/build/editorHtml';
import { translations } from '../../i18n/translations';
import { useTodoStore } from '../../store/todoStore';
import { RichTextDocument } from '../../types/todo';
import { richTextPreview } from '../../utils/richText';
import IconButton from '../ui/IconButton';
import { CodeBlockBridge } from './CodeBlockBridge';
import TaskEditorMetadata from './TaskEditorMetadata';
import { TaskEditorScreenProps } from './TaskEditorScreen.types';

const TaskEditorScreen = ({
  todoId,
  onClose,
  readOnly = false,
}: TaskEditorScreenProps) => {
  const {
    groups,
    language,
    todos,
    trashedTodos,
    updateTodo,
  } = useTodoStore(
    useShallow((state) => ({
      groups: state.groups,
      language: state.language,
      todos: state.todos,
      trashedTodos: state.trashedTodos,
      updateTodo: state.updateTodo,
    })),
  );
  const labels = translations[language];
  const todo = (readOnly ? trashedTodos : todos).find(
    (item) => item.id === todoId,
  );
  const groupName =
    groups.find((group) => group.id === todo?.groupId)?.name ??
    labels.groups.ungrouped;
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
  const currentContent = editorContent ?? todo?.content;
  const showBodyPlaceholder =
    !readOnly &&
    currentContent !== undefined &&
    richTextPreview(currentContent).length === 0;

  useEffect(() => {
    if (!readOnly && editorContent) {
      const serializedContent = JSON.stringify(editorContent);
      if (serializedContent !== lastSavedContent.current) {
        lastSavedContent.current = serializedContent;
        updateTodo(todoId, { content: editorContent });
      }
    }
  }, [editorContent, readOnly, todoId, updateTodo]);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setTitleError('');
    }
  }, [todo?.title]);

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
        <View className="flex-row items-start bg-white px-5 pb-3 pt-4">
          <View className="flex-1">
            {readOnly ? (
              <Text className="border-b border-[#DDDBE7] pb-3 text-[25px] font-extrabold text-[#252638]">
                {todo.title}
              </Text>
            ) : (
              <TextInput
                {...inputAccentProps}
                accessibilityLabel={labels.editor.titlePlaceholder}
                className="min-h-[48px] border-b border-[#DDDBE7] py-1 text-[25px] font-extrabold text-[#252638]"
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
                value={title}
              />
            )}
            {titleError ? (
              <Text className="mt-2 text-xs font-semibold text-[#D45C6A]">
                {titleError}
              </Text>
            ) : null}
          </View>
          <View className="ml-3 mt-1.5">
            <IconButton
              icon="close"
              label={labels.editor.close}
              onPress={(event) => {
                event.stopPropagation();
                void closeEditor();
              }}
            />
          </View>
        </View>

        <View className="mx-5">
          <TaskEditorMetadata
            groupName={groupName}
            labels={labels}
            language={language}
            todo={todo}
          />
        </View>

        <View className="relative mx-4 mb-3 flex-1 overflow-hidden rounded-[18px] border border-[#E2E1E9] bg-white">
          {showBodyPlaceholder ? (
            <Text style={styles.bodyPlaceholder}>
              {labels.editor.bodyPlaceholder}
            </Text>
          ) : null}
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
  bodyPlaceholder: {
    color: '#A0A1AD',
    fontSize: 15,
    left: 20,
    pointerEvents: 'none',
    position: 'absolute',
    top: 20,
    zIndex: 2,
  },
});

export default TaskEditorScreen;
