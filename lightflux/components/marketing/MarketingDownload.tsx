import Ionicons from '@expo/vector-icons/Ionicons';
import type { Href } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import MarketingLayout, {
  MARKETING_COLORS,
  MarketingLink,
  MarketingSectionHeading,
} from './MarketingLayout';

const RELEASE_URL =
  'https://github.com/little1d/LightFlux/releases/latest';

interface PlatformItem {
  action: string;
  description: string;
  href?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  status: string;
  title: string;
}

const PLATFORMS: PlatformItem[] = [
  {
    action: '直接打开',
    description: '无需安装，在现代浏览器中使用完整的本地模式与云同步。',
    href: '/today',
    icon: 'globe-outline' as const,
    status: '可用',
    title: 'Web',
  },
  {
    action: '前往 Release',
    description: '提供 Apple Silicon 与 Intel 两种 DMG，请按 Mac 芯片选择。',
    href: RELEASE_URL,
    icon: 'logo-apple' as const,
    status: 'v1.0.0',
    title: 'macOS',
  },
  {
    action: '前往 Release',
    description: '提供 Windows x64 安装程序，当前版本尚未配置商业代码签名。',
    href: RELEASE_URL,
    icon: 'logo-windows' as const,
    status: 'v1.0.0',
    title: 'Windows',
  },
  {
    action: '等待下一版',
    description: '构建流程已准备 AppImage 与 deb，公开 Release 尚未提供安装包。',
    icon: 'terminal-outline' as const,
    status: '即将提供',
    title: 'Linux',
  },
];

const FUTURE_PLATFORMS = [
  {
    icon: 'logo-apple-appstore' as const,
    label: 'iOS / iPadOS',
  },
  {
    icon: 'logo-google-playstore' as const,
    label: 'Android',
  },
];

const PlatformCard = ({
  action,
  description,
  href,
  icon,
  status,
  title,
}: PlatformItem) => (
  <View style={styles.platformCard}>
    <View style={styles.platformCardTop}>
      <View style={styles.platformIcon}>
        <Ionicons color={MARKETING_COLORS.accent} name={icon} size={27} />
      </View>
      <View style={styles.status}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
    <Text style={styles.platformTitle}>{title}</Text>
    <Text style={styles.platformDescription}>{description}</Text>
    <View style={styles.platformAction}>
      {href ? (
        <MarketingLink
          href={href as Href}
          icon={title === 'Web' ? 'arrow-forward' : 'open-outline'}
          label={action}
          variant={title === 'Web' ? 'primary' : 'secondary'}
        />
      ) : (
        <View style={styles.disabledAction}>
          <Ionicons color="#A0A1AD" name="time-outline" size={15} />
          <Text style={styles.disabledActionText}>{action}</Text>
        </View>
      )}
    </View>
  </View>
);

const DeviceScene = () => {
  const { width } = useWindowDimensions();
  const compact = width < 600;

  return (
    <View
      accessibilityLabel="LightFlux Web、macOS 和 Windows 多端预览"
      style={[
        styles.deviceScene,
        compact && styles.deviceSceneCompact,
      ]}
    >
    <View
      style={[
        styles.desktopDevice,
        compact && styles.desktopDeviceCompact,
      ]}
    >
      <View style={styles.deviceToolbar}>
        <View style={styles.deviceDot} />
        <Text style={styles.deviceToolbarText}>LightFlux · Calendar</Text>
      </View>
      <View style={styles.desktopBody}>
        <View style={styles.desktopRail}>
          {[
            'sunny-outline',
            'calendar-outline',
            'albums-outline',
            'hourglass-outline',
          ].map((icon, index) => (
            <View
              key={icon}
              style={[
                styles.desktopRailItem,
                index === 1 && styles.desktopRailItemActive,
              ]}
            >
              <Ionicons
                color={index === 1 ? '#6759E8' : '#9A9BA7'}
                name={
                  icon as React.ComponentProps<typeof Ionicons>['name']
                }
                size={13}
              />
            </View>
          ))}
        </View>
        <View style={styles.desktopCalendar}>
          <Text style={styles.desktopCalendarTitle}>2026 年 8 月</Text>
          <View style={styles.desktopCalendarGrid}>
            {Array.from({ length: 28 }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.desktopCalendarDay,
                  index === 22 && styles.desktopCalendarDayActive,
                ]}
              >
                <Text
                  style={[
                    styles.desktopCalendarDayText,
                    index === 22 && styles.desktopCalendarDayTextActive,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
    <View
      style={[
        styles.phoneDevice,
        compact && styles.phoneDeviceCompact,
      ]}
    >
      <View style={styles.phoneSpeaker} />
      <View style={styles.phoneHeader}>
        <Text style={styles.phoneHeaderText}>今天</Text>
        <Ionicons color="#6759E8" name="sparkles" size={13} />
      </View>
      {['发布检查', '整理说明', '回顾计划'].map((item, index) => (
        <View key={item} style={styles.phoneTask}>
          <View
            style={[
              styles.phoneCheckbox,
              index === 1 && styles.phoneCheckboxDone,
            ]}
          >
            {index === 1 ? (
              <Ionicons color="#FFFFFF" name="checkmark" size={8} />
            ) : null}
          </View>
          <Text style={styles.phoneTaskText}>{item}</Text>
        </View>
      ))}
    </View>
    </View>
  );
};

const MarketingDownload = () => {
  const { height, width } = useWindowDimensions();
  const compact = width < 760;
  const short = height < 700;

  return (
    <MarketingLayout
      description="在 Web、macOS 和 Windows 上使用 LightFlux。查看当前版本、平台状态和桌面安装方式。"
      path="/download"
      title="下载 LightFlux"
    >
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>LIGHTFLUX DOWNLOADS</Text>
          <Text style={styles.heroTitle}>在熟悉的平台继续你的计划</Text>
          {!short ? (
            <Text style={styles.heroDescription}>
              Web 版无需安装。macOS 与 Windows 桌面版通过公开 GitHub
              Release 发布，并与 Web 使用相同的任务体验。
            </Text>
          ) : null}
          <View style={styles.heroActions}>
            <MarketingLink
              href="/today"
              icon="arrow-forward"
              label="打开 Web 版"
              variant="primary"
            />
            <MarketingLink
              href={RELEASE_URL as Href}
              icon="open-outline"
              label="查看最新 Release"
              variant="secondary"
            />
          </View>
        </View>
        {short ? (
          <View style={styles.shortPlatforms}>
            {[
              ['globe-outline', 'Web'],
              ['logo-apple', 'macOS'],
              ['logo-windows', 'Windows'],
            ].map(([icon, label]) => (
              <View key={label} style={styles.shortPlatform}>
                <Ionicons
                  color={MARKETING_COLORS.accent}
                  name={
                    icon as React.ComponentProps<typeof Ionicons>['name']
                  }
                  size={18}
                />
                <Text style={styles.shortPlatformText}>{label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.deviceSceneWrap,
              compact && styles.deviceSceneWrapCompact,
            ]}
          >
            <DeviceScene />
          </View>
        )}
      </View>

      <View
        style={[
          styles.platformSection,
          compact && styles.platformSectionCompact,
          short && styles.platformSectionShort,
        ]}
      >
        <MarketingSectionHeading
          align="center"
          description="只展示已经可以完成的下载动作，不用“全平台”掩盖尚未发布的安装包。"
          eyebrow="当前可用"
          title="选择你的使用方式"
        />
        <View
          style={[
            styles.platformGrid,
            compact && styles.platformGridCompact,
          ]}
        >
          {PLATFORMS.map((platform) => (
            <PlatformCard key={platform.title} {...platform} />
          ))}
        </View>
      </View>

      <View style={styles.releaseBand}>
        <View
          style={[
            styles.releaseInner,
            compact && styles.releaseInnerCompact,
          ]}
        >
          <View style={styles.releaseCopy}>
            <Text style={styles.releaseLabel}>LATEST DESKTOP RELEASE</Text>
            <Text style={styles.releaseTitle}>LightFlux Desktop v1.0.0</Text>
            <Text style={styles.releaseDescription}>
              当前公开 Release 包含 macOS Apple Silicon、macOS Intel 和
              Windows x64。安装包与更新清单托管在 LightFlux 主仓库。
            </Text>
          </View>
          <View style={styles.releaseFacts}>
            {[
              ['发布时间', '2026-08-12'],
              ['macOS', 'DMG · Apple / Intel'],
              ['Windows', 'NSIS · x64'],
              ['更新', '应用内检查'],
            ].map(([label, value]) => (
              <View key={label} style={styles.releaseFact}>
                <Text style={styles.releaseFactLabel}>{label}</Text>
                <Text style={styles.releaseFactValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.noticeSection}>
        <MarketingSectionHeading
          description="第一版官网会诚实展示现状，签名、商店审核和公开安装包完成后再切换为可下载状态。"
          eyebrow="发布状态"
          title="移动端正在准备"
        />
        <View
          style={[
            styles.futurePlatforms,
            compact && styles.futurePlatformsCompact,
          ]}
        >
          {FUTURE_PLATFORMS.map((platform) => (
            <View key={platform.label} style={styles.futurePlatform}>
              <Ionicons
                color="#7B7C89"
                name={platform.icon}
                size={24}
              />
              <View style={styles.futurePlatformCopy}>
                <Text style={styles.futurePlatformTitle}>
                  {platform.label}
                </Text>
                <Text style={styles.futurePlatformStatus}>
                  开发中 · 暂无公开商店链接
                </Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.signingNotice}>
          <Ionicons
            color={MARKETING_COLORS.warm}
            name="information-circle-outline"
            size={20}
          />
          <Text style={styles.signingNoticeText}>
            当前 macOS 使用临时签名，Windows 尚未配置商业代码签名。
            在完成签名与公证前，系统可能显示安全提醒。
          </Text>
        </View>
      </View>
    </MarketingLayout>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 1180,
    paddingBottom: 74,
    paddingHorizontal: 24,
    paddingTop: 88,
    width: '100%',
  },
  heroCompact: {
    paddingBottom: 24,
    paddingTop: 62,
  },
  heroCopy: {
    alignItems: 'center',
    maxWidth: 780,
  },
  eyebrow: {
    color: MARKETING_COLORS.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  heroTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 57,
    marginTop: 14,
    textAlign: 'center',
  },
  heroDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 15,
    lineHeight: 25,
    marginTop: 14,
    maxWidth: 650,
    textAlign: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 24,
  },
  deviceSceneWrap: {
    marginTop: 56,
    maxWidth: 920,
    width: '100%',
  },
  deviceSceneWrapCompact: {
    marginTop: 32,
  },
  shortPlatforms: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  shortPlatform: {
    alignItems: 'center',
    backgroundColor: '#F4F3F8',
    borderRadius: 8,
    minWidth: 76,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  shortPlatformText: {
    color: '#5C5D6B',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 5,
  },
  deviceScene: {
    alignItems: 'flex-end',
    height: 410,
    justifyContent: 'center',
    position: 'relative',
  },
  deviceSceneCompact: {
    height: 250,
  },
  desktopDevice: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CFCED8',
    borderRadius: 8,
    borderWidth: 1,
    height: 350,
    overflow: 'hidden',
    shadowColor: '#2E2C3E',
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    width: '86%',
  },
  desktopDeviceCompact: {
    height: 218,
    width: '92%',
  },
  deviceToolbar: {
    alignItems: 'center',
    backgroundColor: '#F4F4F7',
    borderBottomColor: '#E2E1E8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 37,
    paddingHorizontal: 12,
  },
  deviceDot: {
    backgroundColor: '#6759E8',
    borderRadius: 4,
    height: 8,
    marginRight: 8,
    width: 8,
  },
  deviceToolbarText: {
    color: '#737482',
    fontSize: 9,
    fontWeight: '700',
  },
  desktopBody: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopRail: {
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRightColor: '#E6E5EB',
    borderRightWidth: 1,
    gap: 6,
    paddingTop: 14,
    width: 48,
  },
  desktopRailItem: {
    alignItems: 'center',
    borderRadius: 6,
    height: 29,
    justifyContent: 'center',
    width: 29,
  },
  desktopRailItemActive: {
    backgroundColor: '#ECE9FF',
  },
  desktopCalendar: {
    flex: 1,
    padding: 18,
  },
  desktopCalendarTitle: {
    color: '#303142',
    fontSize: 14,
    fontWeight: '900',
  },
  desktopCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  desktopCalendarDay: {
    alignItems: 'center',
    aspectRatio: 1.25,
    borderColor: '#ECEBF1',
    borderRightWidth: 1,
    borderTopWidth: 1,
    justifyContent: 'center',
    width: '14.2857%',
  },
  desktopCalendarDayActive: {
    backgroundColor: '#6759E8',
    borderColor: '#6759E8',
    borderRadius: 5,
  },
  desktopCalendarDayText: {
    color: '#747581',
    fontSize: 8,
    fontWeight: '700',
  },
  desktopCalendarDayTextActive: {
    color: '#FFFFFF',
  },
  phoneDevice: {
    backgroundColor: '#FFFFFF',
    borderColor: '#393A45',
    borderRadius: 8,
    borderWidth: 5,
    bottom: 0,
    height: 245,
    paddingHorizontal: 10,
    paddingTop: 12,
    position: 'absolute',
    right: 2,
    shadowColor: '#2B2938',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    width: 124,
  },
  phoneDeviceCompact: {
    borderWidth: 4,
    height: 182,
    width: 94,
  },
  phoneSpeaker: {
    alignSelf: 'center',
    backgroundColor: '#292A34',
    borderRadius: 2,
    height: 3,
    width: 28,
  },
  phoneHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
    marginTop: 13,
  },
  phoneHeaderText: {
    color: '#303142',
    fontSize: 11,
    fontWeight: '900',
  },
  phoneTask: {
    alignItems: 'center',
    borderBottomColor: '#ECEBF1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 43,
  },
  phoneCheckbox: {
    alignItems: 'center',
    borderColor: '#C5C4CE',
    borderRadius: 5,
    borderWidth: 1,
    height: 15,
    justifyContent: 'center',
    marginRight: 7,
    width: 15,
  },
  phoneCheckboxDone: {
    backgroundColor: '#6759E8',
    borderColor: '#6759E8',
  },
  phoneTaskText: {
    color: '#555665',
    fontSize: 8,
    fontWeight: '700',
  },
  platformSection: {
    alignSelf: 'center',
    maxWidth: 1180,
    paddingHorizontal: 24,
    paddingVertical: 90,
    width: '100%',
  },
  platformSectionCompact: {
    paddingTop: 60,
  },
  platformSectionShort: {
    paddingTop: 30,
  },
  platformGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 42,
  },
  platformGridCompact: {
    flexWrap: 'wrap',
  },
  platformCard: {
    backgroundColor: '#FFFFFF',
    borderColor: MARKETING_COLORS.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 290,
    minWidth: 230,
    padding: 20,
  },
  platformCardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  platformIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  status: {
    backgroundColor: '#EAF6F2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    color: '#397F6F',
    fontSize: 8,
    fontWeight: '900',
  },
  platformTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 20,
  },
  platformDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 11,
    lineHeight: 19,
    marginTop: 9,
  },
  platformAction: {
    bottom: 20,
    left: 20,
    position: 'absolute',
  },
  disabledAction: {
    alignItems: 'center',
    backgroundColor: '#F1F1F4',
    borderRadius: 8,
    flexDirection: 'row',
    minHeight: 42,
    paddingHorizontal: 15,
  },
  disabledActionText: {
    color: '#9293A0',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 7,
  },
  releaseBand: {
    backgroundColor: '#252632',
    paddingHorizontal: 24,
    paddingVertical: 78,
  },
  releaseInner: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 68,
    maxWidth: 1080,
    width: '100%',
  },
  releaseInnerCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: 32,
  },
  releaseCopy: {
    flex: 1,
  },
  releaseLabel: {
    color: '#AFA7FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0,
  },
  releaseTitle: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 38,
    marginTop: 11,
  },
  releaseDescription: {
    color: '#B7B8C2',
    fontSize: 12,
    lineHeight: 21,
    marginTop: 11,
  },
  releaseFacts: {
    flex: 1,
  },
  releaseFact: {
    borderBottomColor: '#3B3C49',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  releaseFactLabel: {
    color: '#9697A4',
    fontSize: 10,
  },
  releaseFactValue: {
    color: '#F0F0F4',
    fontSize: 10,
    fontWeight: '800',
  },
  noticeSection: {
    alignSelf: 'center',
    maxWidth: 1000,
    paddingHorizontal: 24,
    paddingVertical: 88,
    width: '100%',
  },
  futurePlatforms: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 34,
  },
  futurePlatformsCompact: {
    flexDirection: 'column',
  },
  futurePlatform: {
    alignItems: 'center',
    backgroundColor: '#F4F4F7',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    minHeight: 82,
    padding: 17,
  },
  futurePlatformCopy: {
    marginLeft: 13,
  },
  futurePlatformTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  futurePlatformStatus: {
    color: '#858692',
    fontSize: 9,
    marginTop: 4,
  },
  signingNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF6EA',
    borderColor: '#EEDCC2',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 20,
    padding: 16,
  },
  signingNoticeText: {
    color: '#73573E',
    flex: 1,
    fontSize: 10,
    lineHeight: 18,
    marginLeft: 9,
  },
});

export default MarketingDownload;
