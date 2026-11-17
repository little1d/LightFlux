import { StyleSheet } from 'react-native';

/**
 * Layout styles that belong to the shell frame itself. Everything else that
 * used to live in one 200-line block has moved next to the component that
 * renders it (`layout/DesktopSidebar`, `layout/MobileNavigationBar`, ...).
 */
const styles = StyleSheet.create({
  appBackground: {
    backgroundColor: '#F5F5FA',
    flex: 1,
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
    width: '100%',
  },
  appShell: {
    backgroundColor: '#F5F5FA',
    flex: 1,
    flexDirection: 'row',
    maxWidth: '100%',
    minWidth: 0,
    width: '100%',
  },
  appShellHidden: {
    display: 'none',
  },
  fullPane: {
    flex: 1,
    minWidth: 0,
  },
  detailsPane: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
});

export default styles;
