import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COMPACT_MOBILE_HEIGHT_BREAKPOINT } from '../../config/layout';

const FLOATING_GAP = 12;
const NAVIGATION_DIVIDER_WIDTH = 1;

const MobileQuickAddButton = ({
  insideContentPane = false,
  label,
  onPress,
}: {
  insideContentPane?: boolean;
  label: string;
  onPress: () => void;
}) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigationHeight =
    height < COMPACT_MOBILE_HEIGHT_BREAKPOINT ? 48 : 58;

  return (
    <View
      style={[
        styles.position,
        {
          bottom: insideContentPane
            ? FLOATING_GAP - NAVIGATION_DIVIDER_WIDTH
            : navigationHeight + insets.bottom + FLOATING_GAP,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Ionicons color="#FFFFFF" name="add" size={27} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  position: {
    position: 'absolute',
    right: 18,
    zIndex: 60,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    shadowColor: '#6759E8',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    width: 52,
  },
  buttonPressed: {
    backgroundColor: '#594CCD',
    transform: [{ scale: 0.94 }],
  },
});

export default MobileQuickAddButton;
