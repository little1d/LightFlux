import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

export interface MenuSurfacePosition {
  x: number;
  y: number;
}

interface MenuSurfaceProps {
  children: React.ReactNode;
  closeLabel?: string;
  estimatedHeight?: number;
  onClose: () => void;
  position?: MenuSurfacePosition;
  width?: number;
}

const MenuSurface = ({
  children,
  closeLabel = 'Close menu',
  estimatedHeight = 220,
  onClose,
  position,
  width = 220,
}: MenuSurfaceProps) => {
  const entrance = useRef(new Animated.Value(0)).current;
  const viewport = useWindowDimensions();

  useEffect(() => {
    Animated.timing(entrance, {
      duration: 140,
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [entrance]);

  const surfacePosition =
    Platform.OS === 'web' && position
      ? {
          left: Math.max(12, Math.min(position.x, viewport.width - width - 12)),
          top: Math.max(
            12,
            Math.min(position.y, viewport.height - estimatedHeight - 12),
          ),
        }
      : undefined;

  const content = (
    <View style={styles.overlay}>
      <Pressable
        accessibilityLabel={closeLabel}
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView
        style={[
          styles.position,
          position && Platform.OS === 'web'
            ? styles.webPosition
            : styles.mobilePosition,
          { width: Platform.OS === 'web' ? width : undefined },
          surfacePosition,
        ]}
      >
        <Animated.View
          accessibilityRole="menu"
          style={[
            styles.surface,
            {
              opacity: entrance,
              transform: [
                {
                  translateY: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-7, 0],
                  }),
                },
                {
                  scale: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      </SafeAreaView>
    </View>
  );

  if (Platform.OS === 'web') {
    return <View style={styles.webOverlay}>{content}</View>;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible
    >
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  webOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
  position: {
    position: 'absolute',
  },
  webPosition: {},
  mobilePosition: {
    bottom: 12,
    left: 16,
    right: 16,
    width: undefined,
  },
  surface: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E0E7',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 5,
    shadowColor: '#242235',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 22,
  },
});

export default MenuSurface;
