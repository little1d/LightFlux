import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Translation } from '../../i18n/translations';
import { Milestone } from '../../types/todo';
import { MilestoneOccurrence } from '../../utils/milestoneDate';
import { OpenMilestoneMenu, useMilestoneContextMenu } from './useMilestoneContextMenu';

interface MilestoneCardProps {
  labels: Translation['milestones'];
  language: 'zh' | 'en';
  milestone: Milestone;
  occurrence: MilestoneOccurrence | null;
  onOpenMenu: OpenMilestoneMenu;
  onSelect: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  selected: boolean;
}

const MilestoneCard = ({
  labels,
  language,
  milestone,
  occurrence,
  onOpenMenu,
  onSelect,
  onTogglePin,
  selected,
}: MilestoneCardProps) => {
  const [hovered, setHovered] = useState(false);
  const { targetRef, openFromButton, openFromLongPress } =
    useMilestoneContextMenu(milestone.id, onOpenMenu);
  const status =
    !occurrence
      ? '—'
      : occurrence.daysFrom === 0
        ? labels.today
        : occurrence.daysFrom === 1
          ? labels.tomorrow
          : occurrence.daysFrom > 0
            ? labels.remainingDays(occurrence.daysFrom)
            : labels.pastDays(Math.abs(occurrence.daysFrom));
  const sequence =
    occurrence?.sequenceNumber && occurrence.sequenceNumber > 0
      ? milestone.type === 'birthday'
        ? labels.birthdayYears(occurrence.sequenceNumber)
        : labels.anniversaryYears(occurrence.sequenceNumber)
      : null;

  return (
    <View
      accessibilityState={{ selected }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      ref={targetRef}
      style={[
        styles.card,
        { borderColor: selected ? '#BDB5F5' : '#E6E4EB' },
        selected && styles.selected,
        hovered && styles.hovered,
      ]}
    >
      <Pressable
        accessibilityLabel={`${milestone.title}, ${status}`}
        accessibilityRole="button"
        delayLongPress={350}
        onLongPress={openFromLongPress}
        onPress={() => onSelect(milestone.id)}
        style={styles.content}
      >
        <View style={styles.titleRow}>
          <View
            style={[
              styles.icon,
              { backgroundColor: `${milestone.color}24` },
            ]}
          >
            <Ionicons
              color={milestone.color}
              name={
                milestone.icon as React.ComponentProps<typeof Ionicons>['name']
              }
              size={18}
            />
          </View>
          <View style={styles.titleText}>
            <Text numberOfLines={1} style={styles.title}>
              {milestone.title}
            </Text>
            <Text style={styles.type}>
              {labels.templates[milestone.type]}
              {milestone.dateRule.calendar === 'lunar'
                ? ` · ${labels.lunarDate}`
                : ''}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.status,
            occurrence?.daysFrom === 0 && { color: milestone.color },
          ]}
        >
          {status}
        </Text>
        {sequence ? <Text style={styles.sequence}>{sequence}</Text> : null}
        <Text style={styles.date}>
          {occurrence
            ? occurrence.date.toLocaleDateString(
                language === 'zh' ? 'zh-CN' : 'en-US',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                },
              )
            : labels.invalidDate}
        </Text>
        {milestone.reminderOffsets.length > 0 ? (
          <Text style={styles.reminder}>
            {labels.reminderDay(Math.max(...milestone.reminderOffsets))}
          </Text>
        ) : null}
      </Pressable>

      <View style={[styles.actions, !hovered && !selected && styles.actionsIdle]}>
        <Pressable
          accessibilityLabel={milestone.pinned ? labels.unpin : labels.pin}
          accessibilityRole="button"
          onPress={() => onTogglePin(milestone.id, !milestone.pinned)}
          style={({ pressed }) => [
            styles.iconButton,
            milestone.pinned && styles.iconButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            color={milestone.pinned ? '#6759E8' : '#777887'}
            name={milestone.pinned ? 'pin' : 'pin-outline'}
            size={16}
          />
        </Pressable>
        <Pressable
          accessibilityLabel={labels.moreActions}
          accessibilityRole="button"
          onPress={openFromButton}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color="#777887" name="ellipsis-horizontal" size={18} />
        </Pressable>
      </View>

      {milestone.archivedAt ? (
        <View style={styles.archivedBadge}>
          <Text style={styles.archivedText}>{labels.archived}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 245,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#444052',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  selected: {
    backgroundColor: '#FBFAFF',
    shadowColor: '#6759E8',
    shadowOpacity: 0.14,
  },
  hovered: {
    shadowOpacity: 0.11,
    transform: [{ translateY: -2 }],
  },
  content: {
    flex: 1,
    padding: 17,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingRight: 72,
  },
  icon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  titleText: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: '#303145',
    fontSize: 15,
    fontWeight: '700',
  },
  type: {
    color: '#92939F',
    fontSize: 10,
    marginTop: 2,
  },
  status: {
    color: '#547CF2',
    fontSize: 31,
    fontWeight: '300',
    letterSpacing: -1,
    marginTop: 34,
    textAlign: 'center',
  },
  sequence: {
    color: '#747585',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  date: {
    color: '#9697A3',
    fontSize: 11,
    marginTop: 22,
    textAlign: 'center',
  },
  reminder: {
    color: '#A1A2AD',
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    position: 'absolute',
    right: 11,
    top: 11,
  },
  actionsIdle: {
    opacity: 0.46,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#F2F1F5',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    marginLeft: 5,
    width: 32,
  },
  iconButtonActive: {
    backgroundColor: '#ECE9FF',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  archivedBadge: {
    backgroundColor: '#EEEDEF',
    borderRadius: 8,
    bottom: 10,
    left: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    position: 'absolute',
  },
  archivedText: {
    color: '#777887',
    fontSize: 9,
    fontWeight: '700',
  },
});

export default MilestoneCard;
