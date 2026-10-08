import Ionicons from '@expo/vector-icons/Ionicons';
import {
  FlatList,
  StyleSheet,
  View,
} from 'react-native';

import { Translation } from '../../content';
import { TASK_TIME_OPTIONS } from '../../utils/taskTime';
import MenuItem from '../ui/MenuItem';

const TaskTimePicker = ({
  labels,
  onSelect,
  value,
}: {
  labels: Translation;
  onSelect: (value: string | null) => void;
  value: string | null;
}) => {
  const options =
    value && !TASK_TIME_OPTIONS.includes(value)
      ? [...TASK_TIME_OPTIONS, value].sort()
      : TASK_TIME_OPTIONS;

  return (
    <View style={styles.container}>
      <MenuItem
        icon={<Ionicons color="#777888" name="sunny-outline" size={17} />}
        label={labels.editor.allDay}
        onPress={() => onSelect(null)}
        selected={value === null}
        trailing={
          value === null ? (
            <Ionicons color="#6759E8" name="checkmark" size={17} />
          ) : null
        }
      />
      <View style={styles.divider} />
      <FlatList
        contentContainerStyle={styles.options}
        data={options}
        getItemLayout={(_data, index) => ({
          index,
          length: 44,
          offset: index * 44,
        })}
        keyExtractor={(time) => time}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: time }) => (
          <MenuItem
            label={time}
            onPress={() => onSelect(time)}
            selected={value === time}
            trailing={
              value === time ? (
                <Ionicons color="#6759E8" name="checkmark" size={17} />
              ) : null
            }
          />
        )}
        showsVerticalScrollIndicator
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 6,
  },
  divider: {
    backgroundColor: '#ECEAF1',
    height: 1,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  list: {
    maxHeight: 264,
  },
  options: {
    paddingBottom: 2,
  },
});

export default TaskTimePicker;
