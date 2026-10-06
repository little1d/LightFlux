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
import sharedStyles from './settings/styles';
import IconButton from './ui/IconButton';

const SettingsScreen = ({
  hiddenNavigationItems,
  onNavigationVisibilityChange,
  onClose,
  onOpenStatistics,
}: {
  hiddenNavigationItems: OptionalNavigationItemId[];
  onNavigationVisibilityChange: (
    id: OptionalNavigationItemId,
    visible: boolean,
  ) => void;
  onClose?: () => void;
  onOpenStatistics: () => void;
}) => {
  const { width } = useWindowDimensions();
  const contentWidth = onClose ? Math.min(width, 420) : width;
  const compact = contentWidth < 520;
  const stacked = contentWidth >= 520 && contentWidth < 640;
  const controlWidth: DimensionValue = compact
    ? 148
    : stacked
      ? '100%'
      : 280;
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
    <View style={sharedStyles.screen}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={sharedStyles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            sharedStyles.content,
            compact && sharedStyles.contentCompact,
          ]}
          showsVerticalScrollIndicator={false}
          style={sharedStyles.scroll}
        >
          <View
            style={[
              sharedStyles.header,
              compact && sharedStyles.headerCompact,
              compact && onClose && sharedStyles.headerWithAction,
            ]}
          >
            <Text style={[sharedStyles.title, compact && sharedStyles.titleCompact]}>
              {labels.settings.title}
            </Text>
            {compact && onClose ? (
              <IconButton
                icon="close"
                label={labels.cancel}
                onPress={onClose}
                showTooltip={false}
                size="small"
                variant="transparent"
              />
            ) : null}
          </View>

          <View style={[sharedStyles.section, compact && sharedStyles.sectionCompact]}>
            <Text
              style={[
                sharedStyles.sectionTitle,
                compact && sharedStyles.sectionTitleCompact,
              ]}
            >
              {desktopLabels.general}
            </Text>
            <View
              style={[
                sharedStyles.sectionCard,
                compact && sharedStyles.sectionCardCompact,
              ]}
            >
              <SettingRow
                compact={compact}
                focused={focusedRow === 'language'}
                stacked={stacked}
                title={labels.settings.languageTitle}
              >
                <SettingSelect
                  closeLabel={labels.cancel}
                  compact={compact}
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

          <View style={[sharedStyles.section, compact && sharedStyles.sectionCompact]}>
            <Text
              style={[
                sharedStyles.sectionTitle,
                compact && sharedStyles.sectionTitleCompact,
              ]}
            >
              {labels.settings.dataTitle}
            </Text>
            <View
              style={[
                sharedStyles.sectionCard,
                compact && sharedStyles.sectionCardCompact,
              ]}
            >
              <Pressable
                accessibilityRole="button"
                onBlur={() => setFocusedRow(null)}
                onFocus={() => setFocusedRow('statistics')}
                onHoverIn={() => setHoveredRow('statistics')}
                onHoverOut={() => setHoveredRow(null)}
                onPress={onOpenStatistics}
                style={({ pressed }) => [
                  sharedStyles.linkRow,
                  compact && sharedStyles.linkRowCompact,
                  hoveredRow === 'statistics' && sharedStyles.linkRowHovered,
                  focusedRow === 'statistics' && sharedStyles.settingRowFocused,
                  pressed && sharedStyles.linkRowPressed,
                ]}
              >
                <View
                  style={[
                    sharedStyles.linkIcon,
                    compact && sharedStyles.linkIconCompact,
                  ]}
                >
                  <Ionicons
                    color="#6759E8"
                    name="stats-chart"
                    size={compact ? 17 : 19}
                  />
                </View>
                <View style={sharedStyles.linkCopy}>
                  <Text
                    style={[
                      sharedStyles.settingTitle,
                      compact && sharedStyles.settingTitleCompact,
                    ]}
                  >
                    {labels.settings.statisticsTitle}
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

          <View style={[sharedStyles.section, compact && sharedStyles.sectionCompact]}>
            <Text
              style={[
                sharedStyles.sectionTitle,
                compact && sharedStyles.sectionTitleCompact,
              ]}
            >
              {labels.settings.visibleViewsTitle}
            </Text>
            <View
              style={[
                sharedStyles.sectionCard,
                compact && sharedStyles.sectionCardCompact,
              ]}
            >
              {OPTIONAL_NAVIGATION_ITEM_IDS.map((id) => {
                const visible = !hiddenNavigationItems.includes(id);
                return (
                  <SettingRow
                    compact={compact}
                    key={id}
                    stacked={false}
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
                        sharedStyles.toggle,
                        compact && sharedStyles.toggleCompact,
                        visible && sharedStyles.toggleActive,
                      ]}
                    >
                      <View
                        style={[
                          sharedStyles.toggleThumb,
                          compact && sharedStyles.toggleThumbCompact,
                          visible && sharedStyles.toggleThumbActive,
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
