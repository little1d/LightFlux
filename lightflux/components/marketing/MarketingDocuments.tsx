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
} from './MarketingLayout';
import type { MarketingPath } from './marketingRoutes';

interface DocumentSection {
  body: string[];
  title: string;
}

const DocumentPage = ({
  description,
  eyebrow,
  note,
  path,
  sections,
  title,
}: {
  description: string;
  eyebrow: string;
  note: string;
  path: MarketingPath;
  sections: DocumentSection[];
  title: string;
}) => (
  <MarketingLayout
    description={description}
    path={path}
    title={`${title} - LightFlux`}
  >
    <View style={styles.documentHero}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.documentTitle}>{title}</Text>
      <Text style={styles.documentDescription}>{description}</Text>
      <View style={styles.notice}>
        <Ionicons
          color={MARKETING_COLORS.warm}
          name="information-circle-outline"
          size={19}
        />
        <Text style={styles.noticeText}>{note}</Text>
      </View>
    </View>
    <View style={styles.documentBody}>
      {sections.map((section) => (
        <View key={section.title} style={styles.documentSection}>
          <Text style={styles.documentSectionTitle}>{section.title}</Text>
          {section.body.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </View>
  </MarketingLayout>
);

const PRIVACY_SECTIONS: DocumentSection[] = [
  {
    body: [
      'LightFlux 采用本地优先设计。未登录时，任务、项目、富文本内容、设置和统计数据保存在当前设备，不会因为打开应用而自动上传。',
      'Web 端优先使用浏览器 IndexedDB；原生客户端使用应用文档目录保存数据。',
    ],
    title: '本地数据',
  },
  {
    body: [
      '当你主动登录并启用同步时，版本化应用状态会保存到云端 PostgreSQL。服务端使用修订号校验写入，并在冲突时执行三方合并。',
      '退出账户不会自动删除设备上的本地任务。账户之间不会复用同一份本地云端基线。',
    ],
    title: '账户与云同步',
  },
  {
    body: [
      '邮箱密码和验证码登录由 Better Auth 处理。Web 与桌面端使用安全会话 Cookie，iOS 与 Android 使用系统安全存储保存会话凭据。',
      '验证码和密码仅用于身份验证，不会写入任务内容。',
    ],
    title: '身份验证',
  },
  {
    body: [
      '只有在你主动提交任务助理请求时，完成该请求所需的上下文才会发送到服务端 AI 代理。模型不会直接连接或修改本地数据库。',
      '所有 AI 数据改变都必须经过理解、消歧、预览、确认、执行、审计和撤销边界。',
    ],
    title: '任务助理',
  },
  {
    body: [
      '任务正文中的图片上传后以文件形式保存，数据库只记录返回的地址。上传行为只会在你主动添加图片时发生。',
      '正式公开发布前，本说明还需要补充服务提供方、数据保留期限、用户权利和联系渠道。',
    ],
    title: '上传与正式政策',
  },
];

const TERMS_SECTIONS: DocumentSection[] = [
  {
    body: [
      'LightFlux 当前处于早期版本。你可以使用 Web 与已公开的桌面安装包管理个人任务和计划。',
      '请不要使用 LightFlux 存储违法内容、攻击服务、干扰其他用户或绕过安全限制。',
    ],
    title: '使用范围',
  },
  {
    body: [
      '本地模式的数据恢复依赖你的设备与浏览器环境。清理浏览器数据、卸载应用或删除设备文件可能造成数据丢失。',
      '跨设备连续使用需要登录和网络连接。同步会尽力恢复并发修改，但不能替代重要资料的独立备份。',
    ],
    title: '数据与备份',
  },
  {
    body: [
      '任务助理提供建议和自动化操作，不构成法律、医疗、财务或其他专业意见。执行前请检查预览内容。',
      '模型输出可能不准确，因此任何改变都必须由用户确认。',
    ],
    title: 'AI 功能',
  },
  {
    body: [
      '桌面应用目前可能使用临时或未配置的商业代码签名，操作系统可能显示额外安全提醒。',
      '正式对外发布前，本页面需要由产品所有者完成法律审阅，并补充责任限制、终止、争议处理和联系信息。',
    ],
    title: '早期版本说明',
  },
];

export const MarketingPrivacy = () => (
  <DocumentPage
    description="了解 LightFlux 如何处理本地任务、账户、同步、上传与任务助理数据。"
    eyebrow="PRIVACY"
    note="这是基于当前实现整理的首版隐私说明，不替代公开发布前的正式法律审阅。"
    path="/privacy"
    sections={PRIVACY_SECTIONS}
    title="隐私说明"
  />
);

export const MarketingTerms = () => (
  <DocumentPage
    description="了解早期版本的使用范围、数据责任与任务助理边界。"
    eyebrow="TERMS"
    note="这是首版产品说明。正式商用或公开推广前仍需补充完整法律条款。"
    path="/terms"
    sections={TERMS_SECTIONS}
    title="使用条款"
  />
);

const RELEASES = [
  {
    date: '2026-08-23',
    items: [
      '统一移动端快捷操作与动态视口适配。',
      '优化 Today 与 Projects 的子任务拖拽预览。',
      '简化倒数纪念日表单与全局 Toast。',
      '修复设置登录路由和 Web hydration 问题。',
    ],
    version: '持续改进',
  },
  {
    date: '2026-08-12',
    items: [
      '发布 LightFlux Desktop v1.0.0。',
      '提供 macOS Apple Silicon、macOS Intel 与 Windows x64 安装包。',
      '支持应用内更新检查与公开 Release 下载。',
    ],
    version: 'v1.0.0',
  },
];

export const MarketingChangelog = () => {
  const { width } = useWindowDimensions();
  const compact = width < 620;

  return (
    <MarketingLayout
      description="查看 LightFlux Web 与桌面应用的重要更新。"
      path="/changelog"
      title="LightFlux 更新日志"
    >
      <View style={styles.changelogHero}>
        <Text style={styles.eyebrow}>CHANGELOG</Text>
        <Text style={styles.documentTitle}>持续变得更清晰</Text>
        <Text style={styles.documentDescription}>
          只记录用户能够感知的重要改变，不把内部重构当作产品更新。
        </Text>
        <View style={styles.changelogAction}>
          <MarketingLink
            href="https://github.com/little1d/LightFlux/releases/latest"
            icon="open-outline"
            label="查看桌面 Release"
            variant="secondary"
          />
        </View>
      </View>
      <View style={styles.releaseList}>
        {RELEASES.map((release) => (
          <View
            key={release.date}
            style={[styles.release, compact && styles.releaseCompact]}
          >
            <View
              style={[
                styles.releaseMeta,
                compact && styles.releaseMetaCompact,
              ]}
            >
              <Text style={styles.releaseVersion}>{release.version}</Text>
              <Text style={styles.releaseDate}>{release.date}</Text>
            </View>
            <View style={styles.releaseItems}>
              {release.items.map((item) => (
                <View key={item} style={styles.releaseItem}>
                  <View style={styles.releaseBullet} />
                  <Text style={styles.releaseItemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </MarketingLayout>
  );
};

const styles = StyleSheet.create({
  documentHero: {
    alignSelf: 'center',
    maxWidth: 860,
    paddingBottom: 58,
    paddingHorizontal: 24,
    paddingTop: 86,
    width: '100%',
  },
  changelogHero: {
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 860,
    paddingBottom: 72,
    paddingHorizontal: 24,
    paddingTop: 88,
    width: '100%',
  },
  eyebrow: {
    color: MARKETING_COLORS.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  documentTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 43,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 54,
    marginTop: 13,
  },
  documentDescription: {
    color: MARKETING_COLORS.muted,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 12,
  },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF6EA',
    borderColor: '#EEDCC2',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 25,
    padding: 15,
  },
  noticeText: {
    color: '#73573E',
    flex: 1,
    fontSize: 10,
    lineHeight: 18,
    marginLeft: 9,
  },
  documentBody: {
    alignSelf: 'center',
    maxWidth: 860,
    paddingBottom: 96,
    paddingHorizontal: 24,
    width: '100%',
  },
  documentSection: {
    borderTopColor: MARKETING_COLORS.line,
    borderTopWidth: 1,
    paddingVertical: 28,
  },
  documentSectionTitle: {
    color: MARKETING_COLORS.ink,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  paragraph: {
    color: '#60616F',
    fontSize: 13,
    lineHeight: 23,
    marginTop: 11,
  },
  changelogAction: {
    marginTop: 24,
  },
  releaseList: {
    alignSelf: 'center',
    maxWidth: 880,
    paddingBottom: 100,
    paddingHorizontal: 24,
    width: '100%',
  },
  release: {
    borderTopColor: MARKETING_COLORS.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: 30,
  },
  releaseMeta: {
    width: 150,
  },
  releaseCompact: {
    flexDirection: 'column',
  },
  releaseMetaCompact: {
    marginBottom: 18,
    width: '100%',
  },
  releaseVersion: {
    color: MARKETING_COLORS.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  releaseDate: {
    color: '#9293A0',
    fontSize: 10,
    marginTop: 5,
  },
  releaseItems: {
    flex: 1,
  },
  releaseItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: 10,
  },
  releaseBullet: {
    backgroundColor: MARKETING_COLORS.green,
    borderRadius: 3,
    height: 6,
    marginRight: 10,
    marginTop: 7,
    width: 6,
  },
  releaseItemText: {
    color: '#575866',
    flex: 1,
    fontSize: 12,
    lineHeight: 20,
  },
});
