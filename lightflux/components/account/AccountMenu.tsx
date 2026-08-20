import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { translations } from '../../content';
import { useTodoStore } from '../../store/todoStore';
import MenuItem from '../ui/MenuItem';
import MenuSurface, { MenuSurfacePosition } from '../ui/MenuSurface';

const AccountMenu = ({
  currentUser,
  onClose,
  onOpenSettings,
  onSignIn,
  position,
  onSignOut,
}: {
  currentUser: { email: string; name?: string } | null;
  onClose: () => void;
  onOpenSettings: () => void;
  onSignIn: () => void;
  position?: MenuSurfacePosition;
  onSignOut: () => void;
}) => {
  const language = useTodoStore((state) => state.language);
  const labels = translations[language];

  return (
    <MenuSurface
      closeLabel={labels.cancel}
      estimatedHeight={180}
      onClose={onClose}
      position={position ?? { x: 12, y: 72 }}
      width={240}
    >
      <View style={styles.header}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Ionicons color="#FFFFFF" name="person" size={18} />
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.name} numberOfLines={1}>
              {currentUser?.name || currentUser?.email || labels.account.localAccount}
            </Text>
            {currentUser?.email ? (
              <Text style={styles.email} numberOfLines={1}>
                {currentUser.email}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <MenuItem
        icon={
          <Ionicons color="#6759E8" name="settings-outline" size={17} />
        }
        label={labels.account.settings}
        onPress={onOpenSettings}
      />

      {currentUser ? (
        <MenuItem
          danger
          icon={
            <Ionicons color="#D45C6A" name="log-out-outline" size={17} />
          }
          label={labels.account.signOut}
          onPress={onSignOut}
        />
      ) : (
        <MenuItem
          icon={
            <Ionicons color="#6759E8" name="log-in-outline" size={17} />
          }
          label={labels.settings.signIn}
          onPress={onSignIn}
        />
      )}
    </MenuSurface>
  );
};

const styles = StyleSheet.create({
  header: {
    borderBottomColor: '#ECEBF1',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    marginRight: 10,
    width: 32,
  },
  identityCopy: {
    flex: 1,
  },
  name: {
    color: '#303145',
    fontSize: 14,
    fontWeight: '800',
  },
  email: {
    color: '#858797',
    fontSize: 11,
  },
});

export default AccountMenu;
