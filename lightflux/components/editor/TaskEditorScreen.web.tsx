import Image from '@tiptap/extension-image';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, {
  useEffect,
  useState,
} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { inputAccentProps } from '../../config/input';
import { useTodos } from '../../context/TodoContext';
import { translations } from '../../i18n/translations';
import { RichTextDocument } from '../../types/todo';
import { TaskEditorScreenProps } from './TaskEditorScreen.types';

const EDITOR_CSS = `
  .lightflux-tiptap {
    min-height: 390px;
    padding: 22px;
    outline: none;
    color: #303145;
    font: 15px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .lightflux-tiptap > *:first-child { margin-top: 0; }
  .lightflux-tiptap p { margin: 0 0 0.85em; }
  .lightflux-tiptap h1,
  .lightflux-tiptap h2,
  .lightflux-tiptap h3 {
    color: #242538;
    line-height: 1.25;
    margin: 1.2em 0 0.55em;
  }
  .lightflux-tiptap h1 { font-size: 1.8em; }
  .lightflux-tiptap h2 { font-size: 1.45em; }
  .lightflux-tiptap h3 { font-size: 1.2em; }
  .lightflux-tiptap ul,
  .lightflux-tiptap ol { padding-left: 1.5em; }
  .lightflux-tiptap blockquote {
    border-left: 3px solid #8b7eff;
    color: #696b7d;
    margin: 1em 0;
    padding: 0.4em 0 0.4em 1em;
  }
  .lightflux-tiptap code {
    background: #eeecf7;
    border-radius: 5px;
    color: #5a4ed0;
    padding: 0.12em 0.35em;
  }
  .lightflux-tiptap pre {
    background: #25233b;
    border-radius: 12px;
    color: #f4f2ff;
    overflow-x: auto;
    padding: 16px;
  }
  .lightflux-tiptap pre code {
    background: transparent;
    color: inherit;
    padding: 0;
  }
  .lightflux-tiptap img {
    border-radius: 14px;
    display: block;
    height: auto;
    margin: 16px auto;
    max-width: 100%;
  }
  .lightflux-tiptap .ProseMirror-selectednode {
    outline: 3px solid rgba(103, 89, 232, 0.38);
  }
  .lightflux-tiptap[contenteditable="false"] {
    cursor: default;
  }
`;

const TaskEditorScreen = ({
  todoId,
  onClose,
  embedded = false,
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

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Image.configure({
          allowBase64: false,
          HTMLAttributes: { loading: 'lazy' },
        }),
      ],
      content: todo?.content,
      editable: !readOnly,
      onUpdate: ({ editor: currentEditor }) => {
        if (readOnly) {
          return;
        }
        updateTodo(todoId, {
          content: currentEditor.getJSON() as RichTextDocument,
        });
      },
      editorProps: {
        attributes: {
          'aria-label': labels.editor.bodyPlaceholder,
          'aria-multiline': 'true',
          'aria-readonly': readOnly ? 'true' : 'false',
          class: 'lightflux-tiptap',
          role: readOnly ? 'document' : 'textbox',
        },
      },
    },
    [readOnly, todoId],
  );

  useEffect(() => {
    const style = document.createElement('style');
    style.dataset.lightfluxEditor = 'true';
    style.textContent = EDITOR_CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  if (!todo) {
    return null;
  }

  const closeEditor = () => {
    if (readOnly) {
      onClose();
      return;
    }

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setTitleError(labels.editor.emptyTitle);
      return;
    }

    updateTodo(todo.id, {
      title: normalizedTitle,
      content: (editor?.getJSON() ?? todo.content) as RichTextDocument,
    });
    onClose();
  };

  return (
    <View className={`flex-1 ${embedded ? 'bg-white' : 'bg-canvas'}`}>
      <SafeAreaView className="flex-1">
        <View className="min-h-[48px] flex-row items-center border-b border-[#E6E5EC] bg-white px-5">
          <Pressable
            accessibilityRole="button"
            className="min-h-10 justify-center pr-5"
            onPress={(event) => {
              event.stopPropagation();
              closeEditor();
            }}
          >
            <Text className="text-sm font-bold text-[#696B7D]">
              {embedded ? '×' : `‹ ${labels.editor.close}`}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-3">
            {readOnly ? (
              <Text className="border-b border-[#DDDBE7] px-1 pb-3 text-[28px] font-extrabold text-[#252638]">
                {todo.title}
              </Text>
            ) : (
              <TextInput
                {...inputAccentProps}
                accessibilityLabel={labels.editor.titlePlaceholder}
                autoFocus={focusTitle}
                className="min-h-[58px] border-b border-[#DDDBE7] px-1 py-2 text-[28px] font-extrabold text-[#252638]"
                maxLength={160}
                nativeID="task-title-input"
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

          <View
            className={`min-h-[440px] overflow-hidden rounded-[16px] border bg-white ${
              readOnly ? 'border-[#ECEBF0]' : 'border-[#E2E1E9]'
            }`}
            nativeID="task-rich-editor"
            style={readOnly ? undefined : styles.editorShadow}
          >
            {editor ? <EditorContent editor={editor} /> : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    maxWidth: 900,
    padding: 20,
    width: '100%',
  },
  editorShadow: {
    shadowColor: '#424057',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
});

export default TaskEditorScreen;
