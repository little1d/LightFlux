import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

import { NavigationItemId } from '../../types/todo';
import {
  NAVIGATION_ITEM_STEP,
  NavigationDragState,
} from './navigationDrag';

interface DraggableNavigationItemProps {
  children: React.ReactNode;
  dragState: NavigationDragState | null;
  id: NavigationItemId;
  index: number;
  itemCount: number;
  label: string;
  onDragStateChange: (state: NavigationDragState | null) => void;
  onMove: (id: NavigationItemId, targetIndex: number) => void;
}

const DraggableNavigationItem = ({
  children,
  dragState,
  id,
  index,
  itemCount,
  label,
  onDragStateChange,
  onMove,
}: DraggableNavigationItemProps) => {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const latestOffset = useRef(0);
  latestOffset.current = offset;
  const stateRef = useRef({ id, index, itemCount, onDragStateChange, onMove });
  stateRef.current = { id, index, itemCount, onDragStateChange, onMove };

  const clampTarget = (raw: number) =>
    Math.max(0, Math.min(raw, stateRef.current.itemCount - 1));

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dy) > 5,
        onPanResponderMove: (_, gesture) => {
          setOffset(gesture.dy);
          setDragging(true);
          const { id: liveId, index: liveIndex, onDragStateChange: report } =
            stateRef.current;
          report({
            id: liveId,
            sourceIndex: liveIndex,
            targetIndex: clampTarget(
              liveIndex + Math.round(gesture.dy / NAVIGATION_ITEM_STEP),
            ),
          });
        },
        onPanResponderRelease: () => {
          const { id: liveId, index: liveIndex, onMove: move } =
            stateRef.current;
          const targetIndex = clampTarget(
            liveIndex + Math.round(latestOffset.current / NAVIGATION_ITEM_STEP),
          );
          setOffset(0);
          setDragging(false);
          stateRef.current.onDragStateChange(null);
          move(liveId, targetIndex);
        },
        onPanResponderTerminate: () => {
          setOffset(0);
          setDragging(false);
          stateRef.current.onDragStateChange(null);
        },
        onStartShouldSetPanResponder: () => false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  let displacement = 0;
  if (dragState && !dragging && dragState.id !== id) {
    const { sourceIndex, targetIndex } = dragState;
    if (
      targetIndex > sourceIndex &&
      index > sourceIndex &&
      index <= targetIndex
    ) {
      displacement = -NAVIGATION_ITEM_STEP;
    } else if (
      targetIndex < sourceIndex &&
      index >= targetIndex &&
      index < sourceIndex
    ) {
      displacement = NAVIGATION_ITEM_STEP;
    }
  }

  return (
    <View
      {...responder.panHandlers}
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      style={[
        styles.container,
        dragging && styles.dragging,
        {
          transform: [
            { translateY: dragging ? offset : displacement },
            { scale: dragging ? 1.06 : 1 },
          ],
        },
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    borderRadius: 15,
    marginBottom: 12,
    zIndex: 0,
  },
  dragging: {
    backgroundColor: '#ECE9FF',
    elevation: 8,
    opacity: 0.68,
    shadowColor: '#3A3178',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    zIndex: 10,
  },
});

export default DraggableNavigationItem;
