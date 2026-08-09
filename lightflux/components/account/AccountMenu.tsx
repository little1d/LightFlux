import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTodos } from '../../context/TodoContext';
import { translations } from '../../i18n/translations';

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
    <View
      className={`absolute top-[8px] h-[11px] w-[11px] rounded-[6px] ${
        active ? 'bg-primary' : 'bg-[#777987]'
      }`}
    />
    <View
      className={`absolute bottom-[8px] h-[14px] w-[23px] rounded-t-[12px] ${
        active ? 'bg-primary' : 'bg-[#777987]'
      }`}
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
  const { language } = useTodos();
  const labels = translations[language];

  return (
    <View style={styles.overlay}>
      <Pressable
        accessibilityLabel={labels.cancel}
        accessibilityRole="button"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <View
        className="overflow-hidden rounded-[18px] border border-[#E1E0E7] bg-white"
        style={styles.menu}
      >
        <View className="border-b border-[#ECEBF1] px-4 py-3.5">
          <Text className="text-[14px] font-extrabold text-[#303145]">
            {labels.account.localAccount}
          </Text>
          <Text className="mt-1 text-[10px] text-[#9293A0]">
            {labels.account.localData}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          className="flex-row items-center px-4 py-3.5"
          onPress={onOpenSettings}
        >
          <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-[#EFEDFF]">
            <Text className="text-[15px] font-bold text-primary">⚙</Text>
          </View>
          <Text className="ml-3 text-[13px] font-bold text-[#3C3D50]">
            {labels.account.settings}
          </Text>
        </Pressable>

        <View className="mx-4 h-px bg-[#ECEBF1]" />

        <Pressable
          accessibilityRole="button"
          className="flex-row items-center px-4 py-3.5"
          onPress={onSignOut}
        >
          <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-[#FCEDEF]">
            <Text className="text-[15px] font-bold text-[#D45C6A]">↪</Text>
          </View>
          <Text className="ml-3 text-[13px] font-bold text-[#C84F60]">
            {labels.account.signOut}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
  menu: {
    left: 12,
    position: 'absolute',
    shadowColor: '#242235',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    top: 72,
    width: 240,
  },
});

export default AccountMenu;
