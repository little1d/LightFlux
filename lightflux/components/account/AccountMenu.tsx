import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import { translations } from '../../i18n/translations';
import { useTodoStore } from '../../store/todoStore';
import MenuItem from '../ui/MenuItem';
import MenuSurface from '../ui/MenuSurface';

export const AccountAvatar = ({
  active = false,
}: {
  active?: boolean;
}) => (
  <View
    className={`h-11 w-11 items-center justify-center rounded-[15px] border ${
      active
        ? 'border-[#BEB7F2] bg-[#EAE7FF]'
        : 'border-[#DEDEE6] bg-white'
    }`}
  >
    <Ionicons
      color={active ? '#6759E8' : '#777987'}
      name="person-circle-outline"
      size={28}
    />
    <View className="absolute bottom-0 right-0 h-3 w-3 rounded-[6px] border-2 border-[#F7F6F9] bg-[#63B99F]" />
  </View>
);

const AccountMenu = ({
  onClose,
  onOpenSettings,
  onSignOut,
}: {
  onClose: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
}) => {
  const language = useTodoStore((state) => state.language);
  const labels = translations[language];

  return (
    <MenuSurface
      closeLabel={labels.cancel}
      estimatedHeight={150}
      onClose={onClose}
      position={{ x: 12, y: 72 }}
      width={240}
    >
      <View className="border-b border-[#ECEBF1] px-4 py-3">
        <Text className="text-[14px] font-extrabold text-[#303145]">
          {labels.account.localAccount}
        </Text>
      </View>

      <MenuItem
        icon={
          <Ionicons color="#6759E8" name="settings-outline" size={17} />
        }
        label={labels.account.settings}
        onPress={onOpenSettings}
      />

      <MenuItem
        danger
        icon={
          <Ionicons color="#D45C6A" name="log-out-outline" size={17} />
        }
        label={labels.account.signOut}
        onPress={onSignOut}
      />
    </MenuSurface>
  );
};

export default AccountMenu;
