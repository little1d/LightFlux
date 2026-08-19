import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import { translations } from '../../content';
import { useTodoStore } from '../../store/todoStore';
import MenuItem from '../ui/MenuItem';
import MenuSurface, { MenuSurfacePosition } from '../ui/MenuSurface';

const AccountMenu = ({
  onClose,
  onOpenSettings,
  position,
  onSignOut,
}: {
  onClose: () => void;
  onOpenSettings: () => void;
  position?: MenuSurfacePosition;
  onSignOut: () => void;
}) => {
  const language = useTodoStore((state) => state.language);
  const labels = translations[language];

  return (
    <MenuSurface
      closeLabel={labels.cancel}
      estimatedHeight={150}
      onClose={onClose}
      position={position ?? { x: 12, y: 72 }}
      width={240}
    >
      <View className="flex-row items-center border-b border-[#ECEBF1] px-4 py-3">
        <View className="mr-2.5 h-8 w-8 items-center justify-center rounded-[10px] bg-[#EEECFF]">
          <Ionicons color="#6759E8" name="person-circle-outline" size={22} />
        </View>
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
