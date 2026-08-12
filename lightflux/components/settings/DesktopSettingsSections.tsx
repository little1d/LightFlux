import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  type DimensionValue,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { translations } from '../../content';
import {
  DesktopPreferences,
  DockIconStyle,
} from '../../services/desktopRuntime';
import { useDesktopStore } from '../../store/desktopStore';
import { flushAppState } from '../../store/todoStore';
import { Language } from '../../types/todo';
import ActionButton from '../ui/ActionButton';
import {
  DockIconPreview,
  SettingOption,
  SettingRow,
  SettingSelect,
  SettingToggle,
} from './SettingsControls';
import styles from './styles';

const DesktopSettingsSections = ({
  controlWidth,
  language,
  stacked,
}: {
  controlWidth: DimensionValue;
  language: Language;
  stacked: boolean;
}) => {
  const [focusedRow, setFocusedRow] = useState<string | null>(null);
  const [hoveredDockIcon, setHoveredDockIcon] =
    useState<DockIconStyle | null>(null);
  const labels = translations[language];
  const desktopLabels = labels.desktop.settings;
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
  const reminderOptions: SettingOption<
    DesktopPreferences['updateReminder']
  >[] = [
    {
      label: desktopLabels.updateReminderOptions.sidebarAndToast,
      value: 'sidebar-and-toast',
    },
    {
      label: desktopLabels.updateReminderOptions.sidebar,
      value: 'sidebar',
    },
    {
      label: desktopLabels.updateReminderOptions.settingsOnly,
      value: 'settings-only',
    },
  ];
  const dockVisibilityOptions: SettingOption<
    DesktopPreferences['dockVisibility']
  >[] = [
    { label: desktopLabels.dockVisibilityOptions.always, value: 'always' },
    {
      label: desktopLabels.dockVisibilityOptions.windowOpen,
      value: 'window-open',
    },
    {
      label: desktopLabels.dockVisibilityOptions.hidden,
      value: 'hidden',
    },
  ];
  const badgeOptions: SettingOption<DesktopPreferences['dockBadge']>[] = [
    { label: desktopLabels.dockBadgeOptions.today, value: 'today' },
    { label: desktopLabels.dockBadgeOptions.overdue, value: 'overdue' },
    { label: desktopLabels.dockBadgeOptions.none, value: 'none' },
  ];
  const closeOptions: SettingOption<
    DesktopPreferences['closeBehavior']
  >[] = [
    { label: desktopLabels.closeBehaviorOptions.hide, value: 'hide' },
    { label: desktopLabels.closeBehaviorOptions.quit, value: 'quit' },
  ];
  const updateStateLabel =
    updateStatus === 'checking'
      ? desktopLabels.updateChecking
      : updateStatus === 'downloading'
        ? desktopLabels.updateDownloading(
            Math.round((updateProgress ?? 0) * 100),
          )
        : updateStatus === 'ready'
          ? desktopLabels.updateReady
          : updateInfo
            ? desktopLabels.updateAvailable(updateInfo.version)
            : upToDate
              ? desktopLabels.updateCurrent
              : environment.updaterConfigured
                ? desktopLabels.updateCheckedAtLaunch
                : desktopLabels.updateSigningRequired;

  return (
    <>
      {environment.isDesktop ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {desktopLabels.softwareUpdate}
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
                    ? updateError || desktopLabels.tryAgain
                    : updateInfo?.body || desktopLabels.updateFallbackBody}
                </Text>
              </View>
            </View>
          ) : null}
          <View style={styles.sectionCard}>
            <SettingRow
              description={desktopLabels.updateCheckDescription}
              focused={focusedRow === 'version'}
              stacked={stacked}
              title={desktopLabels.currentVersion}
            >
              <View style={[styles.versionControl, { width: controlWidth }]}>
                <View>
                  <Text style={styles.versionText}>
                    {environment.currentVersion}
                  </Text>
                  <Text style={styles.versionState}>{updateStateLabel}</Text>
                </View>
                <ActionButton
                  disabled={
                    !environment.updaterConfigured ||
                    updateStatus === 'checking' ||
                    updateStatus === 'downloading'
                  }
                  label={
                    updateStatus === 'ready'
                      ? desktopLabels.restartUpdate
                      : updateInfo
                        ? desktopLabels.downloadUpdate
                        : desktopLabels.checkNow
                  }
                  onFocusChange={focus('version')}
                  onPress={handleVersionAction}
                  size="small"
                  variant={updateInfo ? 'primary' : 'secondary'}
                />
              </View>
            </SettingRow>
            <SettingRow
              description={desktopLabels.autoDownloadDescription}
              focused={focusedRow === 'auto-download'}
              stacked={stacked}
              title={desktopLabels.autoDownload}
            >
              <SettingToggle
                label={desktopLabels.autoDownload}
                onChange={(autoDownloadUpdates) =>
                  updatePreferences({ autoDownloadUpdates })
                }
                onFocusChange={focus('auto-download')}
                value={preferences.autoDownloadUpdates}
              />
            </SettingRow>
            <SettingRow
              description={desktopLabels.updateReminderDescription}
              focused={focusedRow === 'update-reminder'}
              stacked={stacked}
              title={desktopLabels.updateReminder}
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
              description={desktopLabels.dockIconDescription}
              focused={focusedRow === 'dock-icon'}
              stacked
              title={desktopLabels.dockIcon}
            >
              <View style={styles.dockIconOptions}>
                {(
                  [
                    ['flux', desktopLabels.dockIcons.flux],
                    ['paper', desktopLabels.dockIcons.paper],
                    ['graphite', desktopLabels.dockIcons.graphite],
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
                      onPress={() => updatePreferences({ dockIcon: style })}
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
              description={desktopLabels.dockVisibilityDescription}
              focused={focusedRow === 'dock-visibility'}
              stacked={stacked}
              title={desktopLabels.dockVisibility}
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
              description={desktopLabels.dockBadgeDescription}
              focused={focusedRow === 'dock-badge'}
              stacked={stacked}
              title={desktopLabels.dockBadge}
            >
              <SettingSelect
                closeLabel={labels.cancel}
                onFocusChange={focus('dock-badge')}
                onSelect={(dockBadge) => updatePreferences({ dockBadge })}
                options={badgeOptions}
                value={preferences.dockBadge}
                width={controlWidth}
              />
            </SettingRow>
            <SettingRow
              description={desktopLabels.closeBehaviorDescription}
              focused={focusedRow === 'close-behavior'}
              stacked={stacked}
              title={desktopLabels.closeBehavior}
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
    </>
  );
};

export default DesktopSettingsSections;
