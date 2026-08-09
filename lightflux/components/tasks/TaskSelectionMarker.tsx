import React from 'react';
import { StyleSheet, View } from 'react-native';

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
