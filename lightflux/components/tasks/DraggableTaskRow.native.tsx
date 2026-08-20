import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface DraggableTaskRowProps {
  children: React.ReactNode;
  id: string;
  index: number;
  label: string;
  nested: boolean;
  onMove: (id: string, targetIndex: number) => void;
  scopeId: string;
}

const DraggableTaskRow = ({
  children,
  id,
  index,
  label,
  nested,
  onMove,
}: DraggableTaskRowProps) => {
  const defaultRowStep = nested ? 42 : 52;
  const [dragOffset, setDragOffset] = useState(0);
  const latestOffset = useRef(0);
  const rowStep = useRef(defaultRowStep);

  const resetDrag = () => {
    latestOffset.current = 0;
    setDragOffset(0);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 4,
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          latestOffset.current = 0;
          setDragOffset(0);
        },
        onPanResponderMove: (_, gesture) => {
          latestOffset.current = gesture.dy;
          setDragOffset(gesture.dy);
        },
        onPanResponderRelease: () => {
          const targetIndex =
            index + Math.round(latestOffset.current / rowStep.current);
          resetDrag();
          if (targetIndex !== index) {
            onMove(id, targetIndex);
          }
        },
        onPanResponderTerminate: resetDrag,
        onPanResponderTerminationRequest: () => false,
        onStartShouldSetPanResponder: () => true,
        onShouldBlockNativeResponder: () => true,
      }),
    [id, index, onMove],
  );

  return (
    <View
      accessibilityLabel={label}
      onLayout={(event) => {
        rowStep.current = Math.max(
          1,
          event.nativeEvent.layout.height + styles.container.marginBottom,
        );
      }}
      style={[
        styles.container,
        dragOffset !== 0 && styles.dragging,
        {
          borderRadius: nested ? 9 : 12,
          transform: [
            { translateY: dragOffset },
            { scale: dragOffset !== 0 ? 1.012 : 1 },
          ],
        },
      ]}
    >
      <View
        {...responder.panHandlers}
        accessibilityLabel={label}
        accessibilityRole="adjustable"
        accessibilityActions={[
          { name: 'decrement', label },
          { name: 'increment', label },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'decrement') {
            onMove(id, index - 1);
          } else if (event.nativeEvent.actionName === 'increment') {
            onMove(id, index + 1);
          }
        }}
        style={[
          styles.handle,
          {
            left: nested ? -2 : -14,
          },
        ]}
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
    backgroundColor: '#F0EEFF',
    elevation: 7,
    opacity: 0.7,
    shadowColor: '#3A3178',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    zIndex: 10,
  },
  handle: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    top: 3,
    width: 28,
    zIndex: 2,
  },
  handleText: {
    color: '#A3A2AD',
    fontSize: 12,
  },
});

export default DraggableTaskRow;
