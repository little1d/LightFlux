import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface DraggableSubtaskProps {
  children: React.ReactNode;
  id: string;
  index: number;
  label: string;
  onMove: (id: string, targetIndex: number) => void;
  parentId: string;
}

const ROW_HEIGHT = 42;

const DraggableSubtask = ({
  children,
  id,
  index,
  label,
  onMove,
}: DraggableSubtaskProps) => {
  const [dragOffset, setDragOffset] = useState(0);
  const latestOffset = useRef(0);
  latestOffset.current = dragOffset;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 5,
        onPanResponderGrant: () => setDragOffset(0),
        onPanResponderMove: (_, gesture) => setDragOffset(gesture.dy),
        onPanResponderRelease: () => {
          const targetIndex =
            index + Math.round(latestOffset.current / ROW_HEIGHT);
          setDragOffset(0);
          onMove(id, targetIndex);
        },
        onPanResponderTerminate: () => setDragOffset(0),
        onStartShouldSetPanResponder: () => true,
      }),
    [id, index, onMove],
  );

  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.container,
        dragOffset !== 0 && styles.dragging,
        { transform: [{ translateY: dragOffset }] },
      ]}
    >
      <View
        {...responder.panHandlers}
        accessibilityLabel={label}
        accessibilityRole="adjustable"
        style={styles.handle}
      >
        <Text style={styles.handleText}>⠿</Text>
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 2,
    position: 'relative',
    zIndex: 0,
  },
  dragging: {
    opacity: 0.55,
    zIndex: 10,
  },
  handle: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 6,
    width: 22,
    zIndex: 2,
  },
  handleText: {
    color: '#A3A2AD',
    fontSize: 12,
  },
});

export default DraggableSubtask;
