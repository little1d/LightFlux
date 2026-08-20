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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../../config/input';
import { translations } from '../../content';
import { DESKTOP_LAYOUT_BREAKPOINT } from '../../config/layout';
import { useTodoStore } from '../../store/todoStore';
import { TodoPriority } from '../../types/todo';
import {
  addMonths,
  fromDateKey,
  monthGrid,
  toDateKey,
  todayKey,
} from '../../utils/date';
import IconButton from '../ui/IconButton';
import { TASK_PRIORITY_THEME, TaskPriorityIcon } from './TaskPriorityIndicator';

type Picker = 'date' | 'group' | 'priority' | null;

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
  const wide = width >= DESKTOP_LAYOUT_BREAKPOINT;
  const {
    addTodo,
    groups,
    language,
    ungroupedName,
  } = useTodoStore(
    useShallow((state) => ({
      addTodo: state.addTodo,
      groups: state.groups,
      language: state.language,
      ungroupedName: state.ungroupedName,
    })),
  );
  const labels = translations[language];
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayKey());
  const [groupId, setGroupId] = useState<string | null>(null);
  const [priority, setPriority] = useState<TodoPriority>('none');
  const [picker, setPicker] = useState<Picker>(null);
  const [month, setMonth] = useState(() => fromDateKey(todayKey()));
  const orderedGroups = [...groups].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt,
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const nextDate = initialDate ?? todayKey();
    setDate(nextDate);
    setMonth(fromDateKey(nextDate));
  }, [initialDate, visible]);

  if (!visible) {
    return null;
  }

  const resetAndClose = () => {
    setTitle('');
    setDate(todayKey());
    setGroupId(null);
    setPriority('none');
    setPicker(null);
    onClose();
  };
  const create = () => {
    if (!title.trim()) {
      inputRef.current?.focus();
      return;
    }
    addTodo({ title, scheduledDate: date, groupId, priority });
    resetAndClose();
  };
  const dateLabel = fromDateKey(date).toLocaleDateString(
    language === 'zh' ? 'zh-CN' : 'en-US',
    { day: 'numeric', month: 'short', weekday: 'short' },
  );
  const groupLabel =
    orderedGroups.find((group) => group.id === groupId)?.name ??
    ungroupedName ??
    labels.groups.ungrouped;

  return (
    <Modal
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      onRequestClose={resetAndClose}
      presentationStyle="overFullScreen"
      transparent
      visible
    >
      <View style={[styles.overlay, wide && styles.overlayWide]}>
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
                  active={picker === 'group'}
                  icon="folder-outline"
                  label={groupLabel}
                  onPress={() =>
                    setPicker((current) =>
                      current === 'group' ? null : 'group',
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
                <View style={styles.pickerPanel}>
                  <View style={styles.calendarHeader}>
                    <IconButton
                      icon="chevron-back"
                      label={labels.calendar.previousMonth}
                      onPress={() => setMonth((current) => addMonths(current, -1))}
                      size="compact"
                      variant="transparent"
                    />
                    <Text style={styles.calendarTitle}>
                      {labels.calendar.monthTitle(
                        month.getFullYear(),
                        month.getMonth() + 1,
                      )}
                    </Text>
                    <IconButton
                      icon="chevron-forward"
                      label={labels.calendar.nextMonth}
                      onPress={() => setMonth((current) => addMonths(current, 1))}
                      size="compact"
                      variant="transparent"
                    />
                  </View>
                  <View style={styles.weekRow}>
                    {labels.calendar.weekdays.map((weekday) => (
                      <Text key={weekday} style={styles.weekday}>
                        {weekday}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.days}>
                    {monthGrid(month).map((day) => {
                      const key = toDateKey(day);
                      const selected = key === date;
                      return (
                        <Pressable
                          accessibilityLabel={key}
                          accessibilityRole="button"
                          key={key}
                          onPress={() => {
                            setDate(key);
                            setPicker(null);
                          }}
                          style={[
                            styles.day,
                            selected && styles.daySelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              day.getMonth() !== month.getMonth() &&
                                styles.dayTextMuted,
                              selected && styles.dayTextSelected,
                            ]}
                          >
                            {day.getDate()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {picker === 'group' ? (
                <ScrollView
                  contentContainerStyle={styles.optionList}
                  style={styles.optionPanel}
                >
                  <OptionRow
                    label={ungroupedName ?? labels.groups.ungrouped}
                    onPress={() => {
                      setGroupId(null);
                      setPicker(null);
                    }}
                    selected={groupId === null}
                  />
                  {orderedGroups.map((group) => (
                    <OptionRow
                      key={group.id}
                      label={group.name}
                      onPress={() => {
                        setGroupId(group.id);
                        setPicker(null);
                      }}
                      selected={group.id === groupId}
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
    fontWeight: '800',
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
    flexDirection: 'row',
    minWidth: 0,
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
    fontWeight: '700',
    marginHorizontal: 5,
  },
  pickerPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E0E8',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 8,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarTitle: {
    color: '#404154',
    fontSize: 12,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  weekday: {
    color: '#9A9BA8',
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  day: {
    alignItems: 'center',
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  daySelected: {
    backgroundColor: '#6759E8',
  },
  dayText: {
    color: '#424356',
    fontSize: 11,
    fontWeight: '600',
  },
  dayTextMuted: {
    color: '#C2C3CC',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
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
});

export default QuickAddTaskSheet;
