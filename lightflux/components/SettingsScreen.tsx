import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  type DimensionValue,
  Pressable,
  ScrollView,
  StyleSheet,
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
  currentUser,
  hiddenNavigationItems,
  onNavigationVisibilityChange,
  onClose,
  onOpenStatistics,
  onSignIn,
  onSignOut,
}: {
  currentUser: { email: string; name?: string } | null;
  hiddenNavigationItems: OptionalNavigationItemId[];
  onNavigationVisibilityChange: (
    id: OptionalNavigationItemId,
    visible: boolean,
  ) => void;
  onClose?: () => void;
  onOpenStatistics: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) => {
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const stacked = width >= 520 && width < 760;
  const controlWidth: DimensionValue = compact
    ? 148
    : stacked
      ? '100%'
      : 280;
  const [focusedRow, setFocusedRow] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [signInHovered, setSignInHovered] = useState(false);
  const [signOutHovered, setSignOutHovered] = useState(false);
  const language = useTodoStore((state) => state.language);
  const setLanguage = useTodoStore((state) => state.setLanguage);
  const labels = translations[language];
  const desktopLabels = labels.desktop.settings;
  const languageOptions: SettingOption<Language>[] = [
    { label: labels.settings.chinese, value: 'zh' },
    { label: labels.settings.english, value: 'en' },
  ];
  const styles = useMemo(
    () =>
      StyleSheet.create({
        accountCard: {
          alignItems: 'center',
          flexDirection: 'row',
          paddingHorizontal: compact ? 0 : 16,
          paddingVertical: compact ? 6 : 14,
        },
        accountAvatar: {
          alignItems: 'center',
          backgroundColor: '#6759E8',
          borderRadius: compact ? 16 : 22,
          height: compact ? 32 : 44,
          justifyContent: 'center',
          marginRight: compact ? 8 : 13,
          width: compact ? 32 : 44,
        },
        accountInfo: {
          flex: 1,
        },
        accountEmail: {
          color: '#2E2F41',
          fontSize: compact ? 13 : 15,
          fontWeight: compact ? '600' : '800',
        },
        accountLabel: {
          color: '#858797',
          fontSize: compact ? 10 : 12,
          marginTop: 2,
        },
        signOutButton: {
          alignItems: 'center',
          borderColor: '#F0CDD3',
          borderRadius: 8,
          borderWidth: 1,
          flexDirection: 'row',
          gap: 6,
          minHeight: compact ? 32 : undefined,
          paddingHorizontal: compact ? 9 : 16,
          paddingVertical: compact ? 0 : 8,
        },
        signOutButtonHovered: {
          backgroundColor: '#FFF5F6',
          borderColor: '#D45C6A',
        },
        signOutButtonPressed: {
          backgroundColor: '#FFEAED',
        },
        signOutText: {
          color: '#C84F60',
          fontSize: compact ? 11 : 13,
          fontWeight: compact ? '600' : '700',
        },
        signInButton: {
          alignItems: 'center',
          backgroundColor: '#6759E8',
          borderRadius: 8,
          flexDirection: 'row',
          gap: 5,
          minHeight: compact ? 32 : undefined,
          paddingHorizontal: compact ? 9 : 14,
          paddingVertical: compact ? 0 : 9,
        },
        signInButtonHovered: {
          backgroundColor: '#594CCD',
        },
        signInButtonPressed: {
          opacity: 0.76,
          transform: [{ scale: 0.97 }],
        },
        signInText: {
          color: '#FFFFFF',
          fontSize: compact ? 11 : 13,
          fontWeight: compact ? '600' : '700',
        },
        localAvatar: {
          alignItems: 'center',
          backgroundColor: '#EDE9FF',
          borderRadius: compact ? 16 : 22,
          height: compact ? 32 : 44,
          justifyContent: 'center',
          marginRight: compact ? 8 : 13,
          width: compact ? 32 : 44,
        },
        localEmail: {
          color: '#2E2F41',
          fontSize: compact ? 13 : 15,
          fontWeight: compact ? '600' : '800',
        },
      }),
    [compact],
  );

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
              {labels.settings.accountTitle}
            </Text>
            <View
              style={[
                sharedStyles.sectionCard,
                compact && sharedStyles.sectionCardCompact,
              ]}
            >
              {currentUser ? (
                <View style={styles.accountCard}>
                  <View style={styles.accountAvatar}>
                    <Ionicons color="#FFFFFF" name="person" size={compact ? 16 : 22} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountEmail} numberOfLines={1}>
                      {currentUser.name || currentUser.email}
                    </Text>
                    <Text style={styles.accountLabel} numberOfLines={1}>
                      {labels.settings.signedInAs} · {currentUser.email}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel={labels.settings.signOut}
                    accessibilityRole="button"
                    onHoverIn={() => setSignOutHovered(true)}
                    onHoverOut={() => setSignOutHovered(false)}
                    onPress={onSignOut}
                    style={({ pressed }) => [
                      styles.signOutButton,
                      signOutHovered && styles.signOutButtonHovered,
                      pressed && styles.signOutButtonPressed,
                    ]}
                  >
                    <Ionicons color="#C84F60" name="log-out-outline" size={14} />
                    <Text style={styles.signOutText}>{labels.settings.signOut}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.accountCard}>
                  <View style={styles.localAvatar}>
                    <Ionicons color="#6759E8" name="phone-portrait-outline" size={compact ? 16 : 22} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.localEmail}>
                      {labels.settings.localOnly}
                    </Text>
                    {compact ? null : (
                      <Text style={styles.accountLabel}>
                        {labels.settings.localOnlyDescription}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    accessibilityLabel={labels.settings.signIn}
                    accessibilityRole="button"
                    onHoverIn={() => setSignInHovered(true)}
                    onHoverOut={() => setSignInHovered(false)}
                    onPress={onSignIn}
                    style={({ pressed }) => [
                      styles.signInButton,
                      signInHovered && styles.signInButtonHovered,
                      pressed && styles.signInButtonPressed,
                    ]}
                  >
                    <Ionicons color="#FFFFFF" name="log-in-outline" size={14} />
                    <Text style={styles.signInText}>
                      {labels.settings.signIn}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
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
                description={
                  compact ? undefined : desktopLabels.languageDescription
                }
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
                  {compact ? null : (
                    <Text style={sharedStyles.settingDescription}>
                      {labels.settings.statisticsDescription}
                    </Text>
                  )}
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
