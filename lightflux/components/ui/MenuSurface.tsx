import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const opacity = useRef(new Animated.Value(0)).current;
  const motion = useRef(new Animated.Value(0)).current;
  const viewport = useWindowDimensions();

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 110,
        toValue: 1,
        useNativeDriver,
      }),
      Animated.spring(motion, {
        damping: 18,
        mass: 0.7,
        stiffness: 230,
        toValue: 1,
        useNativeDriver,
      }),
    ]).start();
  }, [motion, opacity]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const resolvedWebWidth = Math.min(
    width,
    Math.max(0, viewport.width - 24),
  );
  const surfacePosition =
    Platform.OS === 'web' && position
      ? {
          left: Math.max(
            12,
            Math.min(
              position.x,
              viewport.width - resolvedWebWidth - 12,
            ),
          ),
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
          {
            width:
              Platform.OS === 'web' ? resolvedWebWidth : undefined,
          },
          surfacePosition,
        ]}
      >
        <Animated.View
          accessibilityRole="menu"
          style={[
            styles.surface,
            {
              opacity,
              transform: [
                {
                  translateY: motion.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
                {
                  scale: motion.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.975, 1],
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
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
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
    padding: 6,
    shadowColor: '#242235',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 22,
  },
});

export default MenuSurface;
