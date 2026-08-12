import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
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
import { useShallow } from 'zustand/react/shallow';

import { translations } from '../i18n/translations';
import {
  DesktopPreferences,
  DockIconStyle,
} from '../services/desktopRuntime';
import { useDesktopStore } from '../store/desktopStore';
import { flushAppState, useTodoStore } from '../store/todoStore';
import { Language } from '../types/todo';
import ActionButton from './ui/ActionButton';
import MenuItem from './ui/MenuItem';
import MenuSurface, {
  MenuSurfacePosition,
} from './ui/MenuSurface';

interface SettingOption<T extends string> {
  label: string;
  value: T;
}

interface SettingRowProps {
  children: React.ReactNode;
  description: string;
  focused?: boolean;
  stacked: boolean;
  title: string;
}

const SettingRow = ({
  children,
  description,
  focused = false,
  stacked,
  title,
}: SettingRowProps) => (
  <View
    style={[
      styles.settingRow,
      stacked && styles.settingRowStacked,
      focused && styles.settingRowFocused,
    ]}
  >
    <View style={[styles.settingCopy, stacked && styles.settingCopyStacked]}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingDescription}>{description}</Text>
    </View>
    <View style={[styles.settingControl, stacked && styles.controlStacked]}>
      {children}
    </View>
  </View>
);

const SettingSelect = <T extends string>({
  closeLabel,
  onFocusChange,
  onSelect,
  options,
  value,
  width,
}: {
  closeLabel: string;
  onFocusChange: (focused: boolean) => void;
  onSelect: (value: T) => void;
  options: SettingOption<T>[];
  value: T;
  width: DimensionValue;
}) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [menuWidth, setMenuWidth] = useState(280);
  const [position, setPosition] = useState<MenuSurfacePosition>();
  const targetRef = useRef<View>(null);
  const selected =
    options.find((option) => option.value === value)?.label ?? '';

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    targetRef.current?.measureInWindow((x, y, measuredWidth, height) => {
      setMenuWidth(measuredWidth);
      setPosition({ x, y: y + height + 8 });
      setOpen(true);
    });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onBlur={() => onFocusChange(false)}
        onFocus={() => onFocusChange(true)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={toggle}
        ref={targetRef}
        style={({ pressed }) => [
          styles.select,
          { width },
          hovered && styles.selectHovered,
          open && styles.selectOpen,
          pressed && styles.controlPressed,
        ]}
      >
        <Text numberOfLines={1} style={styles.selectText}>
          {selected}
        </Text>
        <Ionicons
          color="#777888"
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
        />
      </Pressable>
      {open ? (
        <MenuSurface
          closeLabel={closeLabel}
          estimatedHeight={options.length * 44 + 12}
          onClose={() => setOpen(false)}
          position={position}
          width={menuWidth}
        >
          {options.map((option) => (
            <MenuItem
              key={option.value}
              label={option.label}
              onPress={() => {
                onSelect(option.value);
                setOpen(false);
              }}
              selected={option.value === value}
              trailing={
                option.value === value ? (
                  <Ionicons color="#6759E8" name="checkmark" size={17} />
                ) : null
              }
            />
          ))}
        </MenuSurface>
      ) : null}
    </>
  );
};

const SettingToggle = ({
  label,
  onChange,
  onFocusChange,
  value,
}: {
  label: string;
  onChange: (value: boolean) => void;
  onFocusChange: (focused: boolean) => void;
  value: boolean;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="switch"
    accessibilityState={{ checked: value }}
    onBlur={() => onFocusChange(false)}
    onFocus={() => onFocusChange(true)}
    onPress={() => onChange(!value)}
    style={({ pressed }) => [
      styles.toggle,
      value && styles.toggleActive,
      pressed && styles.controlPressed,
    ]}
  >
    <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
  </Pressable>
);

const DockIconPreview = ({
  selected,
  style,
}: {
  selected: boolean;
  style: DockIconStyle;
}) => (
  <View
    style={[
      styles.dockIconPreview,
      style === 'paper' && styles.dockIconPaper,
      style === 'graphite' && styles.dockIconGraphite,
      selected && styles.dockIconPreviewSelected,
    ]}
  >
    <Ionicons
      color={style === 'paper' ? '#6759E8' : '#FFFFFF'}
      name="checkmark"
      size={26}
    />
    <View
      style={[
        styles.dockIconLine,
        style === 'paper' && styles.dockIconLinePaper,
      ]}
    />
    <View
      style={[
        styles.dockIconDot,
        style === 'paper' && styles.dockIconDotPaper,
      ]}
    />
  </View>
);

const SettingsScreen = ({
  onOpenStatistics,
}: {
  onOpenStatistics: () => void;
}) => {
  const { width } = useWindowDimensions();
  const stacked = width < 760;
  const controlWidth: DimensionValue = stacked ? '100%' : 280;
  const [focusedRow, setFocusedRow] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredDockIcon, setHoveredDockIcon] =
    useState<DockIconStyle | null>(null);
  const language = useTodoStore((state) => state.language);
  const setLanguage = useTodoStore((state) => state.setLanguage);
  const labels = translations[language];
  const chinese = language === 'zh';
  const {
    checkForUpdates,
    downloadUpdate,
    environment,
    preferences,
    relaunchForUpdate,
    setPreferences,
    updateError,
    updateInfo,
    updateProgress,
    updateStatus,
    upToDate,
  } = useDesktopStore(
    useShallow((state) => ({
      checkForUpdates: state.checkForUpdates,
      downloadUpdate: state.downloadUpdate,
      environment: state.environment,
      preferences: state.preferences,
      relaunchForUpdate: state.relaunchForUpdate,
      setPreferences: state.setPreferences,
      updateError: state.updateError,
      updateInfo: state.updateInfo,
      updateProgress: state.updateProgress,
      updateStatus: state.updateStatus,
      upToDate: state.upToDate,
    })),
  );

  const focus = (row: string) => (focused: boolean) =>
    setFocusedRow(focused ? row : null);
  const updatePreferences = (changes: Partial<DesktopPreferences>) => {
    void setPreferences(changes);
  };
  const handleVersionAction = () => {
    if (updateStatus === 'ready') {
      void flushAppState()
        .catch((error) => {
          console.warn('Unable to flush data before relaunch.', error);
        })
        .then(relaunchForUpdate);
      return;
    }
    if (updateInfo) {
      void downloadUpdate();
      return;
    }
    void checkForUpdates(true);
  };
  const languageOptions: SettingOption<Language>[] = [
    { label: labels.settings.chinese, value: 'zh' },
    { label: labels.settings.english, value: 'en' },
  ];
  const reminderOptions: SettingOption<
    DesktopPreferences['updateReminder']
  >[] = [
    {
      label: chinese ? '侧栏图标与一次提示' : 'Sidebar icon and one notice',
      value: 'sidebar-and-toast',
    },
    {
      label: chinese ? '仅显示侧栏图标' : 'Sidebar icon only',
      value: 'sidebar',
    },
    {
      label: chinese ? '仅在设置中显示' : 'Settings only',
      value: 'settings-only',
    },
  ];
  const dockVisibilityOptions: SettingOption<
    DesktopPreferences['dockVisibility']
  >[] = [
    { label: chinese ? '始终显示' : 'Always show', value: 'always' },
    {
      label: chinese ? '窗口打开时显示' : 'Show with window',
      value: 'window-open',
    },
    {
      label: chinese ? '隐藏，使用菜单栏模式' : 'Hide; use menu bar',
      value: 'hidden',
    },
  ];
  const badgeOptions: SettingOption<DesktopPreferences['dockBadge']>[] = [
    {
      label: chinese ? '今日未完成任务' : 'Incomplete today',
      value: 'today',
    },
    {
      label: chinese ? '仅延期任务' : 'Overdue only',
      value: 'overdue',
    },
    { label: chinese ? '不显示' : 'Do not show', value: 'none' },
  ];
  const closeOptions: SettingOption<
    DesktopPreferences['closeBehavior']
  >[] = [
    {
      label: chinese ? '隐藏到菜单栏' : 'Hide to menu bar',
      value: 'hide',
    },
    { label: chinese ? '退出 LightFlux' : 'Quit LightFlux', value: 'quit' },
  ];
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
  const updateStateLabel =
    updateStatus === 'checking'
      ? chinese
        ? '正在检查…'
        : 'Checking…'
      : updateStatus === 'downloading'
        ? chinese
          ? `正在下载 ${Math.round((updateProgress ?? 0) * 100)}%`
          : `Downloading ${Math.round((updateProgress ?? 0) * 100)}%`
        : updateStatus === 'ready'
          ? chinese
            ? '等待重启'
            : 'Ready to restart'
          : updateInfo
            ? chinese
              ? `${updateInfo.version} 可用`
              : `${updateInfo.version} available`
            : upToDate
              ? chinese
                ? '已是最新版本'
                : 'Up to date'
              : environment.updaterConfigured
                ? chinese
                  ? '启动时自动检查'
                  : 'Checked at launch'
                : chinese
                  ? '需要配置发布签名'
                  : 'Release signing required';

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
            <Text style={styles.eyebrow}>LIGHTFLUX PREFERENCES</Text>
            <Text style={styles.title}>{labels.settings.title}</Text>
            <Text style={styles.subtitle}>
              {chinese
                ? '界面、桌面端与工作方式偏好'
                : 'Interface, desktop, and workflow preferences'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {chinese ? '通用' : 'General'}
            </Text>
            <View style={styles.sectionCard}>
              <SettingRow
                description={
                  chinese
                    ? '选择界面的显示语言'
                    : 'Choose the interface language'
                }
                focused={focusedRow === 'language'}
                stacked={stacked}
                title={labels.settings.languageTitle}
              >
                <SettingSelect
                  closeLabel={labels.cancel}
                  onFocusChange={focus('language')}
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

          {environment.isDesktop ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {chinese ? '软件更新' : 'Software update'}
              </Text>
              {updateInfo || updateStatus === 'error' ? (
                <View
                  style={[
                    styles.updateNotice,
                    updateStatus === 'error' && styles.updateNoticeError,
                  ]}
                >
                  <Ionicons
                    color={updateStatus === 'error' ? '#B44758' : '#6759E8'}
                    name={
                      updateStatus === 'error'
                        ? 'alert-circle-outline'
                        : 'download-outline'
                    }
                    size={18}
                  />
                  <View style={styles.noticeCopy}>
                    <Text style={styles.noticeTitle}>{updateStateLabel}</Text>
                    <Text style={styles.noticeDescription}>
                      {updateStatus === 'error'
                        ? updateError ||
                          (chinese ? '请稍后重试。' : 'Try again later.')
                        : updateInfo?.body ||
                          (chinese
                            ? '包含功能改进与稳定性修复。'
                            : 'Includes improvements and stability fixes.')}
                    </Text>
                  </View>
                </View>
              ) : null}
              <View style={styles.sectionCard}>
                <SettingRow
                  description={
                    chinese
                      ? '每次启动后静默检查一次，不影响首屏加载'
                      : 'Check quietly after launch without delaying the first screen'
                  }
                  focused={focusedRow === 'version'}
                  stacked={stacked}
                  title={chinese ? '当前版本' : 'Current version'}
                >
                  <View
                    style={[
                      styles.versionControl,
                      { width: controlWidth },
                    ]}
                  >
                    <View>
                      <Text style={styles.versionText}>
                        {environment.currentVersion}
                      </Text>
                      <Text style={styles.versionState}>
                        {updateStateLabel}
                      </Text>
                    </View>
                    <ActionButton
                      disabled={
                        !environment.updaterConfigured ||
                        updateStatus === 'checking' ||
                        updateStatus === 'downloading'
                      }
                      label={
                        updateStatus === 'ready'
                          ? chinese
                            ? '重启更新'
                            : 'Restart'
                          : updateInfo
                            ? chinese
                              ? '下载更新'
                              : 'Download'
                            : chinese
                              ? '立即检查'
                              : 'Check now'
                      }
                      onPress={handleVersionAction}
                      onFocusChange={focus('version')}
                      size="small"
                      variant={updateInfo ? 'primary' : 'secondary'}
                    />
                  </View>
                </SettingRow>
                <SettingRow
                  description={
                    chinese
                      ? '普通更新在后台下载，完成后再提示重启'
                      : 'Download regular updates in the background and ask before restart'
                  }
                  focused={focusedRow === 'auto-download'}
                  stacked={stacked}
                  title={chinese ? '后台下载更新' : 'Download in background'}
                >
                  <SettingToggle
                    label={chinese ? '后台下载更新' : 'Download in background'}
                    onChange={(autoDownloadUpdates) =>
                      updatePreferences({ autoDownloadUpdates })
                    }
                    onFocusChange={focus('auto-download')}
                    value={preferences.autoDownloadUpdates}
                  />
                </SettingRow>
                <SettingRow
                  description={
                    chinese
                      ? '新版本到达时显示最小化快捷入口'
                      : 'Choose where the minimal update entry appears'
                  }
                  focused={focusedRow === 'update-reminder'}
                  stacked={stacked}
                  title={chinese ? '更新提醒位置' : 'Update reminder'}
                >
                  <SettingSelect
                    closeLabel={labels.cancel}
                    onFocusChange={focus('update-reminder')}
                    onSelect={(updateReminder) =>
                      updatePreferences({ updateReminder })
                    }
                    options={reminderOptions}
                    value={preferences.updateReminder}
                    width={controlWidth}
                  />
                </SettingRow>
              </View>
            </View>
          ) : null}

          {environment.isMacos ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>macOS Dock</Text>
              <View style={styles.sectionCard}>
                <SettingRow
                  description={
                    chinese
                      ? '选择运行时显示在 Dock 中的 LightFlux 图标'
                      : 'Choose the LightFlux icon shown in the Dock at runtime'
                  }
                  focused={focusedRow === 'dock-icon'}
                  stacked
                  title={chinese ? 'Dock 图标' : 'Dock icon'}
                >
                  <View style={styles.dockIconOptions}>
                    {(
                      [
                        ['flux', chinese ? '光流' : 'Flux'],
                        ['paper', chinese ? '纸白' : 'Paper'],
                        ['graphite', chinese ? '石墨' : 'Graphite'],
                      ] as Array<[DockIconStyle, string]>
                    ).map(([style, label]) => {
                      const selected = preferences.dockIcon === style;
                      return (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          key={style}
                          onBlur={() => setFocusedRow(null)}
                          onFocus={() => setFocusedRow('dock-icon')}
                          onHoverIn={() => setHoveredDockIcon(style)}
                          onHoverOut={() => setHoveredDockIcon(null)}
                          onPress={() =>
                            updatePreferences({ dockIcon: style })
                          }
                          style={({ pressed }) => [
                            styles.dockIconOption,
                            selected && styles.dockIconOptionSelected,
                            hoveredDockIcon === style &&
                              styles.dockIconOptionHovered,
                            pressed && styles.controlPressed,
                          ]}
                        >
                          <DockIconPreview selected={selected} style={style} />
                          <Text
                            style={[
                              styles.dockIconLabel,
                              selected && styles.dockIconLabelSelected,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </SettingRow>
                <SettingRow
                  description={
                    chinese
                      ? '隐藏 Dock 后仍可通过顶部菜单栏重新打开窗口'
                      : 'The menu bar can reopen the window when the Dock is hidden'
                  }
                  focused={focusedRow === 'dock-visibility'}
                  stacked={stacked}
                  title={chinese ? 'Dock 显示方式' : 'Dock visibility'}
                >
                  <SettingSelect
                    closeLabel={labels.cancel}
                    onFocusChange={focus('dock-visibility')}
                    onSelect={(dockVisibility) =>
                      updatePreferences({ dockVisibility })
                    }
                    options={dockVisibilityOptions}
                    value={preferences.dockVisibility}
                    width={controlWidth}
                  />
                </SettingRow>
                <SettingRow
                  description={
                    chinese
                      ? '在图标右上角显示最需要关注的任务数量'
                      : 'Show the most useful task count on the icon'
                  }
                  focused={focusedRow === 'dock-badge'}
                  stacked={stacked}
                  title={chinese ? 'Dock 角标' : 'Dock badge'}
                >
                  <SettingSelect
                    closeLabel={labels.cancel}
                    onFocusChange={focus('dock-badge')}
                    onSelect={(dockBadge) =>
                      updatePreferences({ dockBadge })
                    }
                    options={badgeOptions}
                    value={preferences.dockBadge}
                    width={controlWidth}
                  />
                </SettingRow>
                <SettingRow
                  description={
                    chinese
                      ? '菜单栏模式下可保持后台运行'
                      : 'Menu bar mode can keep LightFlux running'
                  }
                  focused={focusedRow === 'close-behavior'}
                  stacked={stacked}
                  title={
                    chinese
                      ? '关闭最后一个窗口时'
                      : 'When the last window closes'
                  }
                >
                  <SettingSelect
                    closeLabel={labels.cancel}
                    onFocusChange={focus('close-behavior')}
                    onSelect={(closeBehavior) =>
                      updatePreferences({ closeBehavior })
                    }
                    options={closeOptions}
                    value={preferences.closeBehavior}
                    width={controlWidth}
                  />
                </SettingRow>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {labels.settings.shortcutsTitle}
            </Text>
            <View style={styles.sectionCard}>
              {shortcuts.map(([description, keys]) => (
                <View key={description} style={styles.shortcutRow}>
                  <Text style={styles.shortcutDescription}>{description}</Text>
                  <View style={styles.shortcutKeys}>
                    <Text style={styles.shortcutKeysText}>{keys}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F6F5F8',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    alignSelf: 'center',
    maxWidth: 1040,
    width: '100%',
  },
  content: {
    paddingBottom: 44,
    paddingHorizontal: 28,
  },
  header: {
    paddingBottom: 26,
    paddingTop: 24,
  },
  eyebrow: {
    color: '#8176C7',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#28293A',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  subtitle: {
    color: '#858692',
    fontSize: 12,
    marginTop: 7,
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    color: '#303143',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 9,
    marginLeft: 3,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E2E9',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#45435F',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.045,
    shadowRadius: 13,
  },
  settingRow: {
    alignItems: 'center',
    borderBottomColor: '#EBEAF0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 94,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingRowStacked: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  settingRowFocused: {
    backgroundColor: '#F4F2FF',
    borderLeftColor: '#6759E8',
    borderLeftWidth: 3,
    paddingLeft: 17,
  },
  settingCopy: {
    flex: 1,
    marginRight: 24,
  },
  settingCopyStacked: {
    marginBottom: 14,
    marginRight: 0,
  },
  settingTitle: {
    color: '#303143',
    fontSize: 14,
    fontWeight: '800',
  },
  settingDescription: {
    color: '#81828F',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  settingControl: {
    alignItems: 'flex-end',
  },
  controlStacked: {
    alignItems: 'stretch',
    width: '100%',
  },
  select: {
    alignItems: 'center',
    backgroundColor: '#F3F3F6',
    borderColor: '#DEDEE6',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 15,
  },
  selectHovered: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9C6DB',
  },
  selectOpen: {
    backgroundColor: '#FFFFFF',
    borderColor: '#9E95E9',
    shadowColor: '#6759E8',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  selectText: {
    color: '#4F5060',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 10,
  },
  controlPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  toggle: {
    backgroundColor: '#D8D7DF',
    borderColor: '#CBCAD4',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 2,
    width: 50,
  },
  toggleActive: {
    backgroundColor: '#6759E8',
    borderColor: '#6759E8',
  },
  toggleThumb: {
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    height: 22,
    shadowColor: '#2E2C40',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    width: 22,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  linkRow: {
    alignItems: 'center',
    borderLeftColor: 'transparent',
    borderLeftWidth: 3,
    flexDirection: 'row',
    minHeight: 88,
    paddingHorizontal: 17,
  },
  linkRowHovered: {
    backgroundColor: '#F8F7FB',
  },
  linkRowPressed: {
    backgroundColor: '#EEEBFF',
  },
  linkIcon: {
    alignItems: 'center',
    backgroundColor: '#EDE9FF',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    marginRight: 13,
    width: 42,
  },
  linkCopy: {
    flex: 1,
    marginRight: 12,
  },
  updateNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#F1EEFF',
    borderColor: '#D8D2FA',
    borderLeftColor: '#6759E8',
    borderLeftWidth: 3,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 14,
  },
  updateNoticeError: {
    backgroundColor: '#FFF2F4',
    borderColor: '#F0CDD3',
    borderLeftColor: '#C95A69',
  },
  noticeCopy: {
    flex: 1,
    marginLeft: 10,
  },
  noticeTitle: {
    color: '#3D3E50',
    fontSize: 12,
    fontWeight: '800',
  },
  noticeDescription: {
    color: '#737481',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  versionControl: {
    alignItems: 'center',
    backgroundColor: '#F7F7F9',
    borderColor: '#E2E1E8',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: 8,
    paddingLeft: 14,
  },
  versionText: {
    color: '#4C4D5E',
    fontSize: 12,
    fontWeight: '800',
  },
  versionState: {
    color: '#92939F',
    fontSize: 9,
    marginTop: 3,
  },
  dockIconOptions: {
    flexDirection: 'row',
    width: '100%',
  },
  dockIconOption: {
    alignItems: 'center',
    backgroundColor: '#F7F7F9',
    borderColor: '#E1E0E7',
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    minHeight: 98,
    padding: 10,
  },
  dockIconOptionSelected: {
    backgroundColor: '#F0EEFF',
    borderColor: '#8E83E4',
  },
  dockIconOptionHovered: {
    borderColor: '#B9B2F2',
    transform: [{ translateY: -1 }],
  },
  dockIconPreview: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 14,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#3A355E',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    width: 56,
  },
  dockIconPreviewSelected: {
    shadowOpacity: 0.24,
  },
  dockIconPaper: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFDCEB',
  },
  dockIconGraphite: {
    backgroundColor: '#343440',
  },
  dockIconLine: {
    backgroundColor: '#CFC9FF',
    borderRadius: 2,
    height: 3,
    left: 13,
    position: 'absolute',
    top: 14,
    width: 14,
  },
  dockIconLinePaper: {
    backgroundColor: '#AAA0F2',
  },
  dockIconDot: {
    backgroundColor: '#CFC9FF',
    borderRadius: 3,
    bottom: 11,
    height: 6,
    position: 'absolute',
    right: 11,
    width: 6,
  },
  dockIconDotPaper: {
    backgroundColor: '#AAA0F2',
  },
  dockIconLabel: {
    color: '#777886',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
  },
  dockIconLabelSelected: {
    color: '#6759E8',
  },
  shortcutRow: {
    alignItems: 'center',
    borderBottomColor: '#ECEBF1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  shortcutDescription: {
    color: '#353648',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 18,
  },
  shortcutKeys: {
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderColor: '#DEDEE5',
    borderRadius: 9,
    borderWidth: 1,
    minWidth: 132,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shortcutKeysText: {
    color: '#737481',
    fontSize: 10,
    fontWeight: '800',
  },
});

export default SettingsScreen;
