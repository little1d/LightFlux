import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

import { NavigationItemId } from '../../types/todo';

interface DraggableNavigationItemProps {
  children: React.ReactNode;
  id: NavigationItemId;
  index: number;
  label: string;
  onMove: (id: NavigationItemId, targetIndex: number) => void;
}

const ITEM_STEP = 60;

const DraggableNavigationItem = ({
  children,
  id,
  index,
  label,
  onMove,
}: DraggableNavigationItemProps) => {
  const [offset, setOffset] = useState(0);
  const latestOffset = useRef(0);
  latestOffset.current = offset;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dy) > 5,
        onPanResponderMove: (_, gesture) => setOffset(gesture.dy),
        onPanResponderRelease: () => {
          const targetIndex =
            index + Math.round(latestOffset.current / ITEM_STEP);
          setOffset(0);
          onMove(id, targetIndex);
        },
        onPanResponderTerminate: () => setOffset(0),
        onStartShouldSetPanResponder: () => false,
      }),
    [id, index, onMove],
  );

  return (
    <View
      {...responder.panHandlers}
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      style={[
        styles.container,
        offset !== 0 && styles.dragging,
        {
          transform: [
            { translateY: offset },
            { scale: offset !== 0 ? 1.06 : 1 },
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
