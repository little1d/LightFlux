import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { inputAccentProps } from '../../config/input';
import MarketingLayout, {
  MARKETING_COLORS,
  MarketingLink,
  MarketingSectionHeading,
} from './MarketingLayout';

const GUIDES = [
  {
    description: '本地模式、登录与多设备同步的边界。',
    icon: 'cloud-outline' as const,
    title: '账户与同步',
  },
  {
    description: 'Today、项目、子任务和优先级。',
    icon: 'checkbox-outline' as const,
    title: '任务管理',
  },
  {
    description: '日历、日期调整和倒数纪念日。',
    icon: 'calendar-outline' as const,
    title: '时间规划',
  },
  {
    description: '富文本、图片、代码块和自动保存。',
    icon: 'document-text-outline' as const,
    title: '任务详情',
  },
  {
    description: '搜索、完成记录和历史统计。',
    icon: 'stats-chart-outline' as const,
    title: '查找与回顾',
  },
  {
    description: '预览、确认、执行、审计与撤销。',
    icon: 'sparkles-outline' as const,
    title: '任务助理',
  },
];

const FAQS = [
  {
    answer:
      '首次打开时选择“本地使用”即可。账户只用于跨设备同步，不会阻止你使用任务、日历、项目和详情功能。',
    keywords: '账户 注册 本地 登录',
    question: '不注册账户可以使用吗？',
  },
  {
    answer:
      'Web 端优先保存在浏览器 IndexedDB，桌面和移动端保存在设备本地。登录后，版本化应用状态会同步到云端。',
    keywords: '数据 保存 本地 IndexedDB 云端',
    question: '任务数据保存在哪里？',
  },
  {
    answer:
      '支持邮箱密码和六位邮箱验证码。密码适合日常登录，验证码也可以用于无密码登录和账户验证。',
    keywords: '登录 密码 验证码 OTP 邮箱',
    question: '支持哪些登录方式？',
  },
  {
    answer:
      '当前公开桌面 Release 提供 macOS Apple Silicon、macOS Intel 和 Windows x64。Web 版可以直接打开。',
    keywords: '下载 macOS Windows Web 平台',
    question: '桌面版支持哪些平台？',
  },
  {
    answer:
      '不会。任务助理先把建议展示给你，只有确认后才通过应用规则执行，并保留审计和撤销路径。',
    keywords: 'AI 任务助理 修改 确认 撤销',
    question: '任务助理会直接修改我的数据吗？',
  },
  {
    answer:
      '完成和删除后会立即离开 Today 与 Projects。完成任务进入已完成页面，删除任务进入可恢复的垃圾桶。',
    keywords: '完成 删除 垃圾桶 恢复',
    question: '完成或删除的任务去了哪里？',
  },
  {
    answer:
      '使用 Command/Ctrl + F 打开全局搜索，可以匹配任务标题、正文和项目，并直接回到对应任务。',
    keywords: '搜索 快捷键 正文 项目',
    question: '如何快速找到任务？',
  },
];

const Guide = ({
  compact,
  description,
  icon,
  title,
}: (typeof GUIDES)[number] & { compact: boolean }) => (
  <View style={[styles.guide, compact && styles.guideCompact]}>
    <View style={styles.guideIcon}>
      <Ionicons color={MARKETING_COLORS.accent} name={icon} size={21} />
    </View>
    <Text style={styles.guideTitle}>{title}</Text>
    <Text style={styles.guideDescription}>{description}</Text>
  </View>
);

const MarketingHelp = () => {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(FAQS[0].question);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleFaqs = useMemo(
    () =>
      FAQS.filter((faq) =>
        `${faq.question} ${faq.answer} ${faq.keywords}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery],
  );

  return (
    <MarketingLayout
      description="查找 LightFlux 本地模式、账户同步、任务管理、日历、下载和任务助理的常见问题。"
      path="/help"
      title="LightFlux 帮助中心"
    >
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <Text style={styles.heroEyebrow}>LIGHTFLUX HELP</Text>
        <Text style={styles.heroTitle}>需要什么帮助？</Text>
        <Text style={styles.heroDescription}>
          从一个问题开始，快速找到本地模式、任务组织、同步与下载说明。
        </Text>
        <View style={styles.search}>
          <Ionicons color="#81828F" name="search-outline" size={19} />
          <TextInput
            {...inputAccentProps}
            accessibilityLabel="搜索帮助"
            onChangeText={setQuery}
            placeholder="搜索账户、同步、任务或下载..."
            placeholderTextColor="#999AA6"
            style={styles.searchInput}
            value={query}
          />
        </View>
      </View>

      <View style={styles.guidesSection}>
        <MarketingSectionHeading
          description="按使用场景了解 LightFlux 的主要工作流。"
          eyebrow="功能指南"
          title="从这里开始"
        />
        <View
          style={[
            styles.guides,
            compact && styles.guidesCompact,
          ]}
        >
          {GUIDES.map((guide) => (
            <Guide compact={compact} key={guide.title} {...guide} />
          ))}
        </View>
      </View>

      <View style={styles.faqSection}>
        <View style={styles.faqInner}>
          <MarketingSectionHeading
            description={
              normalizedQuery
                ? `找到 ${visibleFaqs.length} 个相关问题`
                : '第一版帮助中心先覆盖使用前最常见的问题。'
            }
            eyebrow="FAQ"
            title="常见问题"
          />
          <View style={styles.faqList}>
            {visibleFaqs.length > 0 ? (
              visibleFaqs.map((faq) => {
                const isExpanded = expanded === faq.question;
                return (
                  <View key={faq.question} style={styles.faqItem}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      onPress={() =>
                        setExpanded(isExpanded ? null : faq.question)
                      }
                      style={({ pressed }) => [
                        styles.faqQuestionButton,
                        pressed && styles.faqQuestionPressed,
                      ]}
                    >
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <Ionicons
                        color="#878894"
                        name={
                          isExpanded
                            ? 'remove-outline'
                            : 'add-outline'
                        }
                        size={18}
                      />
                    </Pressable>
                    {isExpanded ? (
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View style={styles.noResults}>
                <Ionicons
                  color="#A0A1AD"
                  name="search-outline"
                  size={25}
                />
                <Text style={styles.noResultsTitle}>没有找到相关问题</Text>
                <Text style={styles.noResultsText}>
                  换一个更短的关键词，或从功能介绍中查看完整能力。
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.supportBand}>
        <Text style={styles.supportTitle}>仍然没有找到答案？</Text>
        <Text style={styles.supportDescription}>
          当前可先查看功能与下载说明。正式支持邮箱会在公开发布前补充。
        </Text>
        <View style={styles.supportActions}>
          <MarketingLink
            href="/features"
            label="查看功能"
            variant="secondary"
          />
          <MarketingLink
            href="/download"
            icon="download-outline"
            label="查看下载"
            variant="primary"
          />
        </View>
      </View>
    </MarketingLayout>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderBottomColor: '#DCD8F5',
    borderBottomWidth: 1,
    paddingBottom: 80,
    paddingHorizontal: 24,
    paddingTop: 92,
  },
  heroCompact: {
    paddingBottom: 58,
    paddingTop: 62,
  },
  heroEyebrow: {
    color: MARKETING_COLORS.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  heroTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 45,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 56,
    marginTop: 12,
    textAlign: 'center',
  },
  heroDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 12,
    textAlign: 'center',
  },
  search: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D7D3EC',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 29,
    maxWidth: 680,
    minHeight: 58,
    paddingHorizontal: 16,
    shadowColor: '#46405E',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    width: '100%',
  },
  searchInput: {
    color: MARKETING_COLORS.ink,
    flex: 1,
    fontSize: 14,
    marginLeft: 10,
    minHeight: 54,
    outlineColor: 'transparent',
  },
  guidesSection: {
    alignSelf: 'center',
    maxWidth: 1120,
    paddingHorizontal: 24,
    paddingVertical: 86,
    width: '100%',
  },
  guides: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 36,
  },
  guidesCompact: {
    flexDirection: 'column',
  },
  guide: {
    backgroundColor: '#FFFFFF',
    borderColor: MARKETING_COLORS.line,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 180,
    padding: 20,
    width: '32%',
  },
  guideCompact: {
    width: '100%',
  },
  guideIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  guideTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 17,
  },
  guideDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 11,
    lineHeight: 19,
    marginTop: 7,
  },
  faqSection: {
    backgroundColor: '#F4F4F7',
    borderBottomColor: MARKETING_COLORS.line,
    borderBottomWidth: 1,
    borderTopColor: MARKETING_COLORS.line,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 86,
  },
  faqInner: {
    alignSelf: 'center',
    maxWidth: 900,
    width: '100%',
  },
  faqList: {
    marginTop: 34,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: MARKETING_COLORS.line,
    borderBottomWidth: 1,
  },
  faqQuestionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 18,
  },
  faqQuestionPressed: {
    backgroundColor: '#F8F7FA',
  },
  faqQuestion: {
    color: MARKETING_COLORS.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    marginRight: 14,
  },
  faqAnswer: {
    color: MARKETING_COLORS.muted,
    fontSize: 11,
    lineHeight: 20,
    paddingBottom: 20,
    paddingHorizontal: 18,
  },
  noResults: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    minHeight: 220,
    padding: 32,
  },
  noResultsTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 14,
  },
  noResultsText: {
    color: MARKETING_COLORS.muted,
    fontSize: 11,
    marginTop: 7,
    textAlign: 'center',
  },
  supportBand: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 84,
  },
  supportTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
    textAlign: 'center',
  },
  supportDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
  },
  supportActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 23,
  },
});

export default MarketingHelp;
