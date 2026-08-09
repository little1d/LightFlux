import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTodos } from '../context/TodoContext';
import { translations } from '../i18n/translations';
import { Language } from '../types/todo';

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

const LanguageOption = ({
  id,
  label,
  selected,
  onSelect,
}: {
  id: Language;
  label: string;
  selected: boolean;
  onSelect: (language: Language) => void;
}) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ checked: selected }}
    className={`flex-1 flex-row items-center rounded-[12px] border px-4 py-3 ${
      selected
        ? 'border-[#BBB4F2] bg-[#EEECFF]'
        : 'border-[#E4E3E9] bg-white'
    }`}
    onPress={() => onSelect(id)}
  >
    <View
      className={`mr-3 h-5 w-5 items-center justify-center rounded-[10px] border ${
        selected ? 'border-primary' : 'border-[#BBBCC7]'
      }`}
    >
      {selected ? <View className="h-2.5 w-2.5 rounded-[5px] bg-primary" /> : null}
    </View>
    <Text
      className={`text-[13px] font-bold ${
        selected ? 'text-primary' : 'text-[#4D4E5E]'
      }`}
    >
      {label}
    </Text>
  </Pressable>
);

const SettingsScreen = () => {
  const { language, setLanguage } = useTodos();
  const labels = translations[language];

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
            <Text className="mt-1.5 text-[13px] text-[#858797]">
              {labels.settings.subtitle}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-[18px] font-extrabold text-[#2E2F41]">
              {labels.settings.languageTitle}
            </Text>
            <Text className="mb-3 text-[12px] text-[#888A98]">
              {labels.settings.languageDescription}
            </Text>
            <View
              className="rounded-[18px] border border-[#E6E5EB] bg-[#F8F8FA] p-3"
              style={styles.cardShadow}
            >
              <View className="flex-row gap-3">
                <LanguageOption
                  id="zh"
                  label={labels.settings.chinese}
                  onSelect={setLanguage}
                  selected={language === 'zh'}
                />
                <LanguageOption
                  id="en"
                  label={labels.settings.english}
                  onSelect={setLanguage}
                  selected={language === 'en'}
                />
              </View>
            </View>
          </View>

          <View>
            <Text className="mb-2 text-[18px] font-extrabold text-[#2E2F41]">
              {labels.settings.shortcutsTitle}
            </Text>
            <Text className="mb-3 text-[12px] text-[#888A98]">
              {labels.settings.shortcutsDescription}
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
});

export default SettingsScreen;
