import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Translation } from '../../content';
import { Language } from '../../types/todo';
import {
  addMonths,
  fromDateKey,
  monthGrid,
  toDateKey,
  todayKey,
} from '../../utils/date';
import IconButton from './IconButton';
import MenuItem from './MenuItem';

interface DatePickerProps {
  /** Currently selected date as YYYY-MM-DD. */
  value: string | null;
  language: Language;
  labels: Translation;
  onSelect: (dateKey: string) => void;
  /**
   * Called whenever the visible month changes. Callers that track the month
   * themselves (the task action menu) pass their setter; callers that only need
   * the grid omit it.
   */
  onChangeMonth?: (month: Date) => void;
  /** Starting month when nothing is selected. Defaults to today. */
  month?: Date;
  /** Shows the "today" and "tomorrow" shortcuts below the grid. */
  shortcuts?: boolean;
}

const localeOf = (language: Language) =>
  language === 'zh' ? 'zh-CN' : 'en-US';

/**
 * The single month-grid date picker used by the quick-add sheet, the editor
 * metadata row, and the task action menu. They used to be three near-identical
 * copies that disagreed on two things: whether today is highlighted, and what
 * the day cells announce to a screen reader. Both answers are now uniform —
 * today is always highlighted, and every cell announces a full date.
 */
const DatePicker = ({
  value,
  language,
  labels,
  onSelect,
  onChangeMonth,
  month,
  shortcuts = false,
}: DatePickerProps) => {
  const [visibleMonth, setVisibleMonth] = useState(
    () => month ?? fromDateKey(value || todayKey()),
  );
  const days = monthGrid(visibleMonth);
  const today = todayKey();
  const locale = localeOf(language);

  const shiftMonth = (amount: number) => {
    const next = addMonths(visibleMonth, amount);
    setVisibleMonth(next);
    onChangeMonth?.(next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          label={labels.calendar.previousMonth}
          onPress={() => shiftMonth(-1)}
          showTooltip={false}
          size="compact"
          variant="transparent"
        />
        <Text style={styles.title}>
          {labels.calendar.monthTitle(
            visibleMonth.getFullYear(),
            visibleMonth.getMonth() + 1,
          )}
        </Text>
        <IconButton
          icon="chevron-forward"
          label={labels.calendar.nextMonth}
          onPress={() => shiftMonth(1)}
          showTooltip={false}
          size="compact"
          variant="transparent"
        />
      </View>
      <View style={styles.weekRow}>
        {labels.calendar.weekdays.map((weekday, index) => (
          <Text key={`${weekday}-${index}`} style={styles.weekday}>
            {weekday}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const inMonth = day.getMonth() === visibleMonth.getMonth();
          const selected = dateKey === value;
          const isToday = dateKey === today;
          return (
            <Pressable
              accessibilityLabel={day.toLocaleDateString(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={dateKey}
              onPress={() => onSelect(dateKey)}
              style={({ pressed }) => [
                styles.day,
                selected && styles.daySelected,
                pressed && !selected && styles.dayPressed,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  !inMonth && styles.dayTextMuted,
                  isToday && !selected && styles.dayTextToday,
                  selected && styles.dayTextSelected,
                ]}
              >
                {day.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {shortcuts ? (
        <View style={styles.shortcuts}>
          <MenuItem
            icon={<Ionicons color="#6F7080" name="today-outline" size={17} />}
            label={labels.editor.scheduleToday}
            onPress={() => {
              const key = todayKey();
              setVisibleMonth(fromDateKey(key));
              onChangeMonth?.(fromDateKey(key));
              onSelect(key);
            }}
          />
          <MenuItem
            icon={
              <Ionicons color="#6F7080" name="arrow-forward-outline" size={17} />
            }
            label={labels.editor.scheduleTomorrow}
            onPress={() => {
              const next = fromDateKey(todayKey());
              next.setDate(next.getDate() + 1);
              setVisibleMonth(next);
              onChangeMonth?.(next);
              onSelect(toDateKey(next));
            }}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#303145',
    fontSize: 13,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  weekday: {
    color: '#9A9BA8',
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  day: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  daySelected: {
    backgroundColor: '#6759E8',
  },
  dayPressed: {
    backgroundColor: '#EEECFF',
  },
  dayText: {
    color: '#3B3C4E',
    fontSize: 12,
    fontWeight: '600',
  },
  dayTextMuted: {
    color: '#C3C4CE',
  },
  dayTextToday: {
    color: '#6759E8',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  shortcuts: {
    borderTopColor: '#ECEBF1',
    borderTopWidth: 1,
    marginTop: 6,
    paddingTop: 4,
  },
});

export default DatePicker;
