import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../../config/input';
import { translations } from '../../content';
import { DESKTOP_LAYOUT_BREAKPOINT } from '../../config/layout';
import { useWebVisualViewport } from '../../hooks/useWebVisualViewport';
import { useTodoStore } from '../../store/todoStore';
import { INBOX_PROJECT_ID, TodoPriority } from '../../types/todo';
import { fromDateKey, todayKey } from '../../utils/date';
import ActionButton from '../ui/ActionButton';
import DatePicker from '../ui/DatePicker';
import IconButton from '../ui/IconButton';
import { TASK_PRIORITY_THEME, TaskPriorityIcon } from './TaskPriorityIndicator';

type Picker = 'date' | 'project' | 'priority' | null;

const QuickAddTaskSheet = ({
  initialDate,
  onClose,
  visible,
}: {
  initialDate?: string;
  onClose: () => void;
  visible: boolean;
}) => {
  const inputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const webViewportFrame = useWebVisualViewport(visible);
  const wide = width >= DESKTOP_LAYOUT_BREAKPOINT;
  const {
    addTodo,
    projects,
    language,
  } = useTodoStore(
    useShallow((state) => ({
      addTodo: state.addTodo,
      projects: state.projects,
      language: state.language,
    })),
  );
  const labels = translations[language];
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayKey());
  const [projectId, setProjectId] = useState(INBOX_PROJECT_ID);
  const [priority, setPriority] = useState<TodoPriority>('none');
  const [picker, setPicker] = useState<Picker>(null);
  const orderedProjects = [...projects].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt,
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDate(initialDate ?? todayKey());
  }, [initialDate, visible]);

  if (!visible) {
    return null;
  }

  const resetAndClose = () => {
    setTitle('');
    setDate(todayKey());
    setProjectId(INBOX_PROJECT_ID);
    setPriority('none');
    setPicker(null);
    onClose();
  };
  const create = () => {
    if (!title.trim()) {
      inputRef.current?.focus();
      return;
    }
    addTodo({
      title,
      scheduledDate: date,
      projectId,
      priority,
    });
    resetAndClose();
  };
  const dateLabel = fromDateKey(date).toLocaleDateString(
    language === 'zh' ? 'zh-CN' : 'en-US',
    { day: 'numeric', month: 'short', weekday: 'short' },
  );
  const projectLabel =
    orderedProjects.find((project) => project.id === projectId)?.name ??
    labels.projects.inbox;
  const webViewportStyle: ViewStyle | undefined = webViewportFrame
    ? {
        height: webViewportFrame.height,
        left: 0,
        position: 'absolute',
        right: 0,
        top: webViewportFrame.offsetTop,
      }
    : undefined;

  return (
    <Modal
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      onRequestClose={resetAndClose}
      presentationStyle="overFullScreen"
      transparent
      visible
    >
      <View
        style={[
          styles.overlay,
          webViewportStyle,
          wide && styles.overlayWide,
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoider}
        >
          <SafeAreaView
            edges={['bottom']}
            style={[styles.safeArea, wide && styles.safeAreaWide]}
          >
            <View style={[styles.sheet, wide && styles.sheetWide]}>
              <View style={styles.header}>
                <Text style={styles.title}>{labels.addTask}</Text>
                <IconButton
                  icon="close"
                  label={labels.cancel}
                  onPress={resetAndClose}
                  showTooltip={false}
                  size="small"
                  variant="transparent"
                />
              </View>

              <TextInput
                {...inputAccentProps}
                accessibilityLabel={labels.inputPlaceholder}
                autoFocus
                maxLength={160}
                onChangeText={setTitle}
                onSubmitEditing={create}
                placeholder={labels.inputPlaceholder}
                placeholderTextColor="#9A9BA8"
                ref={inputRef}
                returnKeyType="done"
                style={styles.input}
                value={title}
              />

              <View style={styles.pickerRow}>
                <PickerButton
                  active={picker === 'date'}
                  icon="calendar-outline"
                  label={dateLabel}
                  onPress={() =>
                    setPicker((current) =>
                      current === 'date' ? null : 'date',
                    )
                  }
                />
                <PickerButton
                  active={picker === 'project'}
                  icon="folder-outline"
                  label={projectLabel}
                  onPress={() =>
                    setPicker((current) =>
                      current === 'project' ? null : 'project',
                    )
                  }
                />
                <PickerButton
                  active={picker === 'priority'}
                  icon="flag-outline"
                  label={labels.taskMenu.priorityOptions[priority]}
                  onPress={() =>
                    setPicker((current) =>
                      current === 'priority' ? null : 'priority',
                    )
                  }
                  tint={
                    priority === 'none'
                      ? undefined
                      : TASK_PRIORITY_THEME[priority].color
                  }
                />
              </View>

              {picker === 'date' ? (
                // The sheet sits at the bottom of the screen, so the picker is
                // capped and scrolls rather than pushing the sheet off-screen
                // on a short viewport with the keyboard open.
                <ScrollView
                  contentContainerStyle={styles.pickerPanelContent}
                  style={styles.pickerPanel}
                >
                  <DatePicker
                    language={language}
                    labels={labels}
                    onSelect={(key) => {
                      setDate(key);
                      setPicker(null);
                    }}
                    shortcuts
                    value={date}
                  />
                </ScrollView>
              ) : null}

              {picker === 'project' ? (
                <ScrollView
                  contentContainerStyle={styles.optionList}
                  style={styles.optionPanel}
                >
                  {orderedProjects.map((project) => (
                    <OptionRow
                      key={project.id}
                      label={project.name}
                      onPress={() => {
                        setProjectId(project.id);
                        setPicker(null);
                      }}
                      selected={project.id === projectId}
                    />
                  ))}
                </ScrollView>
              ) : null}

              {picker === 'priority' ? (
                <View style={styles.optionPanel}>
                  {(['none', 'high', 'medium', 'low'] as TodoPriority[]).map(
                    (item) => (
                      <OptionRow
                        icon={<TaskPriorityIcon priority={item} size={16} />}
                        key={item}
                        label={labels.taskMenu.priorityOptions[item]}
                        onPress={() => {
                          setPriority(item);
                          setPicker(null);
                        }}
                        selected={item === priority}
                      />
                    ),
                  )}
                </View>
              ) : null}

              <View style={styles.footer}>
                <ActionButton
                  disabled={!title.trim()}
                  label={labels.addTask}
                  onPress={create}
                />
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const PickerButton = ({
  active,
  icon,
  label,
  onPress,
  tint,
}: {
  active: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  tint?: string;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    onPress={onPress}
    style={[styles.pickerButton, active && styles.pickerButtonActive]}
  >
    <Ionicons color={tint ?? '#747585'} name={icon} size={15} />
    <Text numberOfLines={1} style={styles.pickerLabel}>
      {label}
    </Text>
    <Ionicons color="#A3A4AF" name="chevron-down" size={13} />
  </Pressable>
);

const OptionRow = ({
  icon,
  label,
  onPress,
  selected,
}: {
  icon?: React.ReactNode;
  label: string;
  onPress: () => void;
  selected: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={[styles.option, selected && styles.optionSelected]}
  >
    {icon ? <View style={styles.optionIcon}>{icon}</View> : null}
    <Text numberOfLines={1} style={styles.optionLabel}>
      {label}
    </Text>
    {selected ? (
      <Ionicons color="#6759E8" name="checkmark" size={17} />
    ) : null}
  </Pressable>
);

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayWide: {
    backgroundColor: 'rgba(31, 30, 43, 0.12)',
  },
  keyboardAvoider: {
    justifyContent: 'flex-end',
  },
  safeArea: {
    width: '100%',
  },
  safeAreaWide: {
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: '#F6F5F8',
    borderColor: '#E2E0E8',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetWide: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    marginBottom: 24,
    maxWidth: 520,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    color: '#303145',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFDDE6',
    borderRadius: 12,
    borderWidth: 1,
    color: '#303145',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  pickerButton: {
    alignItems: 'center',
    backgroundColor: '#EFEEF3',
    borderColor: '#E1DFE7',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    flexBasis: 112,
    flexDirection: 'row',
    minWidth: 112,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pickerButtonActive: {
    backgroundColor: '#EEECFF',
    borderColor: '#BDB5F5',
  },
  pickerLabel: {
    color: '#565769',
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    marginHorizontal: 5,
  },
  pickerPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E0E8',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    maxHeight: 320,
  },
  pickerPanelContent: {
    padding: 8,
  },
  optionPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E0E8',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    maxHeight: 188,
  },
  optionList: {
    padding: 5,
  },
  option: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    minHeight: 38,
    paddingHorizontal: 10,
  },
  optionSelected: {
    backgroundColor: '#F0EEFF',
  },
  optionIcon: {
    marginRight: 9,
  },
  optionLabel: {
    color: '#4B4C5E',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'flex-end',
    marginTop: 12,
    paddingBottom: 12,
  },
});

export default QuickAddTaskSheet;
