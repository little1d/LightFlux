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

const FEATURE_PROJECTS = [
  {
    bullets: ['快速新增', '键盘操作', '任务完成即时反馈'],
    description:
      '把收集入口放在最常用的位置，不需要先选择复杂属性。标题写下后，日期、项目与优先级可以继续调整。',
    icon: 'sunny-outline' as const,
    title: '从 Today 开始执行',
    visual: 'product',
  },
  {
    bullets: ['项目管理', '子任务', '平滑拖拽排序'],
    description:
      '根任务与子任务保持清晰层级，拖动时其他任务会先让出位置，松手前即可确认最终顺序。',
    icon: 'git-branch-outline' as const,
    title: '让复杂工作保持结构',
    visual: 'product',
  },
  {
    bullets: ['月历视图', '按日期创建', '任务日程连续切换'],
    description:
      '先从月历看到节奏，再把事项放到具体日期。Calendar 不重复制造输入框，只保留直接创建路径。',
    icon: 'calendar-outline' as const,
    title: '在时间中安排任务',
    visual: 'calendar',
  },
  {
    bullets: ['太阳历与农历', '每年重复', '提前提醒'],
    description:
      '生日、纪念日、截止日和节日使用同一套紧凑流程，重要时刻与日常任务互相独立。',
    icon: 'hourglass-outline' as const,
    title: '记住值得期待的日子',
    visual: 'milestones',
  },
  {
    bullets: ['富文本正文', '图片与代码块', '自动保存'],
    description:
      '任务详情可以承载真正有用的上下文。编辑过程留在当前任务旁边，不需要在页面之间反复跳转。',
    icon: 'document-text-outline' as const,
    title: '把信息留在任务里',
    visual: 'product',
  },
  {
    bullets: ['标题与正文检索', '项目定位', '历史统计'],
    description:
      '全局搜索直接回到正确上下文；完成趋势和任务压力来自真实事件记录，而不是当前列表的猜测。',
    icon: 'search-outline' as const,
    title: '快速找到，并可靠回顾',
    visual: 'search',
  },
  {
    bullets: ['建议预览', '显式确认', '审计与撤销'],
    description:
      '任务助理只提出可检查的改变。模型无法绕过本地业务规则直接修改你的数据。',
    icon: 'sparkles-outline' as const,
    title: '让 AI 在边界内工作',
    visual: 'agent',
  },
] as const;

const LocalFirstVisual = () => (
  <View style={styles.localFirstVisual}>
    <View style={styles.localFirstDevice}>
      <Ionicons color="#6759E8" name="phone-portrait-outline" size={24} />
      <Text style={styles.localFirstDeviceTitle}>设备本地</Text>
      <Text style={styles.localFirstDeviceCopy}>立即写入 · 离线可用</Text>
    </View>
    <View style={styles.localFirstFlow}>
      <View style={styles.localFirstLine} />
      <View style={styles.localFirstFlowIcon}>
        <Ionicons color="#6759E8" name="sync-outline" size={18} />
      </View>
      <View style={styles.localFirstLine} />
    </View>
    <View style={styles.localFirstDevice}>
      <Ionicons color="#3E9C88" name="cloud-done-outline" size={24} />
      <Text style={styles.localFirstDeviceTitle}>可选云同步</Text>
      <Text style={styles.localFirstDeviceCopy}>版本校验 · 冲突恢复</Text>
    </View>
  </View>
);

const FeatureVisual = ({
  type,
}: {
  type: (typeof FEATURE_PROJECTS)[number]['visual'];
}) => {
  if (type === 'calendar') {
    return <CalendarPreview />;
  }
  if (type === 'milestones') {
    return <MilestonePreview />;
  }
  if (type === 'search') {
    return <SearchPreview />;
  }
  if (type === 'agent') {
    return <AgentPreview />;
  }
  return <ProductScene />;
};

const MarketingFeatures = () => {
  const { width } = useWindowDimensions();
  const compact = width < 820;

  return (
    <MarketingLayout
      description="了解 LightFlux 的 Today、项目、日历、倒数纪念日、富文本详情、搜索、统计、云同步与受控 AI 工作流。"
      path="/features"
      title="LightFlux 功能介绍"
    >
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={styles.heroIcon}>
          <Ionicons color="#6759E8" name="layers-outline" size={24} />
        </View>
        <Text style={styles.heroTitle}>LightFlux 功能</Text>
        <Text style={styles.heroSubtitle}>
          从捕捉任务到回顾完成节奏，每一步都保持直接、可见、可控制。
        </Text>
        <View style={styles.heroActions}>
          <MarketingLink
            href="/today"
            icon="arrow-forward"
            label="打开 Web 版"
            variant="primary"
          />
          <MarketingLink
            href="/download"
            icon="download-outline"
            label="下载应用"
            variant="secondary"
          />
        </View>
      </View>

      <View style={styles.localFirstBand}>
        <View
          style={[
            styles.localFirstInner,
            compact && styles.blockCompact,
          ]}
        >
          <View style={styles.localFirstCopy}>
            <MarketingSectionHeading
              description="界面操作先在本地完成。账户不是使用前提，而是在你需要跨设备连续工作时提供增强。"
              eyebrow="本地优先"
              title="先属于设备，再选择是否同步"
            />
          </View>
          <View style={styles.localFirstMedia}>
            <LocalFirstVisual />
          </View>
        </View>
      </View>

      <View style={styles.features}>
        {FEATURE_PROJECTS.map((feature, index) => (
          <View
            key={feature.title}
            style={[
              styles.featureBlock,
              compact && styles.blockCompact,
              index % 2 === 1 && !compact && styles.featureBlockReverse,
            ]}
          >
            <View style={styles.featureCopy}>
              <View style={styles.featureIcon}>
                <Ionicons
                  color={MARKETING_COLORS.accent}
                  name={feature.icon}
                  size={21}
                />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>
                {feature.description}
              </Text>
              <View style={styles.bullets}>
                {feature.bullets.map((bullet) => (
                  <View key={bullet} style={styles.bullet}>
                    <Ionicons
                      color={MARKETING_COLORS.green}
                      name="checkmark-circle"
                      size={16}
                    />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.featureMedia}>
              <FeatureVisual type={feature.visual} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.finalBand}>
        <Text style={styles.finalTitle}>先用起来，再决定是否登录</Text>
        <Text style={styles.finalDescription}>
          本地模式保留完整任务能力，云同步始终由你主动开启。
        </Text>
        <View style={styles.heroActions}>
          <MarketingLink
            href="/today"
            icon="arrow-forward"
            label="开始使用"
            variant="primary"
          />
          <MarketingLink
            href="/help"
            label="查看常见问题"
            variant="secondary"
          />
        </View>
      </View>
    </MarketingLayout>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 920,
    paddingBottom: 90,
    paddingHorizontal: 24,
    paddingTop: 100,
    width: '100%',
  },
  heroCompact: {
    paddingBottom: 64,
    paddingTop: 68,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  heroTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 58,
    marginTop: 22,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: MARKETING_COLORS.muted,
    fontSize: 16,
    lineHeight: 27,
    marginTop: 14,
    maxWidth: 650,
    textAlign: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 25,
  },
  localFirstBand: {
    backgroundColor: '#F2F1F6',
    borderBottomColor: MARKETING_COLORS.line,
    borderBottomWidth: 1,
    borderTopColor: MARKETING_COLORS.line,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 82,
  },
  localFirstInner: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 70,
    maxWidth: 1120,
    width: '100%',
  },
  localFirstCopy: {
    flex: 1,
  },
  localFirstMedia: {
    flex: 1.1,
  },
  localFirstVisual: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DFDEE7',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 250,
    padding: 24,
  },
  localFirstDevice: {
    alignItems: 'center',
    flex: 1,
  },
  localFirstDeviceTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 13,
  },
  localFirstDeviceCopy: {
    color: MARKETING_COLORS.muted,
    fontSize: 9,
    marginTop: 5,
    textAlign: 'center',
  },
  localFirstFlow: {
    alignItems: 'center',
    flex: 0.8,
    flexDirection: 'row',
  },
  localFirstLine: {
    backgroundColor: '#D8D5EF',
    height: 1,
    flex: 1,
  },
  localFirstFlowIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    marginHorizontal: 8,
    width: 36,
  },
  features: {
    alignSelf: 'center',
    maxWidth: 1140,
    paddingHorizontal: 24,
    paddingVertical: 30,
    width: '100%',
  },
  featureBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 74,
    paddingVertical: 76,
  },
  featureBlockReverse: {
    flexDirection: 'row-reverse',
  },
  blockCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: 32,
  },
  featureCopy: {
    flex: 0.85,
  },
  featureMedia: {
    flex: 1.15,
    minWidth: 0,
  },
  featureIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  featureTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
    marginTop: 18,
  },
  featureDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 14,
    lineHeight: 24,
    marginTop: 12,
  },
  bullets: {
    gap: 9,
    marginTop: 20,
  },
  bullet: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  bulletText: {
    color: '#555665',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  finalBand: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderTopColor: '#DBD7F4',
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 82,
  },
  finalTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 33,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 42,
    textAlign: 'center',
  },
  finalDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 14,
    marginTop: 11,
    textAlign: 'center',
  },
});

export default MarketingFeatures;
