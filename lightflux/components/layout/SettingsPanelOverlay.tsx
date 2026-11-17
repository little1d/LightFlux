import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { OptionalNavigationItemId } from '../../types/todo';
import SettingsScreen from '../SettingsScreen';

interface SettingsPanelOverlayProps {
  hiddenNavigationItems: OptionalNavigationItemId[];
  onClose: () => void;
  onNavigationVisibilityChange: (
    id: OptionalNavigationItemId,
    visible: boolean,
  ) => void;
  onOpenStatistics: () => void;
  /** Animated on `translateX` by the layout that owns it. */
  slideAnim: Animated.Value;
  width: number;
}

/**
 * The settings slide-over used below desktop widths, where settings is a panel
 * rather than a route so the task surface stays mounted behind it.
 */
const SettingsPanelOverlay = ({
  hiddenNavigationItems,
  onClose,
  onNavigationVisibilityChange,
  onOpenStatistics,
  slideAnim,
  width,
}: SettingsPanelOverlayProps) => (
  <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <Pressable onPress={onClose} style={styles.settingsBackdrop} />
    <Animated.View
      style={[
        styles.settingsPanel,
        {
          width: Math.min(width, 420),
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <SafeAreaView style={styles.settingsPanelSafeArea}>
        <SettingsScreen
          hiddenNavigationItems={hiddenNavigationItems}
          onClose={onClose}
          onNavigationVisibilityChange={onNavigationVisibilityChange}
          onOpenStatistics={onOpenStatistics}
        />
      </SafeAreaView>
    </Animated.View>
  </View>
);

const styles = StyleSheet.create({
  settingsBackdrop: {
    backgroundColor: 'rgba(31, 30, 43, 0.25)',
    flex: 1,
  },
  settingsPanel: {
    backgroundColor: '#FFFFFF',
    bottom: 0,
    elevation: 24,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { height: 0, width: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    top: 0,
    width: '60%',
  },
  settingsPanelSafeArea: {
    flex: 1,
  },
});

export default SettingsPanelOverlay;
