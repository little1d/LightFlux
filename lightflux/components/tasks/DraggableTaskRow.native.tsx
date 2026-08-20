import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  taskDragDisplacement,
  taskRowStep,
  type TaskDragState,
} from './taskDrag';

interface DraggableTaskRowProps {
  children: React.ReactNode;
  dragState: TaskDragState | null;
  id: string;
  index: number;
  itemCount: number;
  label: string;
  nested: boolean;
  onDragStateChange: (state: TaskDragState | null) => void;
  onMove: (id: string, targetIndex: number) => void;
  scopeId: string;
}

const DraggableTaskRow = ({
  children,
  dragState,
  id,
  index,
  itemCount,
  label,
  nested,
  onDragStateChange,
  onMove,
  scopeId,
}: DraggableTaskRowProps) => {
  const defaultRowStep = taskRowStep(nested);
  const [dragOffset, setDragOffset] = useState(0);
  const latestOffset = useRef(0);
  const rowStep = useRef(defaultRowStep);
  const shift = useRef(new Animated.Value(0)).current;
  const displacement = taskDragDisplacement({
    dragState,
    id,
    index,
    nested,
    scopeId,
  });
  const targeted =
    Boolean(dragState) &&
    dragState?.id !== id &&
    dragState?.scopeId === scopeId &&
    dragState?.targetIndex === index;
  const targetAfter =
    targeted &&
    (dragState?.targetIndex ?? 0) > (dragState?.sourceIndex ?? 0);

  useEffect(() => {
    Animated.timing(shift, {
      duration: 150,
      toValue: displacement,
      useNativeDriver: true,
    }).start();
  }, [displacement, shift]);

  const resetDrag = () => {
    latestOffset.current = 0;
    setDragOffset(0);
    onDragStateChange(null);
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
          onDragStateChange({
            id,
            scopeId,
            sourceIndex: index,
            targetIndex: index,
          });
        },
        onPanResponderMove: (_, gesture) => {
          latestOffset.current = gesture.dy;
          setDragOffset(gesture.dy);
          onDragStateChange({
            id,
            scopeId,
            sourceIndex: index,
            targetIndex: Math.max(
              0,
              Math.min(
                index + Math.round(gesture.dy / rowStep.current),
                itemCount - 1,
              ),
            ),
          });
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
    [
      id,
      index,
      itemCount,
      onDragStateChange,
      onMove,
      scopeId,
    ],
  );

  return (
    <Animated.View
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
            {
              translateY:
                dragOffset !== 0 ? dragOffset : shift,
            },
            { scale: dragOffset !== 0 ? 1.012 : 1 },
          ],
        },
      ]}
    >
      {targeted ? (
        <View
          pointerEvents="none"
          style={[
            styles.dropIndicator,
            nested && styles.dropIndicatorNested,
            targetAfter
              ? styles.dropIndicatorAfter
              : styles.dropIndicatorBefore,
          ]}
        />
      ) : null}
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
    </Animated.View>
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
  dropIndicator: {
    backgroundColor: '#786AF0',
    borderRadius: 2,
    height: 2,
    left: 4,
    position: 'absolute',
    right: 4,
    zIndex: 20,
  },
  dropIndicatorNested: {
    left: 22,
  },
  dropIndicatorBefore: {
    top: -2,
  },
  dropIndicatorAfter: {
    bottom: -2,
  },
});

export default DraggableTaskRow;
