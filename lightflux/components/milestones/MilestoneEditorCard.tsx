import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import useMilestoneDraft from '../../hooks/useMilestoneDraft';
import { Milestone, MilestoneType, NewMilestone } from '../../types/todo';
import ActionButton from '../ui/ActionButton';
import MenuItem from '../ui/MenuItem';
import MenuSurface, { MenuSurfacePosition } from '../ui/MenuSurface';
import NumberField from './fields/NumberField';
import SectionLabel from './fields/SectionLabel';
import Segment from './fields/Segment';
import SelectField from './fields/SelectField';

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
  const entrance = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const compact = width < 560;
  const [picker, setPicker] = useState<'calendar' | 'repeat' | null>(null);
  const [pickerPosition, setPickerPosition] =
    useState<MenuSurfacePosition>();
  const draft = useMilestoneDraft({ initial, labels, onSave, template });

  useEffect(() => {
    Animated.timing(entrance, {
      duration: 170,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [entrance]);

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
            style={[styles.typeIcon, { backgroundColor: `${draft.color}1F` }]}
          >
            <Ionicons
              color={draft.color}
              name={TYPE_ICONS[draft.type]}
              size={20}
            />
          </View>
          <View>
            <Text style={styles.eyebrow}>
              {initial ? labels.edit : labels.add}
            </Text>
            <Text style={styles.heading}>{labels.templates[draft.type]}</Text>
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
          onChangeText={draft.setTitle}
          placeholder={labels.titlePlaceholder}
          placeholderTextColor="#9B9CA8"
          style={styles.titleInput}
          value={draft.title}
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
            value={
              draft.calendar === 'solar' ? labels.solar : labels.lunar
            }
          />
          <SelectField
            icon="repeat-outline"
            label={labels.repeat}
            onOpen={(position) => {
              setPickerPosition(position);
              setPicker('repeat');
            }}
            value={draft.recurring ? labels.repeatYearly : labels.oneTime}
          />
        </View>

        <View style={styles.dateRow}>
          {!draft.recurring ? (
            <NumberField
              label={labels.year}
              onChange={draft.setYear}
              value={draft.year}
              wide
            />
          ) : null}
          <NumberField
            label={labels.month}
            onChange={draft.setMonth}
            value={draft.month}
          />
          <NumberField
            label={labels.day}
            onChange={draft.setDay}
            value={draft.day}
          />
          {draft.recurring ? (
            <View style={styles.startYearField}>
              <NumberField
                label={labels.startYear}
                onChange={draft.setStartYear}
                value={draft.startYear}
                wide
              />
            </View>
          ) : null}
        </View>

        {draft.calendar === 'lunar' ? (
          <View style={styles.policyRow}>
            {Number(draft.day) === 30 ? (
              <Text style={styles.policyHint}>{labels.lunarDayThirtySkip}</Text>
            ) : null}
            <Segment
              label={labels.leapMonth}
              onPress={() => draft.setIsLeapMonth((current) => !current)}
              selected={draft.isLeapMonth}
            />
            {draft.isLeapMonth ? (
              <>
                <Segment
                  label={labels.leapMonthFallback}
                  onPress={() => draft.setMissingLeapMonthPolicy('regular-month')}
                  selected={draft.missingLeapMonthPolicy === 'regular-month'}
                />
                <Segment
                  label={labels.leapMonthSkip}
                  onPress={() => draft.setMissingLeapMonthPolicy('skip-year')}
                  selected={draft.missingLeapMonthPolicy === 'skip-year'}
                />
              </>
            ) : null}
          </View>
        ) : Number(draft.month) === 2 && Number(draft.day) === 29 ? (
          <View style={styles.policyRow}>
            <Text style={styles.fieldLabel}>{labels.februaryFallback}</Text>
            <Segment
              label={labels.february28}
              onPress={() => draft.setLeapDayPolicy('feb-28')}
              selected={draft.leapDayPolicy === 'feb-28'}
            />
            <Segment
              label={labels.march1}
              onPress={() => draft.setLeapDayPolicy('mar-1')}
              selected={draft.leapDayPolicy === 'mar-1'}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.formSection}>
        <SectionLabel icon="notifications-outline" label={labels.reminders} />
        <View style={styles.chipRow}>
          {REMINDERS.map((offset) => (
            <Segment
              key={offset}
              label={labels.reminderDay(offset)}
              onPress={() => draft.toggleReminder(offset)}
              selected={draft.reminderOffsets.includes(offset)}
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
              accessibilityState={{ checked: draft.color === item }}
              key={item}
              onPress={() => draft.setColor(item)}
              style={[
                styles.colorOuter,
                draft.color === item && styles.colorOuterSelected,
              ]}
            >
              <View style={[styles.colorInner, { backgroundColor: item }]}>
                {draft.color === item ? (
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
          onChangeText={draft.setNotes}
          placeholder={labels.notesPlaceholder}
          placeholderTextColor="#9B9CA8"
          style={styles.notesInput}
          value={draft.notes}
        />
      </View>

      {draft.error ? <Text style={styles.error}>{draft.error}</Text> : null}
      <View style={styles.actions}>
        <ActionButton
          label={labels.cancel}
          onPress={onCancel}
          variant="ghost"
        />
        <View style={styles.actionGap} />
        <ActionButton
          disabled={!draft.title.trim() || draft.isRequestingPermission}
          label={labels.save}
          onPress={draft.save}
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
              draft.setCalendar('solar');
              setPicker(null);
            }}
            selected={draft.calendar === 'solar'}
          />
          <MenuItem
            label={labels.lunar}
            onPress={() => {
              draft.setCalendar('lunar');
              setPicker(null);
            }}
            selected={draft.calendar === 'lunar'}
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
              draft.setRecurring(true);
              setPicker(null);
            }}
            selected={draft.recurring}
          />
          <MenuItem
            label={labels.oneTime}
            onPress={() => {
              draft.setRecurring(false);
              setPicker(null);
            }}
            selected={!draft.recurring}
          />
        </MenuSurface>
      ) : null}
    </Animated.View>
  );
};

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
    fontWeight: '600',
    letterSpacing: 0,
  },
  heading: {
    color: '#303145',
    fontSize: 17,
    fontWeight: '600',
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
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
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
    fontWeight: '600',
    minHeight: 46,
    outlineColor: 'transparent',
    paddingHorizontal: 10,
  },
  selectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formSection: {
    borderTopColor: '#ECEAF2',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 13,
  },
  fieldLabel: {
    color: '#7D7E8C',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 5,
  },
  dateRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 7,
  },
  startYearField: {
    marginLeft: 3,
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
