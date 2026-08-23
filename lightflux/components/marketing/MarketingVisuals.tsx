import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { MARKETING_COLORS } from './MarketingLayout';

const TASKS = [
  { color: '#6759E8', done: false, title: '整理本周产品计划' },
  { color: '#3E9C88', done: true, title: '完成首页内容草稿' },
  { color: '#C9844C', done: false, title: '确认桌面版本发布说明' },
  { color: '#CF6175', done: false, title: '回顾今天的重要事项' },
];

const NavItem = ({
  active = false,
  icon,
}: {
  active?: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) => (
  <View style={[styles.navItem, active && styles.navItemActive]}>
    <Ionicons
      color={active ? MARKETING_COLORS.accent : '#A0A1AC'}
      name={icon}
      size={17}
    />
  </View>
);

const TaskRow = ({
  color,
  done,
  title,
}: {
  color: string;
  done: boolean;
  title: string;
}) => (
  <View style={styles.taskRow}>
    <View
      style={[
        styles.checkbox,
        done && { backgroundColor: color, borderColor: color },
      ]}
    >
      {done ? <Ionicons color="#FFFFFF" name="checkmark" size={11} /> : null}
    </View>
    <Text
      numberOfLines={1}
      style={[styles.taskText, done && styles.taskTextDone]}
    >
      {title}
    </Text>
    <View style={[styles.taskAccent, { backgroundColor: color }]} />
  </View>
);

export const ProductScene = () => {
  const { height, width } = useWindowDimensions();
  const compact = width < 720;
  const narrow = width < 430;
  const short = height < 700;

  return (
    <View
      accessibilityLabel="LightFlux 今日任务、项目与任务详情界面预览"
      style={[
        styles.productScene,
        compact && styles.productSceneCompact,
        narrow && styles.productSceneNarrow,
        short && styles.productSceneShort,
      ]}
    >
      <View style={styles.sceneToolbar}>
        <View style={styles.windowDots}>
          <View style={[styles.windowDot, { backgroundColor: '#E46E72' }]} />
          <View style={[styles.windowDot, { backgroundColor: '#D7A247' }]} />
          <View style={[styles.windowDot, { backgroundColor: '#54A98E' }]} />
        </View>
        <View style={styles.sceneToolbarTitle}>
          <View style={styles.sceneMiniMark}>
            <Ionicons color="#FFFFFF" name="checkmark" size={10} />
          </View>
          <Text style={styles.sceneToolbarText}>LightFlux</Text>
        </View>
        <View style={styles.sceneToolbarActions}>
          <Ionicons color="#8E8F9D" name="search-outline" size={15} />
          <Ionicons color="#6759E8" name="sparkles" size={15} />
        </View>
      </View>
      <View style={styles.sceneBody}>
        {!narrow ? (
          <View style={styles.sceneSidebar}>
            <NavItem active icon="sunny-outline" />
            <NavItem icon="calendar-outline" />
            <NavItem icon="hourglass-outline" />
            <NavItem icon="albums-outline" />
          </View>
        ) : null}
        <View style={styles.sceneList}>
          <View style={styles.sceneListHeader}>
            <View>
              <Text style={styles.sceneEyebrow}>TODAY</Text>
              <Text style={styles.sceneTitle}>今天</Text>
            </View>
            <View style={styles.sceneCount}>
              <Text style={styles.sceneCountText}>3</Text>
            </View>
          </View>
          <View style={styles.sceneComposer}>
            <Ionicons color="#999AA6" name="add" size={15} />
            <Text style={styles.sceneComposerText}>写下要完成的事情...</Text>
          </View>
          {TASKS.map((task) => (
            <TaskRow key={task.title} {...task} />
          ))}
        </View>
        {!compact ? (
          <View style={styles.sceneDetail}>
            <View style={styles.sceneDetailHeader}>
              <Text style={styles.sceneDetailTitle}>整理本周产品计划</Text>
              <Ionicons color="#8F909C" name="close" size={16} />
            </View>
            <View style={styles.detailMetaRow}>
              <View style={styles.detailMeta}>
                <Ionicons color="#6759E8" name="calendar-outline" size={13} />
                <Text style={styles.detailMetaText}>今天</Text>
              </View>
              <View style={styles.detailMeta}>
                <View style={styles.detailDot} />
                <Text style={styles.detailMetaText}>产品</Text>
              </View>
            </View>
            <Text style={styles.detailHeading}>本周重点</Text>
            <View style={styles.detailLineLong} />
            <View style={styles.detailLineMedium} />
            <View style={styles.detailCode}>
              <Text style={styles.detailCodeText}>
                先确认优先级，再安排执行顺序。
              </Text>
            </View>
            <View style={styles.detailFooter}>
              <Ionicons color="#8A8B97" name="image-outline" size={15} />
              <Text style={styles.detailFooterText}>自动保存</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

export const CalendarPreview = () => (
  <View
    accessibilityLabel="LightFlux 月历与每日任务预览"
    style={styles.featureVisual}
  >
    <View style={styles.calendarHeader}>
      <View>
        <Text style={styles.sceneEyebrow}>AUGUST 2026</Text>
        <Text style={styles.featureVisualTitle}>日历计划</Text>
      </View>
      <View style={styles.calendarControl}>
        <Ionicons color="#676879" name="chevron-back" size={14} />
        <Text style={styles.calendarControlText}>今天</Text>
        <Ionicons color="#676879" name="chevron-forward" size={14} />
      </View>
    </View>
    <View style={styles.weekLabels}>
      {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
        <Text key={day} style={styles.weekLabel}>
          {day}
        </Text>
      ))}
    </View>
    <View style={styles.calendarGrid}>
      {Array.from({ length: 28 }, (_, index) => {
        const day = index + 1;
        const selected = day === 23;
        const hasTask = [3, 7, 11, 18, 23, 25].includes(day);
        return (
          <View
            key={day}
            style={[
              styles.calendarDay,
              selected && styles.calendarDaySelected,
            ]}
          >
            <Text
              style={[
                styles.calendarDayText,
                selected && styles.calendarDayTextSelected,
              ]}
            >
              {day}
            </Text>
            {hasTask ? (
              <View
                style={[
                  styles.calendarTaskDot,
                  selected && styles.calendarTaskDotSelected,
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  </View>
);

export const AgentPreview = () => (
  <View
    accessibilityLabel="LightFlux AI 操作预览与确认流程"
    style={[styles.featureVisual, styles.agentVisual]}
  >
    <View style={styles.agentHeader}>
      <View style={styles.agentIcon}>
        <Ionicons color="#FFFFFF" name="sparkles" size={18} />
      </View>
      <View style={styles.agentHeaderText}>
        <Text style={styles.agentTitle}>任务助理</Text>
        <Text style={styles.agentSubtitle}>先预览，再执行</Text>
      </View>
    </View>
    <View style={styles.agentPrompt}>
      <Text style={styles.agentPromptText}>
        把明天的发布准备拆成三个步骤，并放到产品发布项目
      </Text>
    </View>
    <View style={styles.agentPlan}>
      <Text style={styles.agentPlanLabel}>建议的改变</Text>
      {['核对发布清单', '准备版本说明', '验证下载链接'].map(
        (item, index) => (
          <View key={item} style={styles.agentPlanRow}>
            <View style={styles.agentPlanIndex}>
              <Text style={styles.agentPlanIndexText}>{index + 1}</Text>
            </View>
            <Text style={styles.agentPlanText}>{item}</Text>
            <Ionicons color="#53A58E" name="checkmark-circle" size={15} />
          </View>
        ),
      )}
    </View>
    <View style={styles.agentActions}>
      <Text style={styles.agentAuditText}>可审计 · 可撤销</Text>
      <View style={styles.agentConfirm}>
        <Ionicons color="#FFFFFF" name="checkmark" size={13} />
        <Text style={styles.agentConfirmText}>确认执行</Text>
      </View>
    </View>
  </View>
);

export const MilestonePreview = () => (
  <View
    accessibilityLabel="LightFlux 倒数纪念日预览"
    style={styles.featureVisual}
  >
    <View style={styles.milestoneTop}>
      <View>
        <Text style={styles.sceneEyebrow}>MILESTONES</Text>
        <Text style={styles.featureVisualTitle}>重要日子</Text>
      </View>
      <Ionicons color="#6759E8" name="add-circle" size={25} />
    </View>
    {[
      {
        color: '#D95D72',
        icon: 'heart-outline' as const,
        label: '产品上线纪念日',
        value: '还有 18 天',
      },
      {
        color: '#C9844C',
        icon: 'hourglass-outline' as const,
        label: '版本发布',
        value: '还有 5 天',
      },
      {
        color: '#3E9C88',
        icon: 'gift-outline' as const,
        label: '生日',
        value: '还有 42 天',
      },
    ].map((item) => (
      <View key={item.label} style={styles.milestoneRow}>
        <View
          style={[
            styles.milestoneIcon,
            { backgroundColor: `${item.color}18` },
          ]}
        >
          <Ionicons color={item.color} name={item.icon} size={17} />
        </View>
        <Text style={styles.milestoneLabel}>{item.label}</Text>
        <Text style={[styles.milestoneValue, { color: item.color }]}>
          {item.value}
        </Text>
      </View>
    ))}
  </View>
);

export const SearchPreview = () => (
  <View
    accessibilityLabel="LightFlux 全局搜索预览"
    style={styles.featureVisual}
  >
    <View style={styles.searchBox}>
      <Ionicons color="#777887" name="search-outline" size={17} />
      <Text style={styles.searchQuery}>发布</Text>
      <View style={styles.searchShortcut}>
        <Text style={styles.searchShortcutText}>⌘ F</Text>
      </View>
    </View>
    <Text style={styles.searchSummary}>找到 3 项相关内容</Text>
    {[
      ['准备版本说明', '今天 · 产品'],
      ['验证发布下载链接', '明天 · 发布'],
      ['桌面版发布记录', '任务正文'],
    ].map(([title, meta], index) => (
      <View
        key={title}
        style={[
          styles.searchResult,
          index === 0 && styles.searchResultActive,
        ]}
      >
        <View style={styles.searchResultIcon}>
          <Ionicons
            color={index === 0 ? '#6759E8' : '#8F909C'}
            name="document-text-outline"
            size={15}
          />
        </View>
        <View style={styles.searchResultText}>
          <Text style={styles.searchResultTitle}>{title}</Text>
          <Text style={styles.searchResultMeta}>{meta}</Text>
        </View>
        <Ionicons color="#A3A4AF" name="chevron-forward" size={14} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  productScene: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D9D8E2',
    borderRadius: 8,
    borderWidth: 1,
    height: 360,
    maxWidth: 1080,
    overflow: 'hidden',
    shadowColor: '#282638',
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 36,
    width: '100%',
  },
  productSceneCompact: {
    height: 270,
  },
  productSceneNarrow: {
    height: 245,
  },
  productSceneShort: {
    height: 145,
  },
  sceneToolbar: {
    alignItems: 'center',
    backgroundColor: '#F7F7FA',
    borderBottomColor: '#E4E3EA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 42,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  windowDots: {
    flexDirection: 'row',
    gap: 5,
  },
  windowDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  sceneToolbarTitle: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  sceneMiniMark: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 5,
    height: 19,
    justifyContent: 'center',
    marginRight: 6,
    width: 19,
  },
  sceneToolbarText: {
    color: '#444555',
    fontSize: 11,
    fontWeight: '800',
  },
  sceneToolbarActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sceneBody: {
    flex: 1,
    flexDirection: 'row',
  },
  sceneSidebar: {
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRightColor: '#E7E6ED',
    borderRightWidth: 1,
    gap: 7,
    paddingTop: 16,
    width: 58,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: 7,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  navItemActive: {
    backgroundColor: '#ECE9FF',
  },
  sceneList: {
    flex: 1,
    padding: 18,
  },
  sceneListHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sceneEyebrow: {
    color: '#9293A0',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sceneTitle: {
    color: '#292A3B',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 2,
  },
  sceneCount: {
    alignItems: 'center',
    backgroundColor: '#EEEAFE',
    borderRadius: 8,
    height: 25,
    justifyContent: 'center',
    width: 25,
  },
  sceneCountText: {
    color: '#6759E8',
    fontSize: 10,
    fontWeight: '900',
  },
  sceneComposer: {
    alignItems: 'center',
    backgroundColor: '#F5F4F8',
    borderRadius: 7,
    flexDirection: 'row',
    height: 40,
    marginBottom: 10,
    paddingHorizontal: 11,
  },
  sceneComposerText: {
    color: '#9A9BA7',
    fontSize: 10,
    marginLeft: 7,
  },
  taskRow: {
    alignItems: 'center',
    borderBottomColor: '#ECEBF1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 4,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#C8C7D1',
    borderRadius: 6,
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    marginRight: 10,
    width: 18,
  },
  taskText: {
    color: '#393A4B',
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
  },
  taskTextDone: {
    color: '#9A9BA7',
    textDecorationLine: 'line-through',
  },
  taskAccent: {
    borderRadius: 2,
    height: 16,
    width: 3,
  },
  sceneDetail: {
    backgroundColor: '#FCFCFD',
    borderLeftColor: '#E5E4EB',
    borderLeftWidth: 1,
    padding: 18,
    width: '38%',
  },
  sceneDetailHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sceneDetailTitle: {
    color: '#303143',
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    marginRight: 8,
  },
  detailMetaRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
  },
  detailMeta: {
    alignItems: 'center',
    backgroundColor: '#F1EFFB',
    borderRadius: 6,
    flexDirection: 'row',
    minHeight: 25,
    paddingHorizontal: 8,
  },
  detailDot: {
    backgroundColor: '#3E9C88',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  detailMetaText: {
    color: '#666778',
    fontSize: 8,
    fontWeight: '700',
    marginLeft: 5,
  },
  detailHeading: {
    color: '#4A4B5C',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 22,
  },
  detailLineLong: {
    backgroundColor: '#D9D8E0',
    borderRadius: 2,
    height: 5,
    marginTop: 10,
    width: '88%',
  },
  detailLineMedium: {
    backgroundColor: '#E4E3E9',
    borderRadius: 2,
    height: 5,
    marginTop: 7,
    width: '64%',
  },
  detailCode: {
    backgroundColor: '#F1F0F4',
    borderLeftColor: '#6759E8',
    borderLeftWidth: 3,
    borderRadius: 5,
    marginTop: 18,
    padding: 10,
  },
  detailCodeText: {
    color: '#6B6C79',
    fontSize: 8,
    lineHeight: 13,
  },
  detailFooter: {
    alignItems: 'center',
    bottom: 18,
    flexDirection: 'row',
    position: 'absolute',
    right: 18,
  },
  detailFooterText: {
    color: '#9697A3',
    fontSize: 8,
    marginLeft: 5,
  },
  featureVisual: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFDEE7',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 330,
    padding: 20,
    shadowColor: '#353344',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  featureVisualTitle: {
    color: '#303142',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarControl: {
    alignItems: 'center',
    backgroundColor: '#F4F3F7',
    borderRadius: 7,
    flexDirection: 'row',
    gap: 7,
    minHeight: 30,
    paddingHorizontal: 8,
  },
  calendarControlText: {
    color: '#666778',
    fontSize: 9,
    fontWeight: '700',
  },
  weekLabels: {
    flexDirection: 'row',
    marginTop: 20,
  },
  weekLabel: {
    color: '#999AA6',
    flex: 1,
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 7,
  },
  calendarDay: {
    alignItems: 'center',
    aspectRatio: 1.12,
    borderColor: '#EFEEF3',
    borderRightWidth: 1,
    borderTopWidth: 1,
    justifyContent: 'center',
    width: '14.2857%',
  },
  calendarDaySelected: {
    backgroundColor: '#6759E8',
    borderColor: '#6759E8',
    borderRadius: 6,
  },
  calendarDayText: {
    color: '#656675',
    fontSize: 9,
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
  },
  calendarTaskDot: {
    backgroundColor: '#55A792',
    borderRadius: 2,
    height: 4,
    marginTop: 4,
    width: 4,
  },
  calendarTaskDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  agentVisual: {
    backgroundColor: '#252632',
    borderColor: '#393A48',
  },
  agentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  agentIcon: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  agentHeaderText: {
    marginLeft: 10,
  },
  agentTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  agentSubtitle: {
    color: '#ADAEBA',
    fontSize: 9,
    marginTop: 2,
  },
  agentPrompt: {
    backgroundColor: '#30313E',
    borderColor: '#4B4C5B',
    borderRadius: 7,
    borderWidth: 1,
    marginTop: 18,
    padding: 13,
  },
  agentPromptText: {
    color: '#EEEFF4',
    fontSize: 10,
    lineHeight: 16,
  },
  agentPlan: {
    marginTop: 16,
  },
  agentPlanLabel: {
    color: '#A9AAB6',
    fontSize: 8,
    fontWeight: '800',
    marginBottom: 6,
  },
  agentPlanRow: {
    alignItems: 'center',
    borderBottomColor: '#3A3B48',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 39,
  },
  agentPlanIndex: {
    alignItems: 'center',
    backgroundColor: '#414250',
    borderRadius: 5,
    height: 21,
    justifyContent: 'center',
    marginRight: 9,
    width: 21,
  },
  agentPlanIndexText: {
    color: '#DADBE2',
    fontSize: 8,
    fontWeight: '800',
  },
  agentPlanText: {
    color: '#F0F0F4',
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
  },
  agentActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  agentAuditText: {
    color: '#9899A5',
    fontSize: 8,
  },
  agentConfirm: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 7,
    flexDirection: 'row',
    minHeight: 31,
    paddingHorizontal: 11,
  },
  agentConfirmText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 5,
  },
  milestoneTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  milestoneRow: {
    alignItems: 'center',
    borderBottomColor: '#ECEBF1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 67,
  },
  milestoneIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    marginRight: 10,
    width: 34,
  },
  milestoneLabel: {
    color: '#424354',
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
  },
  milestoneValue: {
    fontSize: 9,
    fontWeight: '900',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#F4F3F7',
    borderColor: '#E1E0E7',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 45,
    paddingHorizontal: 12,
  },
  searchQuery: {
    color: '#393A4B',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 8,
  },
  searchShortcut: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DAD9E1',
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  searchShortcutText: {
    color: '#898A97',
    fontSize: 7,
    fontWeight: '800',
  },
  searchSummary: {
    color: '#9293A0',
    fontSize: 9,
    marginBottom: 7,
    marginTop: 16,
  },
  searchResult: {
    alignItems: 'center',
    borderRadius: 7,
    flexDirection: 'row',
    minHeight: 55,
    paddingHorizontal: 9,
  },
  searchResultActive: {
    backgroundColor: '#F0EEFF',
  },
  searchResultIcon: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    marginRight: 7,
    width: 28,
  },
  searchResultText: {
    flex: 1,
  },
  searchResultTitle: {
    color: '#424354',
    fontSize: 10,
    fontWeight: '800',
  },
  searchResultMeta: {
    color: '#9697A3',
    fontSize: 8,
    marginTop: 3,
  },
});
