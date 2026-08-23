import Ionicons from '@expo/vector-icons/Ionicons';
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
import {
  AgentPreview,
  CalendarPreview,
  MilestonePreview,
  ProductScene,
  SearchPreview,
} from './MarketingVisuals';

const PRINCIPLES = [
  {
    description: '没有账户也能完整记录和安排任务。',
    icon: 'phone-portrait-outline' as const,
    title: '本地优先',
  },
  {
    description: '所有操作先在本地完成，等待网络不再打断思路。',
    icon: 'flash-outline' as const,
    title: '即时响应',
  },
  {
    description: '登录后再启用跨设备云同步和冲突恢复。',
    icon: 'cloud-done-outline' as const,
    title: '按需同步',
  },
  {
    description: 'Web 与桌面共享同一套任务和编辑体验。',
    icon: 'desktop-outline' as const,
    title: '多端连续',
  },
];

const CAPABILITIES = [
  {
    description: '把复杂任务拆成清晰层级，拖动时先看到最终位置。',
    icon: 'git-branch-outline' as const,
    title: '项目与子任务',
  },
  {
    description: '正文支持图片、代码块和自动保存，任务不只是一行标题。',
    icon: 'document-text-outline' as const,
    title: '丰富任务详情',
  },
  {
    description: '完成记录来自历史事件，回顾节奏而不是猜测当前快照。',
    icon: 'stats-chart-outline' as const,
    title: '可信统计',
  },
  {
    description: '已完成与垃圾桶各自归位，活跃列表始终保持清爽。',
    icon: 'archive-outline' as const,
    title: '清晰归档',
  },
];

const FAQ = [
  {
    answer: '不需要。首次打开即可选择本地使用，之后随时可以登录并开启云同步。',
    question: '必须注册账户吗？',
  },
  {
    answer: 'Web 数据优先保存在当前浏览器；桌面和移动端保存在设备本地。登录后才会同步到云端。',
    question: '任务会保存在哪里？',
  },
  {
    answer: '不会。它先理解请求、展示计划并等待确认，执行后保留审计信息和撤销路径。',
    question: 'AI 会直接修改任务吗？',
  },
  {
    answer: 'Web 版可直接使用；macOS 与 Windows 已提供公开桌面安装包，其他平台会在正式发布后开放。',
    question: '目前支持哪些平台？',
  },
];

const Principle = ({
  description,
  icon,
  title,
}: (typeof PRINCIPLES)[number]) => (
  <View style={styles.principle}>
    <View style={styles.principleIcon}>
      <Ionicons color={MARKETING_COLORS.accent} name={icon} size={20} />
    </View>
    <Text style={styles.principleTitle}>{title}</Text>
    <Text style={styles.principleDescription}>{description}</Text>
  </View>
);

const Capability = ({
  description,
  icon,
  title,
}: (typeof CAPABILITIES)[number]) => (
  <View style={styles.capability}>
    <Ionicons color={MARKETING_COLORS.accent} name={icon} size={21} />
    <Text style={styles.capabilityTitle}>{title}</Text>
    <Text style={styles.capabilityDescription}>{description}</Text>
  </View>
);

const FeatureSection = ({
  children,
  compact,
  description,
  eyebrow,
  reverse = false,
  title,
}: {
  children: React.ReactNode;
  compact: boolean;
  description: string;
  eyebrow: string;
  reverse?: boolean;
  title: string;
}) => (
  <View
    style={[
      styles.featureSection,
      compact && styles.featureSectionCompact,
      reverse && !compact && styles.featureSectionReverse,
    ]}
  >
    <View style={styles.featureCopy}>
      <MarketingSectionHeading
        description={description}
        eyebrow={eyebrow}
        title={title}
      />
      <View style={styles.featureLink}>
        <MarketingLink
          href="/features"
          icon="arrow-forward"
          label="查看完整功能"
          variant="secondary"
        />
      </View>
    </View>
    <View style={styles.featureMedia}>{children}</View>
  </View>
);

const MarketingHome = () => {
  const { height, width } = useWindowDimensions();
  const compact = width < 760;
  const phone = width < 440;
  const short = height < 700;

  return (
    <MarketingLayout
      description="LightFlux 是一款本地优先的任务管理工具，提供今日任务、项目、日历、倒数纪念日、富文本详情、统计和受控 AI 助手。"
      path="/"
      title="LightFlux 流光清单 - 把今天，安排得刚刚好"
    >
      <View
        style={[
          styles.hero,
          compact && styles.heroCompact,
          short && styles.heroShort,
        ]}
      >
        <View style={styles.heroCopy}>
          <View style={styles.localFirstBadge}>
            <Ionicons
              color={MARKETING_COLORS.green}
              name="shield-checkmark-outline"
              size={15}
            />
            <Text style={styles.localFirstText}>本地优先 · 无需账户</Text>
          </View>
          <Text style={[styles.heroTitle, phone && styles.heroTitlePhone]}>
            LightFlux
          </Text>
          <Text style={[styles.heroTagline, phone && styles.heroTaglinePhone]}>
            把今天，安排得刚刚好
          </Text>
          {!short ? (
            <Text style={styles.heroDescription}>
              一个安静、紧凑的任务空间。先在本地立即工作，需要时再登录同步，
              让任务、日历和重要日子保持清晰。
            </Text>
          ) : null}
          <View
            style={[
              styles.heroActions,
              phone && styles.heroActionsPhone,
            ]}
          >
            <MarketingLink
              href="/today"
              icon="arrow-forward"
              label="打开 Web 版"
              variant="primary"
            />
            <MarketingLink
              href="/download"
              icon="download-outline"
              label="下载桌面版"
              variant="secondary"
            />
          </View>
        </View>
        <View
          style={[
            styles.heroScene,
            short && styles.heroSceneShort,
          ]}
        >
          <ProductScene />
        </View>
      </View>

      <View style={styles.principlesBand}>
        <View
          style={[
            styles.principles,
            compact && styles.principlesCompact,
          ]}
        >
          {PRINCIPLES.map((item) => (
            <Principle key={item.title} {...item} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <MarketingSectionHeading
          align="center"
          description="不是把功能堆在一起，而是让每天最常用的动作更短、更直接。"
          eyebrow="核心体验"
          title="从今天开始，保持清晰"
        />
        <FeatureSection
          compact={compact}
          description="在月历中看清安排，直接为选中的日期创建任务。计划与执行保持在一个连续空间里。"
          eyebrow="日历"
          title="先看到时间，再决定下一步"
        >
          <CalendarPreview />
        </FeatureSection>
        <FeatureSection
          compact={compact}
          description="用太阳历或农历记录纪念日、生日和截止日。每个重要时刻都有明确的剩余时间。"
          eyebrow="倒数纪念日"
          reverse
          title="值得期待的日子，不再被忘记"
        >
          <MilestonePreview />
        </FeatureSection>
        <FeatureSection
          compact={compact}
          description="标题、正文和项目统一检索，结果直接回到正确的任务上下文。"
          eyebrow="全局搜索"
          title="需要的内容，马上回到手边"
        >
          <SearchPreview />
        </FeatureSection>
      </View>

      <View style={styles.aiBand}>
        <View
          style={[
            styles.aiInner,
            compact && styles.featureSectionCompact,
          ]}
        >
          <View style={styles.featureCopy}>
            <MarketingSectionHeading
              description="LightFlux 不让模型绕过你的决定。每次改变都经过理解、消歧、预览与确认，执行后仍然可审计、可撤销。"
              eyebrow="任务助理"
              title="让 AI 帮忙，但控制权始终在你"
            />
            <View style={styles.aiPoints}>
              {['先展示改变', '确认后执行', '保留撤销路径'].map((item) => (
                <View key={item} style={styles.aiPoint}>
                  <Ionicons
                    color={MARKETING_COLORS.green}
                    name="checkmark-circle"
                    size={16}
                  />
                  <Text style={styles.aiPointText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.featureMedia}>
            <AgentPreview />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <MarketingSectionHeading
          align="center"
          description="围绕任务本身补齐上下文、顺序、回顾和恢复能力。"
          eyebrow="更多能力"
          title="足够完整，也足够克制"
        />
        <View
          style={[
            styles.capabilityGrid,
            compact && styles.capabilityGridCompact,
          ]}
        >
          {CAPABILITIES.map((item) => (
            <Capability key={item.title} {...item} />
          ))}
        </View>
      </View>

      <View style={styles.platformBand}>
        <View style={styles.platformInner}>
          <MarketingSectionHeading
            align="center"
            description="浏览器直接使用，也可以下载 macOS 与 Windows 桌面应用。Linux 与移动端将在发布准备完成后开放。"
            eyebrow="跨平台"
            title="在熟悉的设备上继续计划"
          />
          <View
            style={[
              styles.platforms,
              phone && styles.platformsPhone,
            ]}
          >
            {[
              ['globe-outline', 'Web'],
              ['logo-apple', 'macOS'],
              ['logo-windows', 'Windows'],
              ['logo-tux', 'Linux · 即将提供'],
            ].map(([icon, label]) => (
              <View key={label} style={styles.platform}>
                <Ionicons
                  color={MARKETING_COLORS.accent}
                  name={
                    icon as React.ComponentProps<typeof Ionicons>['name']
                  }
                  size={25}
                />
                <Text style={styles.platformLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.platformAction}>
            <MarketingLink
              href="/download"
              icon="download-outline"
              label="查看下载方式"
              variant="primary"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <MarketingSectionHeading
          align="center"
          eyebrow="常见问题"
          title="开始之前，你可能想知道"
        />
        <View style={styles.faqList}>
          {FAQ.map((item) => (
            <View key={item.question} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.finalCta}>
        <Text style={styles.finalCtaTitle}>今天的计划，现在就可以开始</Text>
        <Text style={styles.finalCtaDescription}>
          无需注册即可本地使用；需要跨设备时，再登录同步。
        </Text>
        <View
          style={[
            styles.heroActions,
            phone && styles.heroActionsPhone,
          ]}
        >
          <MarketingLink
            href="/today"
            icon="arrow-forward"
            label="打开 Web 版"
            variant="primary"
          />
          <MarketingLink
            href="/features"
            label="了解更多功能"
            variant="secondary"
          />
        </View>
      </View>
    </MarketingLayout>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignSelf: 'center',
    maxWidth: 1240,
    minHeight: 690,
    paddingBottom: 34,
    paddingHorizontal: 32,
    paddingTop: 50,
    width: '100%',
  },
  heroCompact: {
    minHeight: 640,
    paddingBottom: 26,
    paddingHorizontal: 18,
    paddingTop: 48,
  },
  heroShort: {
    minHeight: 0,
    paddingBottom: 18,
    paddingTop: 28,
  },
  heroCopy: {
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 760,
  },
  localFirstBadge: {
    alignItems: 'center',
    backgroundColor: '#EAF6F2',
    borderColor: '#CFE8DF',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 32,
    paddingHorizontal: 11,
  },
  localFirstText: {
    color: '#387F6F',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
  },
  heroTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 62,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 72,
    marginTop: 24,
    textAlign: 'center',
  },
  heroTitlePhone: {
    fontSize: 45,
    lineHeight: 54,
  },
  heroTagline: {
    color: MARKETING_COLORS.ink,
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
    marginTop: 2,
    textAlign: 'center',
  },
  heroTaglinePhone: {
    fontSize: 25,
    lineHeight: 34,
  },
  heroDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 15,
    lineHeight: 26,
    marginTop: 18,
    maxWidth: 620,
    textAlign: 'center',
  },
  heroActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 25,
  },
  heroActionsPhone: {
    alignSelf: 'stretch',
  },
  heroScene: {
    marginTop: 36,
  },
  heroSceneShort: {
    marginTop: 20,
  },
  principlesBand: {
    backgroundColor: MARKETING_COLORS.white,
    borderBottomColor: MARKETING_COLORS.line,
    borderBottomWidth: 1,
    borderTopColor: MARKETING_COLORS.line,
    borderTopWidth: 1,
    paddingHorizontal: 24,
  },
  principles: {
    alignSelf: 'center',
    flexDirection: 'row',
    maxWidth: 1180,
    paddingVertical: 42,
    width: '100%',
  },
  principlesCompact: {
    flexWrap: 'wrap',
    paddingVertical: 24,
  },
  principle: {
    flex: 1,
    minWidth: 180,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  principleIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  principleTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 12,
  },
  principleDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 5,
  },
  section: {
    alignSelf: 'center',
    maxWidth: 1180,
    paddingHorizontal: 24,
    paddingVertical: 96,
    width: '100%',
  },
  featureSection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 72,
    marginTop: 86,
  },
  featureSectionCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: 30,
    marginTop: 62,
  },
  featureSectionReverse: {
    flexDirection: 'row-reverse',
  },
  featureCopy: {
    flex: 1,
  },
  featureMedia: {
    flex: 1.12,
    minWidth: 0,
  },
  featureLink: {
    alignSelf: 'flex-start',
    marginTop: 22,
  },
  aiBand: {
    backgroundColor: '#EFEFF4',
    paddingHorizontal: 24,
    paddingVertical: 90,
  },
  aiInner: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 72,
    maxWidth: 1120,
    width: '100%',
  },
  aiPoints: {
    gap: 9,
    marginTop: 22,
  },
  aiPoint: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  aiPointText: {
    color: '#555665',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  capabilityGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 46,
  },
  capabilityGridCompact: {
    flexWrap: 'wrap',
  },
  capability: {
    backgroundColor: MARKETING_COLORS.white,
    borderColor: MARKETING_COLORS.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 190,
    minWidth: 210,
    padding: 20,
  },
  capabilityTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 19,
  },
  capabilityDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 11,
    lineHeight: 19,
    marginTop: 8,
  },
  platformBand: {
    backgroundColor: '#F0EEFF',
    borderBottomColor: '#DCD8F6',
    borderBottomWidth: 1,
    borderTopColor: '#DCD8F6',
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 82,
  },
  platformInner: {
    alignSelf: 'center',
    maxWidth: 1040,
    width: '100%',
  },
  platforms: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 40,
  },
  platformsPhone: {
    flexWrap: 'wrap',
  },
  platform: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDD9F3',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 112,
    minWidth: 150,
    padding: 18,
  },
  platformLabel: {
    color: '#454657',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  platformAction: {
    alignSelf: 'center',
    marginTop: 28,
  },
  faqList: {
    alignSelf: 'center',
    marginTop: 38,
    maxWidth: 820,
    width: '100%',
  },
  faqItem: {
    borderTopColor: MARKETING_COLORS.line,
    borderTopWidth: 1,
    paddingVertical: 22,
  },
  faqQuestion: {
    color: MARKETING_COLORS.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  faqAnswer: {
    color: MARKETING_COLORS.muted,
    fontSize: 12,
    lineHeight: 21,
    marginTop: 8,
  },
  finalCta: {
    alignItems: 'center',
    backgroundColor: '#F4F4F8',
    borderTopColor: MARKETING_COLORS.line,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 88,
  },
  finalCtaTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 43,
    textAlign: 'center',
  },
  finalCtaDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default MarketingHome;
