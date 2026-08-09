import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

export const TASK_SELECTED_ROW_STYLE: ViewStyle = {
  backgroundColor: '#EEECFF',
  borderColor: '#D7D2FF',
  borderWidth: 1,
  elevation: 2,
  shadowColor: '#6759E8',
  shadowOffset: { height: 2, width: 0 },
  shadowOpacity: 0.1,
  shadowRadius: 6,
};

const TaskSelectionMarker = ({ visible }: { visible: boolean }) =>
  visible ? (
    <View style={styles.marker} />
  ) : null;

const styles = StyleSheet.create({
  marker: {
    backgroundColor: '#6759E8',
    borderRadius: 2,
    height: 20,
    left: 0,
    marginTop: -10,
    pointerEvents: 'none',
    position: 'absolute',
    top: '50%',
    width: 3,
  },
});

export default TaskSelectionMarker;
