import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import type { TodoPriority } from '../../../types/todo';
import MenuItem from '../../ui/MenuItem';
import { TaskPriorityIcon } from '../TaskPriorityIndicator';

const PRIORITIES: TodoPriority[] = ['none', 'high', 'medium', 'low'];

interface PriorityPickerListProps {
  labels: Record<TodoPriority, string>;
  onSelect: (priority: TodoPriority) => void;
  value: TodoPriority;
}

const PriorityPickerList = ({
  labels,
  onSelect,
  value,
}: PriorityPickerListProps) => (
  <View style={styles.priorityList}>
    {PRIORITIES.map((priority) => (
      <MenuItem
        icon={<TaskPriorityIcon priority={priority} size={17} />}
        key={priority}
        label={labels[priority]}
        onPress={() => onSelect(priority)}
        selected={value === priority}
        trailing={
          value === priority ? (
            <Ionicons color="#6759E8" name="checkmark" size={17} />
          ) : null
        }
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  priorityList: {
    paddingBottom: 4,
  },
});

export default PriorityPickerList;
