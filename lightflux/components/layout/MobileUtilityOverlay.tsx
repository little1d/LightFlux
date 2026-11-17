import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import IconButton from '../ui/IconButton';
import AccountTrigger from './AccountTrigger';

interface MobileUtilityOverlayProps {
  accountActive: boolean;
  accountLabel: string;
  onAccountPress: () => void;
  onSearchPress: () => void;
  searchLabel: string;
}

/** The floating settings/search row pinned to the top of a mobile layout. */
const MobileUtilityOverlay = ({
  accountActive,
  accountLabel,
  onAccountPress,
  onSearchPress,
  searchLabel,
}: MobileUtilityOverlayProps) => (
  <SafeAreaView style={styles.mobileUtilityOverlay}>
    <View style={styles.mobileUtilityRow}>
      <AccountTrigger
        active={accountActive}
        label={accountLabel}
        onPress={onAccountPress}
        tooltipPosition="bottom"
      />
      <View style={styles.mobileUtilityActions}>
        <IconButton
          icon="search-outline"
          label={searchLabel}
          onPress={onSearchPress}
          size="large"
          tooltipPosition="bottom"
          variant="neutral"
        />
      </View>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  mobileUtilityOverlay: {
    bottom: 0,
    left: 0,
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 50,
  },
  mobileUtilityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    pointerEvents: 'box-none',
  },
  mobileUtilityActions: {
    flexDirection: 'row',
    gap: 8,
  },
});

export default MobileUtilityOverlay;
