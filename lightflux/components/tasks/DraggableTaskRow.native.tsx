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
  const rowStep = nested ? 42 : 52;
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
            index + Math.round(latestOffset.current / rowStep);
          setDragOffset(0);
          onMove(id, targetIndex);
        },
        onPanResponderTerminate: () => setDragOffset(0),
        onStartShouldSetPanResponder: () => true,
      }),
    [id, index, onMove, rowStep],
  );

  return (
    <View
      accessibilityLabel={label}
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
        style={[
          styles.handle,
          {
            left: nested ? 0 : -14,
            width: nested ? 22 : 14,
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
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    top: 7,
    zIndex: 2,
  },
  handleText: {
    color: '#A3A2AD',
    fontSize: 12,
  },
});

export default DraggableTaskRow;
