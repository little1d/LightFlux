import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type ToastVariant = 'success' | 'error' | 'celebrate';

interface ToastProps {
  dismissLabel: string;
  index?: number;
  message: string;
  onDismiss: () => void;
  variant?: ToastVariant;
}

const THEMES: Record<
  ToastVariant,
  {
    accent: string;
    background: string;
    border: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    iconBackground: string;
    text: string;
  }
> = {
  success: {
    accent: '#6759E8',
    background: '#FFFFFF',
    border: '#DDD9F6',
    icon: 'checkmark',
    iconBackground: '#EEECFF',
    text: '#373648',
  },
  celebrate: {
    accent: '#B77B08',
    background: '#FFFDF7',
    border: '#F0DFC0',
    icon: 'sparkles',
    iconBackground: '#FFF1CF',
    text: '#443A28',
  },
  error: {
    accent: '#C45162',
    background: '#FFF8F9',
    border: '#F0D3D8',
    icon: 'alert-circle',
    iconBackground: '#FCE8EB',
    text: '#4A3036',
  },
};

const DISPLAY_MS = 3000;

const Toast = ({
  dismissLabel,
  index = 0,
  message,
  onDismiss,
  variant = 'success',
}: ToastProps) => {
  const progress = useRef(new Animated.Value(0)).current;
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const theme = THEMES[variant];

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    Animated.spring(progress, {
      damping: 19,
      mass: 0.72,
      stiffness: 245,
      toValue: 1,
      useNativeDriver,
    }).start();

    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      Animated.timing(progress, {
        duration: 150,
        toValue: 0,
        useNativeDriver,
      }).start();
      dismissTimer = setTimeout(() => dismissRef.current(), 180);
    }, DISPLAY_MS);

    return () => {
      clearTimeout(timer);
      if (dismissTimer) {
        clearTimeout(dismissTimer);
      }
      progress.stopAnimation();
    };
  }, [progress]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          marginTop: index === 0 ? 0 : 8,
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.97, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: theme.accent }]} />
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.iconBackground },
        ]}
      >
        <Ionicons color={theme.accent} name={theme.icon} size={15} />
      </View>
      <Text numberOfLines={3} style={[styles.message, { color: theme.text }]}>
        {message}
      </Text>
      <Pressable
        accessibilityLabel={dismissLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onDismiss}
        style={({ pressed }) => [
          styles.dismiss,
          pressed && styles.dismissPressed,
        ]}
      >
        <Ionicons color="#92909E" name="close" size={14} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 16,
    maxWidth: 420,
    minHeight: 48,
    overflow: 'hidden',
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    shadowColor: '#262337',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  accent: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 9,
    height: 28,
    justifyContent: 'center',
    marginRight: 10,
    width: 28,
  },
  message: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  dismiss: {
    alignItems: 'center',
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    marginLeft: 8,
    width: 28,
  },
  dismissPressed: {
    backgroundColor: '#EFEDF3',
    transform: [{ scale: 0.94 }],
  },
});

export default Toast;
