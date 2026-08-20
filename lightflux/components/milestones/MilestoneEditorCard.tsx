import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { inputAccentProps } from '../../config/input';
import { Translation } from '../../content';
import {
  requestMilestoneNotificationPermission,
} from '../../services/milestoneNotifications';
import { MILESTONE_TYPE_THEME } from '../../store/milestoneDomain';
import {
  Milestone,
  MilestoneDateRule,
  MilestoneType,
  NewMilestone,
} from '../../types/todo';
import {
  isValidMilestoneDateRule,
  isValidMilestoneStartYear,
} from '../../utils/milestoneDate';
import ActionButton from '../ui/ActionButton';
import MenuItem from '../ui/MenuItem';
import MenuSurface, {
  MenuSurfacePosition,
} from '../ui/MenuSurface';

const COLORS = ['#F28B82', '#F2A65A', '#55B9A5', '#6D8DF5', '#8B7EFF'];
const REMINDERS = [0, 1, 3, 7, 30];
const TYPE_ICONS: Record<
  MilestoneType,
  React.ComponentProps<typeof Ionicons>['name']
> = {
  anniversary: 'heart-outline',
  countdown: 'hourglass-outline',
  birthday: 'gift-outline',
  holiday: 'balloon-outline',
  custom: 'sparkles-outline',
};

interface MilestoneEditorCardProps {
  initial?: Milestone;
  labels: Translation['milestones'];
  onCancel: () => void;
  onSave: (milestone: NewMilestone) => void;
  template: MilestoneType;
}

const MilestoneEditorCard = ({
  initial,
  labels,
  onCancel,
  onSave,
  template,
}: MilestoneEditorCardProps) => {
  const now = useMemo(() => new Date(), []);
  const entrance = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const compact = width < 560;
  const initialRule = initial?.dateRule;
  const type = initial?.type ?? template;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>(
    initialRule?.calendar ?? 'solar',
  );
  const [recurring, setRecurring] = useState(
    initialRule ? initialRule.year === null : template !== 'countdown',
  );
  const [year, setYear] = useState(
    String(initialRule?.year ?? now.getFullYear()),
  );
  const [month, setMonth] = useState(
    String(initialRule?.month ?? now.getMonth() + 1),
  );
  const [day, setDay] = useState(
    String(initialRule?.day ?? now.getDate()),
  );
  const [startYear, setStartYear] = useState(
    initial?.startYear ? String(initial.startYear) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(
    initial?.reminderOffsets ?? [],
  );
  const [isLeapMonth, setIsLeapMonth] = useState(
    initialRule?.calendar === 'lunar' ? initialRule.isLeapMonth : false,
  );
  const [missingLeapMonthPolicy, setMissingLeapMonthPolicy] = useState<
    'regular-month' | 'skip-year'
  >(
    initialRule?.calendar === 'lunar'
      ? initialRule.missingLeapMonthPolicy
      : 'regular-month',
  );
  const [leapDayPolicy, setLeapDayPolicy] = useState<'feb-28' | 'mar-1'>(
    initialRule?.calendar === 'solar'
      ? initialRule.leapDayPolicy
      : 'feb-28',
  );
  const [color, setColor] = useState(
    initial?.color ?? MILESTONE_TYPE_THEME[type].color,
  );
  const [picker, setPicker] = useState<'calendar' | 'repeat' | null>(null);
  const [pickerPosition, setPickerPosition] =
    useState<MenuSurfacePosition>();
  const [error, setError] = useState('');
  const [isRequestingPermission, setIsRequestingPermission] =
    useState(false);

  useEffect(() => {
    Animated.timing(entrance, {
      duration: 170,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [entrance]);

  const dateRule = (): MilestoneDateRule => {
    const base = {
      year: recurring ? null : Number(year),
      month: Number(month),
      day: Number(day),
    };
    return calendar === 'solar'
      ? {
          calendar: 'solar',
          ...base,
          leapDayPolicy,
        }
      : {
          calendar: 'lunar',
          ...base,
          isLeapMonth,
          missingLeapMonthPolicy,
        };
  };

  const save = async () => {
    if (isRequestingPermission) {
      return;
    }
    setError('');
    const normalizedTitle = title.trim();
    const rule = dateRule();
    const normalizedStartYear = recurring && startYear.trim()
      ? Number(startYear)
      : null;
    if (
      !normalizedTitle ||
      !isValidMilestoneDateRule(rule) ||
      !isValidMilestoneStartYear(normalizedStartYear)
    ) {
      setError(labels.invalidDate);
      return;
    }
    if (reminderOffsets.length > 0) {
      setIsRequestingPermission(true);
      const permissionGranted =
        await requestMilestoneNotificationPermission();
      setIsRequestingPermission(false);
      if (!permissionGranted) {
        setError(labels.notificationPermissionDenied);
        return;
      }
    }
    onSave({
      title: normalizedTitle,
      type,
      dateRule: rule,
      startYear: normalizedStartYear,
      reminderOffsets,
      notes,
      icon: MILESTONE_TYPE_THEME[type].icon,
      color,
      pinned: initial?.pinned ?? false,
    });
    Keyboard.dismiss();
  };

  const toggleReminder = (offset: number) =>
    setReminderOffsets((current) =>
      current.includes(offset)
        ? current.filter((value) => value !== offset)
        : [...current, offset],
    );

  return (
    <Animated.View
      style={[
        styles.card,
        compact && styles.cardCompact,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
            {
              scale: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [0.99, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerIdentity}>
          <View
            style={[
              styles.typeIcon,
              { backgroundColor: `${color}1F` },
            ]}
          >
            <Ionicons color={color} name={TYPE_ICONS[type]} size={20} />
          </View>
          <View>
            <Text style={styles.eyebrow}>
              {initial ? labels.edit : labels.add}
            </Text>
            <Text style={styles.heading}>
              {labels.templates[type]}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel={labels.cancel}
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color="#737482" name="close" size={17} />
        </Pressable>
      </View>

      <View style={styles.titleField}>
        <Ionicons color="#9693A5" name="create-outline" size={17} />
        <TextInput
          {...inputAccentProps}
          accessibilityLabel={labels.titlePlaceholder}
          autoFocus
          maxLength={120}
          onChangeText={setTitle}
          placeholder={labels.titlePlaceholder}
          placeholderTextColor="#9B9CA8"
          style={styles.titleInput}
          value={title}
        />
      </View>

      <View style={styles.formSection}>
        <View style={styles.selectRow}>
          <SelectField
            icon="calendar-outline"
            label={labels.calendar}
            onOpen={(position) => {
              setPickerPosition(position);
              setPicker('calendar');
            }}
            value={calendar === 'solar' ? labels.solar : labels.lunar}
          />
          <SelectField
            icon="repeat-outline"
            label={labels.repeat}
            onOpen={(position) => {
              setPickerPosition(position);
              setPicker('repeat');
            }}
            value={recurring ? labels.repeatYearly : labels.oneTime}
          />
        </View>

        <View style={styles.dateRow}>
          {!recurring ? (
            <NumberField
              label={labels.year}
              onChange={setYear}
              value={year}
              wide
            />
          ) : null}
          <NumberField
            label={labels.month}
            onChange={setMonth}
            value={month}
          />
          <NumberField label={labels.day} onChange={setDay} value={day} />
          {recurring ? (
            <View style={styles.startYearField}>
              <NumberField
                label={labels.startYear}
                onChange={setStartYear}
                value={startYear}
                wide
              />
            </View>
          ) : null}
        </View>

        {calendar === 'lunar' ? (
          <View style={styles.policyRow}>
            {Number(day) === 30 ? (
              <Text style={styles.policyHint}>{labels.lunarDayThirtySkip}</Text>
            ) : null}
            <ToggleChip
              label={labels.leapMonth}
              onPress={() => setIsLeapMonth((current) => !current)}
              selected={isLeapMonth}
            />
            {isLeapMonth ? (
              <>
                <ToggleChip
                  label={labels.leapMonthFallback}
                  onPress={() => setMissingLeapMonthPolicy('regular-month')}
                  selected={missingLeapMonthPolicy === 'regular-month'}
                />
                <ToggleChip
                  label={labels.leapMonthSkip}
                  onPress={() => setMissingLeapMonthPolicy('skip-year')}
                  selected={missingLeapMonthPolicy === 'skip-year'}
                />
              </>
            ) : null}
          </View>
        ) : Number(month) === 2 && Number(day) === 29 ? (
          <View style={styles.policyRow}>
            <Text style={styles.fieldLabel}>{labels.februaryFallback}</Text>
            <ToggleChip
              label={labels.february28}
              onPress={() => setLeapDayPolicy('feb-28')}
              selected={leapDayPolicy === 'feb-28'}
            />
            <ToggleChip
              label={labels.march1}
              onPress={() => setLeapDayPolicy('mar-1')}
              selected={leapDayPolicy === 'mar-1'}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.formSection}>
        <SectionLabel
          icon="notifications-outline"
          label={labels.reminders}
        />
        <View style={styles.chipRow}>
          {REMINDERS.map((offset) => (
            <ToggleChip
              key={offset}
              label={labels.reminderDay(offset)}
              onPress={() => toggleReminder(offset)}
              selected={reminderOffsets.includes(offset)}
            />
          ))}
        </View>
      </View>

      <View style={styles.formSection}>
        <SectionLabel icon="color-palette-outline" label={labels.style} />
        <View style={styles.colorRow}>
          {COLORS.map((item) => (
            <Pressable
              accessibilityLabel={item}
              accessibilityRole="radio"
              accessibilityState={{ checked: color === item }}
              key={item}
              onPress={() => setColor(item)}
              style={[
                styles.colorOuter,
                color === item && styles.colorOuterSelected,
              ]}
            >
              <View style={[styles.colorInner, { backgroundColor: item }]}>
                {color === item ? (
                  <Ionicons color="#FFFFFF" name="checkmark" size={12} />
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.formSection}>
        <SectionLabel icon="document-text-outline" label={labels.notes} />
        <TextInput
          {...inputAccentProps}
          accessibilityLabel={labels.notes}
          maxLength={500}
          multiline
          onChangeText={setNotes}
          placeholder={labels.notesPlaceholder}
          placeholderTextColor="#9B9CA8"
          style={styles.notesInput}
          value={notes}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <ActionButton
          label={labels.cancel}
          onPress={onCancel}
          variant="ghost"
        />
        <View style={styles.actionGap} />
        <ActionButton
          disabled={!title.trim() || isRequestingPermission}
          label={labels.save}
          onPress={save}
        />
      </View>

      {picker === 'calendar' ? (
        <MenuSurface
          closeLabel={labels.cancel}
          estimatedHeight={100}
          onClose={() => setPicker(null)}
          position={pickerPosition}
          width={190}
        >
          <MenuItem
            label={labels.solar}
            onPress={() => {
              setCalendar('solar');
              setPicker(null);
            }}
            selected={calendar === 'solar'}
          />
          <MenuItem
            label={labels.lunar}
            onPress={() => {
              setCalendar('lunar');
              setPicker(null);
            }}
            selected={calendar === 'lunar'}
          />
        </MenuSurface>
      ) : null}

      {picker === 'repeat' ? (
        <MenuSurface
          closeLabel={labels.cancel}
          estimatedHeight={100}
          onClose={() => setPicker(null)}
          position={pickerPosition}
          width={190}
        >
          <MenuItem
            label={labels.repeatYearly}
            onPress={() => {
              setRecurring(true);
              setPicker(null);
            }}
            selected={recurring}
          />
          <MenuItem
            label={labels.oneTime}
            onPress={() => {
              setRecurring(false);
              setPicker(null);
            }}
            selected={!recurring}
          />
        </MenuSurface>
      ) : null}
    </Animated.View>
  );
};

const SelectField = ({
  icon,
  label,
  onOpen,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onOpen: (position: MenuSurfacePosition) => void;
  value: string;
}) => {
  const ref = useRef<View>(null);

  const open = () => {
    if (Platform.OS === 'web') {
      const element = ref.current as unknown as HTMLElement | null;
      const bounds = element?.getBoundingClientRect?.();
      if (bounds) {
        onOpen({ x: bounds.left, y: bounds.bottom + 6 });
        return;
      }
    }
    ref.current?.measureInWindow((x, y, _width, height) => {
      onOpen({ x, y: y + height + 6 });
    });
  };

  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      onPress={open}
      ref={ref}
      style={({ pressed }) => [
        styles.selectField,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.selectLabelRow}>
        <Ionicons color="#8A8798" name={icon} size={13} />
        <Text style={styles.selectLabel}>{label}</Text>
      </View>
      <View style={styles.selectValueRow}>
        <Text numberOfLines={1} style={styles.selectValue}>
          {value}
        </Text>
        <Ionicons color="#AAA7B5" name="chevron-down" size={13} />
      </View>
    </Pressable>
  );
};

const SectionLabel = ({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) => (
  <View style={styles.sectionLabel}>
    <Ionicons color="#767286" name={icon} size={14} />
    <Text style={styles.sectionLabelText}>{label}</Text>
  </View>
);

const Segment = ({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ checked: selected }}
    onPress={onPress}
    style={({ pressed }) => [
      styles.segment,
      selected && styles.segmentSelected,
      pressed && styles.pressed,
    ]}
  >
    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
      {label}
    </Text>
  </Pressable>
);

const ToggleChip = Segment;

const NumberField = ({
  label,
  onChange,
  value,
  wide = false,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
  wide?: boolean;
}) => (
  <View style={[styles.numberField, wide && styles.numberFieldWide]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      {...inputAccentProps}
      accessibilityLabel={label}
      keyboardType="number-pad"
      maxLength={4}
      onChangeText={onChange}
      style={styles.numberInput}
      value={value}
    />
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9D6E8',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
    overflow: 'hidden',
    padding: 18,
    shadowColor: '#403B64',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  cardCompact: {
    borderRadius: 14,
    padding: 14,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  headerIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  typeIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    marginRight: 11,
    width: 40,
  },
  eyebrow: {
    color: '#8B8C99',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0,
  },
  heading: {
    color: '#303145',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#F3F2F6',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  titleField: {
    alignItems: 'center',
    backgroundColor: '#F8F7FA',
    borderColor: '#DDD9EA',
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 13,
  },
  titleInput: {
    color: '#2E2F42',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 46,
    outlineColor: 'transparent',
    paddingHorizontal: 10,
  },
  selectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectField: {
    backgroundColor: '#F8F7FA',
    borderColor: '#E1DFE8',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  selectLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  selectLabel: {
    color: '#8A8798',
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 5,
  },
  selectValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  selectValue: {
    color: '#3C3D50',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 5,
  },
  formSection: {
    borderTopColor: '#ECEAF2',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 13,
  },
  sectionLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  sectionLabelText: {
    color: '#646174',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
  },
  fieldLabel: {
    color: '#7D7E8C',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 5,
  },
  segment: {
    backgroundColor: '#F3F2F6',
    borderColor: '#F3F2F6',
    borderRadius: 9,
    borderWidth: 1,
    marginBottom: 5,
    marginRight: 5,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  segmentSelected: {
    backgroundColor: '#F0EEFF',
    borderColor: '#BFB7F5',
  },
  segmentText: {
    color: '#686978',
    fontSize: 11,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: '#6759E8',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  dateRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 7,
  },
  numberField: {
    marginRight: 8,
    width: 72,
  },
  numberFieldWide: {
    width: 118,
  },
  startYearField: {
    marginLeft: 3,
  },
  numberInput: {
    backgroundColor: '#F8F7FA',
    borderColor: '#E1DFE8',
    borderRadius: 9,
    borderWidth: 1,
    color: '#38394B',
    fontSize: 12,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  policyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 11,
  },
  policyHint: {
    color: '#8A6B32',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 5,
    marginRight: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorRow: {
    flexDirection: 'row',
  },
  colorOuter: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    marginRight: 8,
    width: 28,
  },
  colorOuterSelected: {
    borderColor: '#6759E8',
  },
  colorInner: {
    alignItems: 'center',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  notesInput: {
    backgroundColor: '#F8F7FA',
    borderColor: '#E1DFE8',
    borderRadius: 10,
    borderWidth: 1,
    color: '#48495A',
    fontSize: 12,
    lineHeight: 18,
    maxHeight: 100,
    minHeight: 64,
    padding: 10,
    textAlignVertical: 'top',
  },
  error: {
    color: '#B44758',
    fontSize: 11,
    marginTop: 9,
  },
  actions: {
    borderTopColor: '#ECEAF2',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    paddingTop: 13,
  },
  actionGap: {
    width: 6,
  },
});

export default MilestoneEditorCard;
