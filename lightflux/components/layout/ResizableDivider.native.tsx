import React, { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

interface ResizableDividerProps {
  label: string;
  maxWidth: number;
  minWidth: number;
  onResize: (width: number) => void;
  width: number;
}

const ResizableDivider = ({
  label,
  maxWidth,
  minWidth,
  onResize,
  width,
}: ResizableDividerProps) => {
  const dragStartWidth = useRef(width);
  const currentWidth = useRef(width);
  currentWidth.current = width;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 2,
        onPanResponderGrant: () => {
          dragStartWidth.current = currentWidth.current;
        },
        onPanResponderMove: (_, gesture) => {
          onResize(
            Math.min(
              maxWidth,
              Math.max(minWidth, dragStartWidth.current + gesture.dx),
            ),
          );
        },
        onStartShouldSetPanResponder: () => true,
      }),
    [maxWidth, minWidth, onResize],
  );

  return (
    <View
      {...responder.panHandlers}
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      style={styles.divider}
    >
      <View style={styles.handle} />
    </View>
  );
};

const styles = StyleSheet.create({
  divider: {
    alignItems: 'center',
    backgroundColor: '#F7F6FA',
    borderLeftColor: '#E4E3E9',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E4E3E9',
    borderRightWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    width: 8,
  },
  handle: {
    backgroundColor: '#C7C4D2',
    borderRadius: 2,
    height: 44,
    width: 3,
  },
});

export default ResizableDivider;
