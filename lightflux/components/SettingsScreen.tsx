import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  type DimensionValue,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { translations } from '../content';
import { useTodoStore } from '../store/todoStore';
import { Language } from '../types/todo';
import {
  OPTIONAL_NAVIGATION_ITEM_IDS,
  OptionalNavigationItemId,
} from '../types/todo';
import DesktopSettingsSections from './settings/DesktopSettingsSections';
import {
  SettingOption,
  SettingRow,
  SettingSelect,
} from './settings/SettingsControls';
import styles from './settings/styles';

const SettingsScreen = ({
  hiddenNavigationItems,
  onNavigationVisibilityChange,
  onOpenStatistics,
}: {
  hiddenNavigationItems: OptionalNavigationItemId[];
  onNavigationVisibilityChange: (
    id: OptionalNavigationItemId,
    visible: boolean,
  ) => void;
  onOpenStatistics: () => void;
}) => {
  const { width } = useWindowDimensions();
  const stacked = width < 760;
  const controlWidth: DimensionValue = stacked ? '100%' : 280;
  const [focusedRow, setFocusedRow] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const language = useTodoStore((state) => state.language);
  const setLanguage = useTodoStore((state) => state.setLanguage);
  const labels = translations[language];
  const desktopLabels = labels.desktop.settings;
  const languageOptions: SettingOption<Language>[] = [
    { label: labels.settings.chinese, value: 'zh' },
    { label: labels.settings.english, value: 'en' },
  ];
  return (
    <View style={styles.screen}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{labels.settings.title}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{desktopLabels.general}</Text>
            <View style={styles.sectionCard}>
              <SettingRow
                description={desktopLabels.languageDescription}
                focused={focusedRow === 'language'}
                stacked={stacked}
                title={labels.settings.languageTitle}
              >
                <SettingSelect
                  closeLabel={labels.cancel}
                  onFocusChange={(focused) =>
                    setFocusedRow(focused ? 'language' : null)
                  }
                  onSelect={setLanguage}
                  options={languageOptions}
                  value={language}
                  width={controlWidth}
                />
              </SettingRow>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{labels.settings.dataTitle}</Text>
            <View style={styles.sectionCard}>
              <Pressable
                accessibilityRole="button"
                onBlur={() => setFocusedRow(null)}
                onFocus={() => setFocusedRow('statistics')}
                onHoverIn={() => setHoveredRow('statistics')}
                onHoverOut={() => setHoveredRow(null)}
                onPress={onOpenStatistics}
                style={({ pressed }) => [
                  styles.linkRow,
                  hoveredRow === 'statistics' && styles.linkRowHovered,
                  focusedRow === 'statistics' && styles.settingRowFocused,
                  pressed && styles.linkRowPressed,
                ]}
              >
                <View style={styles.linkIcon}>
                  <Ionicons color="#6759E8" name="stats-chart" size={19} />
                </View>
                <View style={styles.linkCopy}>
                  <Text style={styles.settingTitle}>
                    {labels.settings.statisticsTitle}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {labels.settings.statisticsDescription}
                  </Text>
                </View>
                <Ionicons
                  color="#8B8C98"
                  name="chevron-forward"
                  size={17}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {labels.settings.visibleViewsTitle}
            </Text>
            <View style={styles.sectionCard}>
              {OPTIONAL_NAVIGATION_ITEM_IDS.map((id) => {
                const visible = !hiddenNavigationItems.includes(id);
                return (
                  <SettingRow
                    description={labels.settings.visibleViewsDescription(
                      labels.navigation[id],
                    )}
                    key={id}
                    stacked={stacked}
                    title={labels.navigation[id]}
                  >
                    <Pressable
                      accessibilityLabel={labels.navigation[id]}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: visible }}
                      onPress={() =>
                        onNavigationVisibilityChange(id, !visible)
                      }
                      style={[
                        styles.toggle,
                        visible && styles.toggleActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          visible && styles.toggleThumbActive,
                        ]}
                      />
                    </Pressable>
                  </SettingRow>
                );
              })}
            </View>
          </View>

          <DesktopSettingsSections
            controlWidth={controlWidth}
            language={language}
            stacked={stacked}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default SettingsScreen;
