import Ionicons from '@expo/vector-icons/Ionicons';
import React, { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Translation } from '../../i18n/translations';
import { Language, Todo } from '../../types/todo';
import { fromDateKey } from '../../utils/date';

const MetadataChip = ({
  icon,
  label,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
}) => (
  <View style={styles.chip}>
    <Ionicons color="#777888" name={icon} size={13} />
    <Text numberOfLines={1} style={styles.chipText}>
      {label}
    </Text>
  </View>
);

const TaskEditorMetadata = ({
  groupName,
  labels,
  language,
  todo,
}: {
  groupName: string;
  labels: Translation;
  language: Language;
  todo: Todo;
}) => {
  const dateLabel = fromDateKey(todo.scheduledDate).toLocaleDateString(
    language === 'zh' ? 'zh-CN' : 'en-US',
    { day: 'numeric', month: 'short', weekday: 'short' },
  );

  return (
    <View style={styles.container}>
      <MetadataChip icon="calendar-outline" label={dateLabel} />
      <MetadataChip icon="folder-outline" label={groupName} />
      <MetadataChip
        icon="flag-outline"
        label={labels.taskMenu.priorityOptions[todo.priority]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#F2F1F6',
    borderColor: '#E7E5EC',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 30,
    paddingHorizontal: 9,
  },
  chipText: {
    color: '#666778',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
    maxWidth: 180,
  },
});

export default TaskEditorMetadata;
