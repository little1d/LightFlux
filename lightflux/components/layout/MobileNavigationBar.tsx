import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NavigationView } from '../navigation/navigationConfig';

interface NavigationItem {
  id: NavigationView;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

interface MobileNavigationBarProps {
  activeView: string;
  compact: boolean;
  items: NavigationItem[];
  labels: Record<NavigationView, string>;
  onSelect: (id: NavigationView) => void;
}

/** The bottom tab bar shown below desktop widths. */
const MobileNavigationBar = ({
  activeView,
  compact,
  items,
  labels,
  onSelect,
}: MobileNavigationBarProps) => (
  <SafeAreaView edges={['bottom']} style={styles.mobileNavigationSafeArea}>
    <View
      style={[
        styles.mobileNavigationBar,
        compact && styles.mobileNavigationBarCompact,
      ]}
    >
      {items.map((item) => {
        const isActive = item.id === activeView;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [
              styles.mobileNavigationItem,
              compact && styles.mobileNavigationItemCompact,
              pressed && styles.mobileNavigationItemPressed,
            ]}
          >
            <Ionicons
              color={isActive ? '#6759E8' : '#A3A3AF'}
              name={item.icon}
              size={compact ? 19 : 21}
            />
            <Text
              style={[
                styles.mobileNavigationLabel,
                compact && styles.mobileNavigationLabelCompact,
                isActive && styles.mobileNavigationLabelActive,
              ]}
            >
              {labels[item.id]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  mobileNavigationSafeArea: {
    backgroundColor: '#F5F5FA',
    borderTopColor: '#E4E3EA',
    borderTopWidth: 1,
  },
  mobileNavigationBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 58,
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  mobileNavigationBarCompact: {
    height: 48,
    paddingHorizontal: 8,
  },
  mobileNavigationItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  mobileNavigationItemCompact: {
    paddingVertical: 4,
  },
  mobileNavigationItemPressed: {
    opacity: 0.68,
  },
  mobileNavigationLabel: {
    color: '#9596A3',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  mobileNavigationLabelCompact: {
    fontSize: 9,
    marginTop: 2,
  },
  mobileNavigationLabelActive: {
    color: '#6759E8',
  },
});

export default MobileNavigationBar;
