import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NavigationDragState } from '../navigation/navigationDrag';
import DraggableNavigationItem from '../navigation/DraggableNavigationItem';
import DesktopNavigationButton from '../navigation/DesktopNavigationButton';
import type { NavigationView } from '../navigation/navigationConfig';
import IconButton from '../ui/IconButton';
import AccountTrigger from './AccountTrigger';

interface NavigationItem {
  id: NavigationView;
  icon: ComponentProps<typeof Ionicons>['name'];
}

interface DesktopSidebarProps {
  accountActive: boolean;
  accountLabel: string;
  activeView: string;
  items: NavigationItem[];
  labels: Record<NavigationView, string>;
  navigationDrag: NavigationDragState | null;
  onAccountPress: () => void;
  onDragStateChange: (state: NavigationDragState | null) => void;
  onMove: (id: NavigationView, targetIndex: number) => void;
  onSelect: (id: NavigationView) => void;
  onUpdatePress: () => void;
  showUpdate: boolean;
  updateLabel: string;
  updateReady: boolean;
}

/** The fixed icon rail shown at desktop widths. */
const DesktopSidebar = ({
  activeView,
  accountActive,
  accountLabel,
  items,
  labels,
  navigationDrag,
  onAccountPress,
  onDragStateChange,
  onMove,
  onSelect,
  onUpdatePress,
  showUpdate,
  updateLabel,
  updateReady,
}: DesktopSidebarProps) => (
  <SafeAreaView key="desktop-sidebar" style={styles.desktopSidebar}>
    <View style={styles.desktopNavigation}>
      <View style={styles.desktopAccountPosition}>
        <AccountTrigger
          active={accountActive}
          label={accountLabel}
          onPress={onAccountPress}
          tooltipPosition="right"
        />
      </View>
      {items.map((item, index) => (
        <DraggableNavigationItem
          dragState={navigationDrag}
          id={item.id}
          index={index}
          itemCount={items.length}
          key={item.id}
          label={labels[item.id]}
          onDragStateChange={onDragStateChange}
          onMove={onMove}
        >
          <DesktopNavigationButton
            icon={item.icon}
            isActive={item.id === activeView}
            label={labels[item.id]}
            onPress={() => onSelect(item.id)}
          />
        </DraggableNavigationItem>
      ))}
    </View>
    <View style={styles.agentButtonPosition}>
      {showUpdate ? (
        <View style={styles.updateButtonPosition}>
          <IconButton
            icon={updateReady ? 'checkmark-circle' : 'download-outline'}
            label={updateLabel}
            onPress={onUpdatePress}
            size="large"
            tooltipPosition="right"
            variant="primary"
          />
        </View>
      ) : null}
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  desktopSidebar: {
    backgroundColor: '#F7F6F9',
    borderRightColor: '#E2E1E8',
    borderRightWidth: 1,
    overflow: 'visible',
    position: 'relative',
    width: 78,
    zIndex: 100,
  },
  desktopNavigation: {
    alignItems: 'center',
    flex: 1,
    paddingTop: 20,
  },
  desktopAccountPosition: {
    marginBottom: 28,
  },
  agentButtonPosition: {
    alignItems: 'center',
    marginBottom: 14,
  },
  updateButtonPosition: {
    alignItems: 'center',
    marginBottom: 9,
  },
});

export default DesktopSidebar;
