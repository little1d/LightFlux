import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import type { EditorView } from '@tiptap/pm/view';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../../config/input';
import { translations } from '../../content';
import {
  ImageUploadError,
  ImageUploadErrorCode,
  uploadTaskImage,
} from '../../services/imageUpload';
import { useTodoStore } from '../../store/todoStore';
import { RichTextDocument } from '../../types/todo';
import IconButton from '../ui/IconButton';
import TaskEditorMetadata from './TaskEditorMetadata';
import { TaskEditorScreenProps } from './TaskEditorScreen.types';

const EDITOR_CSS = `
  .lightflux-tiptap,
  .lightflux-tiptap:focus,
  .lightflux-tiptap:focus-visible,
  .lightflux-tiptap.ProseMirror-focused {
    border: 0 !important;
    box-shadow: none !important;
    outline: none !important;
  }
  .lightflux-tiptap {
    min-height: 120px;
    padding: 16px;
    color: #303145;
    font: 15px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .lightflux-tiptap > *:first-child { margin-top: 0; }
  .lightflux-tiptap p { margin: 0 0 0.85em; }
  .lightflux-tiptap p.is-editor-empty:first-child::before {
    color: #a0a1ad;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
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
  @media (max-width: 899px) {
    .lightflux-tiptap {
      min-height: 80px;
      padding: 8px 2px 16px;
    }
  }
`;

const TaskEditorScreen = ({
  todoId,
  onClose,
  embedded = false,
  readOnly = false,
}: TaskEditorScreenProps) => {
  const { width } = useWindowDimensions();
  const compact = width < 900;
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
  const [imageUploadStatus, setImageUploadStatus] = useState<
    'uploading' | ImageUploadErrorCode | null
  >(null);

  const uploadPastedImages = useCallback(
    async (view: EditorView, files: File[]) => {
      setImageUploadStatus('uploading');
      try {
        for (const file of files) {
          const imageUrl = await uploadTaskImage(file);
          if (view.isDestroyed) {
            return;
          }

          const imageNode = view.state.schema.nodes.image?.create({
            alt: file.name || undefined,
            src: imageUrl,
          });
          if (imageNode) {
            view.dispatch(view.state.tr.replaceSelectionWith(imageNode));
          }
        }
        setImageUploadStatus(null);
      } catch (error) {
        setImageUploadStatus(
          error instanceof ImageUploadError ? error.code : 'upload-failed',
        );
      }
    },
    [],
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Image.configure({
          allowBase64: false,
          HTMLAttributes: { loading: 'lazy' },
        }),
        Placeholder.configure({
          placeholder: labels.editor.bodyPlaceholder,
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
        handlePaste: (view, event) => {
          if (readOnly) {
            return false;
          }

          const files = Array.from(event.clipboardData?.items ?? [])
            .filter(
              (item) =>
                item.kind === 'file' && item.type.startsWith('image/'),
            )
            .map((item) => item.getAsFile())
            .filter((file): file is File => file !== null);

          if (files.length === 0) {
            return false;
          }

          event.preventDefault();
          void uploadPastedImages(view, files);
          return true;
        },
      },
    },
    [
      labels.editor.bodyPlaceholder,
      readOnly,
      todoId,
      uploadPastedImages,
    ],
  );

  useEffect(() => {
    const style = document.createElement('style');
    style.dataset.lightfluxEditor = 'true';
    style.textContent = EDITOR_CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setTitleError('');
    }
  }, [todo?.title]);

  useEffect(() => {
    if (!imageUploadStatus || imageUploadStatus === 'uploading') {
      return undefined;
    }

    const timer = setTimeout(() => setImageUploadStatus(null), 4500);
    return () => clearTimeout(timer);
  }, [imageUploadStatus]);

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

  const imageUploadMessage =
    imageUploadStatus === 'uploading'
      ? labels.editor.imageUploading
      : imageUploadStatus === 'not-configured'
        ? labels.editor.imageUploadNotConfigured
        : imageUploadStatus === 'too-large'
          ? labels.editor.imageUploadTooLarge
          : imageUploadStatus === 'unsupported'
            ? labels.editor.imageUploadUnsupported
            : labels.editor.imageUploadFailed;

  return (
    <View
      className={`${
        compact || embedded ? 'bg-white' : 'flex-1 bg-canvas'
      }`}
    >
      <SafeAreaView className={compact || embedded ? '' : 'flex-1'}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            compact && styles.contentCompact,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {compact ? <View style={styles.sheetHandle} /> : null}
          <View className={`${compact ? 'mb-2' : 'mb-3'} flex-row items-start`}>
            <View className="flex-1">
              {readOnly ? (
                <Text
                  className={`border-b border-[#DDDBE7] px-1 font-extrabold text-[#252638] ${
                    compact ? 'pb-2 text-[23px]' : 'pb-3 text-[28px]'
                  }`}
                >
                  {todo.title}
                </Text>
              ) : (
                <TextInput
                  {...inputAccentProps}
                  accessibilityLabel={labels.editor.titlePlaceholder}
                  className={`border-b border-[#DDDBE7] px-1 py-1 font-extrabold text-[#252638] ${
                    compact
                      ? 'min-h-[44px] text-[23px]'
                      : 'min-h-[52px] text-[28px]'
                  }`}
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
                  value={title}
                />
              )}
              {titleError ? (
                <Text className="mt-2 text-xs font-semibold text-[#D45C6A]">
                  {titleError}
                </Text>
              ) : null}
            </View>
            <View className={compact ? 'ml-2 mt-1' : 'ml-3 mt-2'}>
              <IconButton
                icon={compact ? 'chevron-down' : 'close'}
                label={labels.editor.close}
                onPress={(event) => {
                  event.stopPropagation();
                  closeEditor();
                }}
                showTooltip={false}
                size={compact ? 'small' : 'medium'}
                variant={compact ? 'transparent' : 'neutral'}
              />
            </View>
          </View>

          <TaskEditorMetadata
            groupName={groupName}
            labels={labels}
            language={language}
            todo={todo}
          />

          <View
            className={
              compact
                ? 'min-h-[80px]'
                : `min-h-[160px] overflow-hidden rounded-[16px] border bg-white ${
                    readOnly ? 'border-[#ECEBF0]' : 'border-[#E2E1E9]'
                  }`
            }
            nativeID="task-rich-editor"
            style={readOnly || compact ? undefined : styles.editorShadow}
          >
            {imageUploadStatus ? (
              <View
                accessibilityLiveRegion="polite"
                style={[
                  styles.uploadStatus,
                  imageUploadStatus !== 'uploading' &&
                    styles.uploadStatusError,
                ]}
              >
                <View
                  style={[
                    styles.uploadStatusDot,
                    imageUploadStatus !== 'uploading' &&
                      styles.uploadStatusDotError,
                  ]}
                />
                <Text
                  style={[
                    styles.uploadStatusText,
                    imageUploadStatus !== 'uploading' &&
                      styles.uploadStatusTextError,
                  ]}
                >
                  {imageUploadMessage}
                </Text>
              </View>
            ) : null}
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
  contentCompact: {
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  editorShadow: {
    shadowColor: '#424057',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#D8D6DF',
    borderRadius: 2,
    height: 4,
    marginBottom: 8,
    width: 34,
  },
  uploadStatus: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0EEFF',
    borderColor: '#DDD8FF',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: -10,
    marginLeft: 14,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 2,
  },
  uploadStatusError: {
    backgroundColor: '#FFF1F3',
    borderColor: '#F3D2D8',
  },
  uploadStatusDot: {
    backgroundColor: '#6759E8',
    borderRadius: 3,
    height: 6,
    marginRight: 7,
    width: 6,
  },
  uploadStatusDotError: {
    backgroundColor: '#C84F60',
  },
  uploadStatusText: {
    color: '#5B50C7',
    fontSize: 11,
    fontWeight: '600',
  },
  uploadStatusTextError: {
    color: '#B44758',
  },
});

export default TaskEditorScreen;
