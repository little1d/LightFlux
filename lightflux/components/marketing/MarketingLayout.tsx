import Ionicons from '@expo/vector-icons/Ionicons';
import { Href, Link, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MarketingPath } from './marketingRoutes';

const MARKETING_LINKS: Array<{
  href: MarketingPath;
  label: string;
}> = [
  { href: '/', label: '首页' },
  { href: '/features', label: '功能' },
  { href: '/download', label: '下载' },
  { href: '/help', label: '帮助' },
];

export const MARKETING_COLORS = {
  accent: '#6759E8',
  accentDark: '#5144C7',
  canvas: '#FCFCFE',
  canvasMuted: '#F4F4F8',
  green: '#3E9C88',
  ink: '#242536',
  line: '#E4E3EB',
  muted: '#707180',
  warm: '#C9844C',
  white: '#FFFFFF',
} as const;

export const BrandMark = ({ compact = false }: { compact?: boolean }) => (
  <View
    accessibilityElementsHidden
    style={[
      styles.brandMark,
      compact && styles.brandMarkCompact,
    ]}
  >
    <Ionicons
      color="#FFFFFF"
      name="checkmark"
      size={compact ? 18 : 21}
    />
  </View>
);

interface MarketingLinkProps {
  active?: boolean;
  href: Href;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  variant?: 'nav' | 'primary' | 'secondary' | 'text';
}

export const MarketingLink = ({
  active = false,
  href,
  icon,
  label,
  onPress,
  variant = 'text',
}: MarketingLinkProps) => {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <Link asChild href={href}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="link"
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={onPress}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.linkBase,
              variant === 'nav' && styles.navLink,
              variant === 'primary' && styles.primaryLink,
              variant === 'secondary' && styles.secondaryLink,
              variant === 'text' && styles.textLink,
              active && styles.navLinkActive,
              hovered && variant === 'nav' && styles.navLinkHovered,
              hovered && variant === 'primary' && styles.primaryLinkHovered,
              hovered &&
                variant === 'secondary' &&
                styles.secondaryLinkHovered,
              focused && styles.linkFocused,
              pressed && styles.linkPressed,
            ]}
          >
            {icon ? (
              <Ionicons
                color={
                  variant === 'primary'
                    ? '#FFFFFF'
                    : MARKETING_COLORS.accent
                }
                name={icon}
                size={16}
              />
            ) : null}
            <Text
              style={[
                styles.linkText,
                variant === 'nav' && styles.navLinkText,
                variant === 'primary' && styles.primaryLinkText,
                variant === 'secondary' && styles.secondaryLinkText,
                variant === 'text' && styles.textLinkText,
                active && styles.navLinkTextActive,
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
};

export const MarketingSectionHeading = ({
  align = 'left',
  eyebrow,
  title,
  description,
}: {
  align?: 'center' | 'left';
  eyebrow?: string;
  title: string;
  description?: string;
}) => (
  <View
    style={[
      styles.sectionHeading,
      align === 'center' && styles.sectionHeadingCentered,
    ]}
  >
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text
      style={[
        styles.sectionTitle,
        align === 'center' && styles.centeredText,
      ]}
    >
      {title}
    </Text>
    {description ? (
      <Text
        style={[
          styles.sectionDescription,
          align === 'center' && styles.centeredText,
        ]}
      >
        {description}
      </Text>
    ) : null}
  </View>
);

const MarketingHeader = ({
  compact,
}: {
  compact: boolean;
}) => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Link asChild href="/">
          <Pressable
            accessibilityLabel="LightFlux 首页"
            accessibilityRole="link"
            onPress={() => setMenuOpen(false)}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.brand,
                  pressed && styles.linkPressed,
                ]}
              >
                <BrandMark compact />
                <View>
                  <Text style={styles.brandName}>LightFlux</Text>
                  <Text style={styles.brandChinese}>流光清单</Text>
                </View>
              </View>
            )}
          </Pressable>
        </Link>

        {compact ? (
          <Pressable
            accessibilityLabel={menuOpen ? '关闭导航' : '打开导航'}
            accessibilityRole="button"
            onPress={() => setMenuOpen((current) => !current)}
            style={({ pressed }) => [
              styles.menuButton,
              pressed && styles.linkPressed,
            ]}
          >
            <Ionicons
              color={MARKETING_COLORS.ink}
              name={menuOpen ? 'close' : 'menu'}
              size={22}
            />
          </Pressable>
        ) : (
          <View style={styles.desktopNavigation}>
            <View style={styles.desktopNavigationLinks}>
              {MARKETING_LINKS.slice(1).map((item) => (
                <MarketingLink
                  active={pathname === item.href}
                  href={item.href}
                  key={item.href}
                  label={item.label}
                  variant="nav"
                />
              ))}
            </View>
            <MarketingLink
              href="/login"
              label="登录"
              variant="nav"
            />
            <MarketingLink
              href="/today"
              icon="arrow-forward"
              label="打开应用"
              variant="primary"
            />
          </View>
        )}
      </View>

      {compact && menuOpen ? (
        <View style={styles.mobileMenu}>
          {MARKETING_LINKS.slice(1).map((item) => (
            <MarketingLink
              active={pathname === item.href}
              href={item.href}
              key={item.href}
              label={item.label}
              onPress={() => setMenuOpen(false)}
              variant="nav"
            />
          ))}
          <View style={styles.mobileMenuActions}>
            <MarketingLink
              href="/login"
              label="登录"
              onPress={() => setMenuOpen(false)}
              variant="secondary"
            />
            <MarketingLink
              href="/today"
              icon="arrow-forward"
              label="打开应用"
              onPress={() => setMenuOpen(false)}
              variant="primary"
            />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const FooterColumn = ({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: Href; label: string }>;
}) => (
  <View style={styles.footerColumn}>
    <Text style={styles.footerColumnTitle}>{title}</Text>
    {links.map((item) => (
      <MarketingLink
        href={item.href}
        key={item.label}
        label={item.label}
        variant="text"
      />
    ))}
  </View>
);

const MarketingFooter = ({ compact }: { compact: boolean }) => (
  <View style={styles.footer}>
    <View style={[styles.footerInner, compact && styles.footerInnerCompact]}>
      <View style={styles.footerBrand}>
        <View style={styles.brand}>
          <BrandMark compact />
          <View>
            <Text style={styles.brandName}>LightFlux</Text>
            <Text style={styles.brandChinese}>流光清单</Text>
          </View>
        </View>
        <Text style={styles.footerTagline}>把今天，安排得刚刚好。</Text>
        <Text style={styles.footerNote}>
          本地优先的任务管理工具，账户与云同步始终是可选增强。
        </Text>
      </View>
      <View
        style={[
          styles.footerColumns,
          compact && styles.footerColumnsCompact,
        ]}
      >
        <FooterColumn
          links={[
            { href: '/features', label: '功能介绍' },
            { href: '/download', label: '下载应用' },
            { href: '/changelog', label: '更新日志' },
          ]}
          title="产品"
        />
        <FooterColumn
          links={[
            { href: '/help', label: '帮助中心' },
            { href: '/privacy', label: '隐私说明' },
            { href: '/terms', label: '使用条款' },
          ]}
          title="支持"
        />
      </View>
    </View>
    <View style={styles.footerBottom}>
      <Text style={styles.footerCopyright}>
        © 2026 LightFlux. Local-first by design.
      </Text>
      <Text style={styles.footerAvailability}>
        Web · macOS · Windows
      </Text>
    </View>
  </View>
);

const MarketingLayout = ({
  children,
  description,
  path,
  title,
}: {
  children: React.ReactNode;
  description: string;
  path: MarketingPath;
  title: string;
}) => {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const canonical = `https://lightflux.site${path === '/' ? '' : path}`;

  return (
    <View style={styles.screen}>
      <Head>
        <title>{title}</title>
        <meta content={description} name="description" />
        <meta content="index,follow" name="robots" />
        <meta content={title} property="og:title" />
        <meta content={description} property="og:description" />
        <meta content="website" property="og:type" />
        <meta content={canonical} property="og:url" />
        <link href={canonical} rel="canonical" />
      </Head>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        style={styles.scroll}
      >
        <MarketingHeader compact={compact} />
        <View style={styles.pageContent}>{children}</View>
        <MarketingFooter compact={compact} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: MARKETING_COLORS.canvas,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  pageContent: {
    width: '100%',
  },
  headerSafeArea: {
    backgroundColor: 'rgba(252, 252, 254, 0.96)',
    borderBottomColor: MARKETING_COLORS.line,
    borderBottomWidth: 1,
    zIndex: 200,
  },
  header: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    height: 72,
    justifyContent: 'space-between',
    maxWidth: 1240,
    paddingHorizontal: 32,
    width: '100%',
  },
  headerCompact: {
    height: 60,
    paddingHorizontal: 18,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: MARKETING_COLORS.accent,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: MARKETING_COLORS.accent,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    width: 38,
  },
  brandMarkCompact: {
    height: 32,
    width: 32,
  },
  brandName: {
    color: MARKETING_COLORS.ink,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  brandChinese: {
    color: MARKETING_COLORS.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0,
    marginTop: 1,
  },
  desktopNavigation: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  desktopNavigationLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 14,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: MARKETING_COLORS.canvasMuted,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  mobileMenu: {
    backgroundColor: MARKETING_COLORS.white,
    borderTopColor: MARKETING_COLORS.line,
    borderTopWidth: 1,
    paddingBottom: 16,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  mobileMenuActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  linkBase: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  navLink: {
    minHeight: 38,
    paddingHorizontal: 12,
  },
  navLinkActive: {
    backgroundColor: '#F0EEFF',
  },
  navLinkHovered: {
    backgroundColor: MARKETING_COLORS.canvasMuted,
  },
  primaryLink: {
    backgroundColor: MARKETING_COLORS.accent,
    minHeight: 42,
    paddingHorizontal: 17,
  },
  primaryLinkHovered: {
    backgroundColor: MARKETING_COLORS.accentDark,
  },
  secondaryLink: {
    backgroundColor: MARKETING_COLORS.white,
    borderColor: '#CBC7E8',
    minHeight: 42,
    paddingHorizontal: 17,
  },
  secondaryLinkHovered: {
    backgroundColor: '#F5F3FF',
  },
  textLink: {
    alignSelf: 'flex-start',
    minHeight: 31,
    paddingHorizontal: 0,
  },
  linkFocused: {
    borderColor: '#B5ADF2',
    shadowColor: MARKETING_COLORS.accent,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
  },
  linkPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  navLinkText: {
    color: '#565765',
  },
  navLinkTextActive: {
    color: MARKETING_COLORS.accent,
  },
  primaryLinkText: {
    color: '#FFFFFF',
  },
  secondaryLinkText: {
    color: MARKETING_COLORS.accent,
  },
  textLinkText: {
    color: MARKETING_COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeading: {
    maxWidth: 680,
  },
  sectionHeadingCentered: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  eyebrow: {
    color: MARKETING_COLORS.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 43,
  },
  sectionDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 15,
    lineHeight: 25,
    marginTop: 12,
  },
  centeredText: {
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#F5F5F8',
    borderTopColor: MARKETING_COLORS.line,
    borderTopWidth: 1,
    paddingHorizontal: 24,
  },
  footerInner: {
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 1180,
    paddingVertical: 54,
    width: '100%',
  },
  footerInnerCompact: {
    flexDirection: 'column',
    paddingVertical: 36,
  },
  footerBrand: {
    maxWidth: 360,
  },
  footerTagline: {
    color: MARKETING_COLORS.ink,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 18,
  },
  footerNote: {
    color: MARKETING_COLORS.muted,
    fontSize: 12,
    lineHeight: 20,
    marginTop: 7,
  },
  footerColumns: {
    flexDirection: 'row',
    gap: 70,
  },
  footerColumnsCompact: {
    gap: 44,
    marginTop: 30,
  },
  footerColumn: {
    minWidth: 120,
  },
  footerColumnTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
  },
  footerBottom: {
    alignItems: 'center',
    alignSelf: 'center',
    borderTopColor: MARKETING_COLORS.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 1180,
    paddingVertical: 20,
    width: '100%',
  },
  footerCopyright: {
    color: '#8A8B97',
    fontSize: 10,
  },
  footerAvailability: {
    color: '#8A8B97',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default MarketingLayout;
