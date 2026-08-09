import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

const Toast = ({ message, onDismiss }: ToastProps) => {
  const progress = useRef(new Animated.Value(0)).current;
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    Animated.spring(progress, {
      damping: 18,
      mass: 0.7,
      stiffness: 240,
      toValue: 1,
      useNativeDriver,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(progress, {
        duration: 130,
        toValue: 0,
        useNativeDriver,
      }).start(({ finished }) => {
        if (finished) {
          dismissRef.current();
        }
      });
    }, 1800);

    return () => {
      clearTimeout(timer);
      progress.stopAnimation();
    };
  }, [progress]);

  return (
    <View style={styles.overlay}>
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.toast,
          {
            opacity: progress,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons color="#FFFFFF" name="checkmark-circle" size={17} />
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    bottom: 24,
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    zIndex: 4000,
  },
  toast: {
    alignItems: 'center',
    backgroundColor: '#303142',
    borderRadius: 12,
    flexDirection: 'row',
    minHeight: 40,
    paddingHorizontal: 14,
    shadowColor: '#242235',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default Toast;
