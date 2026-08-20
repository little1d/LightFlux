import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clampMenuPosition } from './menuPosition';
import Portal from './Portal';

export interface MenuSurfacePosition {
  x: number;
  y: number;
}

// React Native Web makes every View `position: relative` by default, so a
// plain `absolute` overlay resolves against the nearest ancestor View instead
// of the window. That doubled the menu's viewport coordinates and pushed menus
// triggered far from the top-left (e.g. the Settings language select) fully
// off-screen. `fixed` anchors the overlay to the viewport regardless of
// ancestor positioning. RNW supports it at runtime even though its style types
// omit the value, so it is applied through a cast.
const webFixedPosition = { position: 'fixed' } as unknown as ViewStyle;

interface MenuSurfaceProps {
  allowOverflow?: boolean;
  children: React.ReactNode;
  closeLabel?: string;
  estimatedHeight?: number;
  onClose: () => void;
  position?: MenuSurfacePosition;
  presentation?: 'menu' | 'sheet';
  width?: number;
}

const MenuSurface = ({
  allowOverflow = false,
  children,
  closeLabel = 'Close menu',
  estimatedHeight = 220,
  onClose,
  position,
  presentation = 'menu',
  width = 220,
}: MenuSurfaceProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const motion = useRef(new Animated.Value(0)).current;
  const viewport = useWindowDimensions();
  const isSheet = presentation === 'sheet';

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
    position && !isSheet
      ? (() => {
          const clamped = clampMenuPosition(
            position,
            viewport,
            resolvedWebWidth,
            estimatedHeight,
          );
          return { left: clamped.x, top: clamped.y };
        })()
      : undefined;
  const isAnchored = Boolean(position) && !isSheet;

  const surface = (
    <SafeAreaView
      edges={isSheet ? ['bottom'] : []}
      style={[
        !isSheet && styles.position,
        isSheet
          ? styles.sheetPosition
          : isAnchored
            ? styles.anchoredPosition
            : styles.mobilePosition,
        {
          width: isAnchored ? resolvedWebWidth : undefined,
        },
        surfacePosition,
      ]}
    >
      <Animated.View
        accessibilityRole="menu"
        style={[
          styles.surface,
          isSheet && styles.sheetSurface,
          allowOverflow && styles.surfaceOverflow,
          {
            maxHeight: isSheet
              ? Math.max(240, Math.round(viewport.height * 0.82))
              : undefined,
            opacity,
            transform: [
              {
                translateY: motion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [isSheet ? 22 : -8, 0],
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
  );

  const content = (
    <View style={[styles.overlay, isSheet && styles.sheetOverlay]}>
      <Pressable
        accessibilityLabel={closeLabel}
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      {isSheet ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.sheetKeyboardAvoider}
        >
          {surface}
        </KeyboardAvoidingView>
      ) : (
        surface
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    // Portal to document.body so the overlay lives in the root stacking
    // context. Otherwise RNW's per-View stacking contexts and the Settings
    // cards' `overflow: hidden` clip the menu or paint it behind later
    // sections (the language dropdown vanishing under the statistics block).
    return (
      <Portal>
        <View style={[styles.webOverlay, webFixedPosition]}>{content}</View>
      </Portal>
    );
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
  sheetOverlay: {
    backgroundColor: 'rgba(31, 30, 43, 0.18)',
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
  anchoredPosition: {},
  mobilePosition: {
    bottom: 12,
    left: 16,
    right: 16,
    width: undefined,
  },
  sheetPosition: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    width: '100%',
  },
  sheetKeyboardAvoider: {
    flex: 1,
    justifyContent: 'flex-end',
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
  surfaceOverflow: {
    overflow: 'visible',
  },
  sheetSurface: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
});

export default MenuSurface;
