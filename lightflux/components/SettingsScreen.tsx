import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { translations } from '../i18n/translations';
import { useTodoStore } from '../store/todoStore';
import { Language } from '../types/todo';
import MenuItem from './ui/MenuItem';
import MenuSurface, {
  MenuSurfacePosition,
} from './ui/MenuSurface';

interface ShortcutRowProps {
  description: string;
  keys: string;
}

const ShortcutRow = ({ description, keys }: ShortcutRowProps) => (
  <View className="min-h-[58px] flex-row items-center justify-between border-b border-[#ECEBF1] px-5 py-3 last:border-b-0">
    <Text className="mr-5 flex-1 text-[14px] font-semibold text-[#353648]">
      {description}
    </Text>
    <View className="min-w-[116px] items-center rounded-[9px] border border-[#DEDEE5] bg-white px-3 py-2">
      <Text className="text-[11px] font-bold text-[#737481]">{keys}</Text>
    </View>
  </View>
);

const SettingsScreen = () => {
  const language = useTodoStore((state) => state.language);
  const setLanguage = useTodoStore((state) => state.setLanguage);
  const labels = translations[language];
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [languageMenuPosition, setLanguageMenuPosition] =
    useState<MenuSurfacePosition>();
  const languageButtonRef = useRef<View>(null);
  const languageOptions: Array<{ id: Language; label: string }> = [
    { id: 'zh', label: labels.settings.chinese },
    { id: 'en', label: labels.settings.english },
  ];
  const selectedLanguage =
    languageOptions.find((option) => option.id === language)?.label ?? '';

  const shortcuts = [
    [labels.settings.shortcutSearch, labels.settings.keySearch],
    [labels.settings.shortcutClose, labels.settings.keyClose],
    [labels.settings.shortcutBold, labels.settings.keyBold],
    [labels.settings.shortcutItalic, labels.settings.keyItalic],
    [labels.settings.shortcutHeading, labels.settings.keyHeading],
    [labels.settings.shortcutList, labels.settings.keyList],
    [labels.settings.shortcutQuote, labels.settings.keyQuote],
    [labels.settings.shortcutCode, labels.settings.keyCode],
  ];

  const toggleLanguageMenu = () => {
    if (languageMenuOpen) {
      setLanguageMenuOpen(false);
      return;
    }

    languageButtonRef.current?.measureInWindow((x, y, width, height) => {
      setLanguageMenuPosition({ x: x + width - 190, y: y + height + 8 });
      setLanguageMenuOpen(true);
    });
  };

  return (
    <View className="flex-1 bg-canvas">
      <ExpoStatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View className="pb-7 pt-5">
            <Text className="text-[28px] font-extrabold text-ink">
              {labels.settings.title}
            </Text>
          </View>

          <View className="mb-7">
            <View
              className="min-h-[74px] flex-row items-center justify-between rounded-[18px] border border-[#E6E5EB] bg-[#F8F8FA] px-5"
              style={styles.cardShadow}
            >
              <View className="mr-5 flex-1">
                <Text className="text-[16px] font-extrabold text-[#2E2F41]">
                  {labels.settings.languageTitle}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: languageMenuOpen }}
                className="min-h-10 flex-row items-center rounded-[12px] bg-[#EFEFF2] px-3.5"
                onPress={toggleLanguageMenu}
                ref={languageButtonRef}
              >
                <Text className="text-[13px] font-bold text-[#626370]">
                  {selectedLanguage}
                </Text>
                <Ionicons
                  color="#858692"
                  name={languageMenuOpen ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  style={styles.languageChevron}
                />
              </Pressable>
            </View>
          </View>

          <View>
            <Text className="mb-2 text-[18px] font-extrabold text-[#2E2F41]">
              {labels.settings.shortcutsTitle}
            </Text>
            <View
              className="overflow-hidden rounded-[18px] border border-[#E6E5EB] bg-[#F8F8FA]"
              style={styles.cardShadow}
            >
              {shortcuts.map(([description, keys]) => (
                <ShortcutRow
                  description={description}
                  key={description}
                  keys={keys}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {languageMenuOpen ? (
        <MenuSurface
          closeLabel={labels.cancel}
          estimatedHeight={100}
          onClose={() => setLanguageMenuOpen(false)}
          position={languageMenuPosition}
          width={190}
        >
          {languageOptions.map((option) => {
            const selected = option.id === language;
            return (
              <MenuItem
                key={option.id}
                label={option.label}
                onPress={() => {
                  setLanguage(option.id);
                  setLanguageMenuOpen(false);
                }}
                selected={selected}
                trailing={
                  selected ? (
                    <Ionicons
                      color="#6759E8"
                      name="checkmark"
                      size={18}
                    />
                  ) : null
                }
              />
            );
          })}
        </MenuSurface>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    alignSelf: 'center',
    maxWidth: 900,
    width: '100%',
  },
  content: {
    paddingBottom: 36,
    paddingHorizontal: 28,
  },
  cardShadow: {
    shadowColor: '#45435F',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  languageChevron: {
    marginLeft: 8,
  },
});

export default SettingsScreen;
