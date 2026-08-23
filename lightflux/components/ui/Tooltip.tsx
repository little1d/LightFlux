import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

interface TooltipProps {
  appearance?: 'dark' | 'light';
  label: string;
  position?: TooltipPosition;
  visible: boolean;
}

const Tooltip = ({
  appearance = 'dark',
  label,
  position = 'top',
  visible,
}: TooltipProps) => {
  if (!visible || Platform.OS !== 'web') {
    return null;
  }

  return (
    <View
      accessibilityElementsHidden
      aria-hidden
      style={[
        styles.tooltip,
        appearance === 'light' && styles.tooltipLight,
        styles[position],
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.label, appearance === 'light' && styles.labelLight]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    backgroundColor: '#292837',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    pointerEvents: 'none',
    position: 'absolute',
    shadowColor: '#1D1B2A',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    zIndex: 5000,
  },
  tooltipLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E0E7',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    shadowColor: '#272533',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  labelLight: {
    color: '#3A3B48',
    fontSize: 12,
    fontWeight: '400',
  },
  top: {
    alignSelf: 'center',
    bottom: '100%',
    marginBottom: 8,
  },
  right: {
    left: '100%',
    marginLeft: 8,
    top: 2,
  },
  bottom: {
    alignSelf: 'center',
    marginTop: 8,
    top: '100%',
  },
  left: {
    marginRight: 8,
    right: '100%',
    top: 2,
  },
});

export default Tooltip;
