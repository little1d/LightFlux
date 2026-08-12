import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

const TYPES: MilestoneType[] = [
  'anniversary',
  'countdown',
  'birthday',
  'holiday',
  'custom',
];
const COLORS = ['#F28B82', '#F2A65A', '#55B9A5', '#6D8DF5', '#8B7EFF'];
const REMINDERS = [0, 1, 3, 7, 30];

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
  const initialRule = initial?.dateRule;
  const initialType = initial?.type ?? template;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [type, setType] = useState<MilestoneType>(initialType);
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
    initial?.color ?? MILESTONE_TYPE_THEME[initialType].color,
  );
  const [error, setError] = useState('');
  const [isRequestingPermission, setIsRequestingPermission] =
    useState(false);

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
    const normalizedStartYear = startYear.trim()
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

  const selectType = (nextType: MilestoneType) => {
    setType(nextType);
    if (!initial || color === MILESTONE_TYPE_THEME[type].color) {
      setColor(MILESTONE_TYPE_THEME[nextType].color);
    }
  };

  const toggleReminder = (offset: number) =>
    setReminderOffsets((current) =>
      current.includes(offset)
        ? current.filter((value) => value !== offset)
        : [...current, offset],
    );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            {initial ? labels.edit : labels.addTemplate}
          </Text>
          <Text style={styles.heading}>
            {labels.templates[type]}
          </Text>
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

      <View style={styles.typeRow}>
        {TYPES.map((item) => (
          <Segment
            key={item}
            label={labels.templates[item]}
            onPress={() => selectType(item)}
            selected={type === item}
          />
        ))}
      </View>

      <View style={styles.formRow}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{labels.calendar}</Text>
          <View style={styles.segmentGroup}>
            <Segment
              label={labels.solar}
              onPress={() => setCalendar('solar')}
              selected={calendar === 'solar'}
            />
            <Segment
              label={labels.lunar}
              onPress={() => setCalendar('lunar')}
              selected={calendar === 'lunar'}
            />
          </View>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{labels.repeat}</Text>
          <View style={styles.segmentGroup}>
            <Segment
              label={labels.repeatYearly}
              onPress={() => setRecurring(true)}
              selected={recurring}
            />
            <Segment
              label={labels.oneTime}
              onPress={() => setRecurring(false)}
              selected={!recurring}
            />
          </View>
        </View>
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
        <NumberField label={labels.month} onChange={setMonth} value={month} />
        <NumberField label={labels.day} onChange={setDay} value={day} />
        <View style={styles.startYearField}>
          <NumberField
            label={labels.startYear}
            onChange={setStartYear}
            value={startYear}
            wide
          />
        </View>
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

      <View style={styles.section}>
        <Text style={styles.fieldLabel}>{labels.reminders}</Text>
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

      <View style={styles.section}>
        <Text style={styles.fieldLabel}>{labels.style}</Text>
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
              <View style={[styles.colorInner, { backgroundColor: item }]} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.fieldLabel}>{labels.notes}</Text>
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
    </View>
  );
};

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
    borderColor: '#DCD9ED',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 18,
    padding: 16,
    shadowColor: '#403B64',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  eyebrow: {
    color: '#8B8C99',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heading: {
    color: '#303145',
    fontSize: 16,
    fontWeight: '700',
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
  titleInput: {
    backgroundColor: '#F8F7FA',
    borderColor: '#DDD9EA',
    borderRadius: 11,
    borderWidth: 1,
    color: '#2E2F42',
    fontSize: 15,
    fontWeight: '600',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  fieldGroup: {
    marginRight: 18,
    marginTop: 8,
  },
  fieldLabel: {
    color: '#7D7E8C',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 5,
  },
  segmentGroup: {
    flexDirection: 'row',
  },
  segment: {
    backgroundColor: '#F3F2F6',
    borderColor: 'transparent',
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
    borderColor: '#D7D1FF',
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
    marginTop: 8,
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
  section: {
    marginTop: 12,
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
    borderRadius: 9,
    height: 18,
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 13,
  },
  actionGap: {
    width: 6,
  },
});

export default MilestoneEditorCard;
