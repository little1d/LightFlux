import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  appendAgentConversationTurn,
  canUndoLastAgentProposal,
  executeConfirmedAgentProposal,
  getAgentConversationState,
  hydrateAgentRuntime,
  previewAgentProposal,
  setAgentConversationId,
  undoLastAgentProposal,
  updateAgentProposalStatus,
} from '../../agent/todoCommandStoreAdapter';
import {
  AgentConversationTurn,
  AgentOperation,
  AgentOperationPreview,
  AgentPreviewValue,
  AgentProposal,
} from '../../agent/types';
import { inputAccentProps } from '../../config/input';
import { translations } from '../../content';
import {
  AgentTurnResponse,
  reportAgentProposalResult,
  submitAgentTurn,
} from '../../services/agentApi';
import { useTodoStore } from '../../store/todoStore';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';

interface AgentCommandPanelProps {
  onClose: () => void;
  onNotify: (message: string, variant?: 'error' | 'success') => void;
  visible: boolean;
}

const AgentCommandPanel = ({
  onClose,
  onNotify,
  visible,
}: AgentCommandPanelProps) => {
  const language = useTodoStore((state) => state.language);
  const labels = translations[language].agent;
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const nativeWorkspace = Platform.OS !== 'web';
  const progress = useRef(new Animated.Value(0)).current;
  const requestController = useRef<AbortController | null>(null);
  const [conversationId, setConversationId] = useState<string>();
  const [draft, setDraft] = useState('');
  const [response, setResponse] = useState<AgentTurnResponse | null>(null);
  const [proposal, setProposal] = useState<AgentProposal | null>(null);
  const [turns, setTurns] = useState<AgentConversationTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [undoAvailable, setUndoAvailable] = useState(
    canUndoLastAgentProposal(),
  );

  useEffect(() => {
    if (!visible) {
      requestController.current?.abort();
      requestController.current = null;
      setLoading(false);
      progress.setValue(0);
      return;
    }
    Animated.timing(progress, {
      duration: 140,
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [progress, visible]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    let active = true;
    void hydrateAgentRuntime().then(() => {
      if (!active) {
        return;
      }
      const runtime = getAgentConversationState();
      setConversationId(runtime.conversationId ?? undefined);
      setTurns(runtime.turns);
      setProposal(null);
      setResponse(null);
      const latest = runtime.turns.at(-1);
      if (
        latest?.role === 'assistant' &&
        latest.proposal &&
        latest.proposalStatus === 'pending'
      ) {
        try {
          const proposalPreview = previewAgentProposal(latest.proposal);
          setProposal(latest.proposal);
          setResponse({
            conversationId: runtime.conversationId ?? '',
            message: latest.message,
            clarification: latest.clarification,
            proposal: latest.proposal,
            proposalPreview,
          });
        } catch {
          updateAgentProposalStatus(latest.proposal.id, 'invalid');
          setTurns((current) =>
            current.map((turn) =>
              turn.proposal?.id === latest.proposal?.id
                ? { ...turn, proposalStatus: 'invalid' }
                : turn,
            ),
          );
        }
      } else if (
        latest?.role === 'assistant' &&
        latest.clarification
      ) {
        setResponse({
          conversationId: runtime.conversationId ?? '',
          message: latest.message,
          clarification: latest.clarification,
        });
      }
      setUndoAvailable(canUndoLastAgentProposal());
    });
    return () => {
      active = false;
    };
  }, [visible]);

  const closePanel = () => {
    requestController.current?.abort();
    requestController.current = null;
    setLoading(false);
    onClose();
  };

  const send = async (message = draft) => {
    const normalizedMessage = message.trim();
    if (!normalizedMessage || loading) {
      return;
    }
    await hydrateAgentRuntime();
    const activeConversationId =
      conversationId ?? getAgentConversationState().conversationId ?? undefined;
    if (proposal) {
      updateAgentProposalStatus(proposal.id, 'rejected');
      setTurns((current) =>
        current.map((turn) =>
          turn.proposal?.id === proposal.id
            ? { ...turn, proposalStatus: 'rejected' }
            : turn,
        ),
      );
    }
    setDraft('');
    setError('');
    setProposal(null);
    setLoading(true);
    const createdAt = Date.now();
    const userTurn: AgentConversationTurn = {
      id: `user-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      message: normalizedMessage,
      createdAt,
    };
    appendAgentConversationTurn(userTurn);
    setTurns((current) => [...current, userTurn].slice(-100));
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const result = await submitAgentTurn({
        conversationId: activeConversationId,
        message: normalizedMessage,
        signal: controller.signal,
      });
      setConversationId(result.conversationId);
      setAgentConversationId(result.conversationId);
      setResponse(result);
      setProposal(result.proposal ?? null);
      const assistantTurn: AgentConversationTurn = {
        id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        message: result.message,
        createdAt: Date.now(),
        clarification: result.clarification,
        proposal: result.proposal,
        ...(result.proposal ? { proposalStatus: 'pending' } : {}),
      };
      appendAgentConversationTurn(assistantTurn);
      setTurns((current) => [...current, assistantTurn].slice(-100));
    } catch (nextError) {
      if (!controller.signal.aborted) {
        const message =
          nextError instanceof Error ? nextError.message : labels.requestFailed;
        setError(message);
        const errorTurn: AgentConversationTurn = {
          id: `assistant-error-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: 'assistant',
          message,
          createdAt: Date.now(),
          error: true,
        };
        appendAgentConversationTurn(errorTurn);
        setTurns((current) => [...current, errorTurn].slice(-100));
      }
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setLoading(false);
      }
    }
  };

  const confirmProposal = () => {
    if (!proposal) {
      return;
    }
    try {
      const result = executeConfirmedAgentProposal(proposal);
      setProposal(null);
      setTurns((current) =>
        current.map((turn) =>
          turn.proposal?.id === proposal.id
            ? { ...turn, proposalStatus: 'executed' }
            : turn,
        ),
      );
      setUndoAvailable(true);
      onNotify(labels.applied);
      void reportAgentProposalResult(result).catch(() => {
        setError(labels.resultReportFailed);
      });
    } catch (nextError) {
      updateAgentProposalStatus(proposal.id, 'invalid');
      setTurns((current) =>
        current.map((turn) =>
          turn.proposal?.id === proposal.id
            ? { ...turn, proposalStatus: 'invalid' }
            : turn,
        ),
      );
      setError(
        nextError instanceof Error ? nextError.message : labels.requestFailed,
      );
    }
  };

  const undo = () => {
    try {
      if (undoLastAgentProposal()) {
        setTurns(getAgentConversationState().turns);
        setUndoAvailable(false);
        onNotify(labels.undone);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : labels.undoFailed,
      );
    }
  };

  const rejectProposal = () => {
    if (proposal) {
      updateAgentProposalStatus(proposal.id, 'rejected');
      setTurns((current) =>
        current.map((turn) =>
          turn.proposal?.id === proposal.id
            ? { ...turn, proposalStatus: 'rejected' }
            : turn,
        ),
      );
    }
    setProposal(null);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType={nativeWorkspace ? 'slide' : 'none'}
      onRequestClose={closePanel}
      transparent
      visible
    >
      <View
        style={[
          styles.overlay,
          nativeWorkspace && styles.nativeOverlay,
        ]}
      >
        {!nativeWorkspace ? (
          <Pressable
            accessibilityLabel={labels.close}
            onPress={closePanel}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={
            nativeWorkspace || compact
              ? styles.workspaceKeyboardAvoider
              : undefined
          }
        >
          <SafeAreaView
            edges={nativeWorkspace ? ['top'] : []}
            style={
              nativeWorkspace || compact
                ? styles.workspaceSafeArea
                : undefined
            }
          >
            <Animated.View
            style={[
              styles.panel,
              nativeWorkspace
                ? styles.panelNative
                : compact
                  ? styles.panelCompact
                  : styles.panelWide,
              {
                opacity: progress,
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [nativeWorkspace ? 8 : compact ? 16 : 8, 0],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [nativeWorkspace ? 1 : 0.985, 1],
                    }),
                  },
                ],
              },
            ]}
          >
          <View style={styles.header}>
            <View style={styles.agentIcon}>
              <Ionicons color="#6759E8" name="sparkles" size={17} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{labels.title}</Text>
              {!nativeWorkspace ? (
                <Text style={styles.shortcut}>{labels.shortcut}</Text>
              ) : null}
            </View>
            <IconButton
              icon="close"
              label={labels.close}
              onPress={closePanel}
              showTooltip={false}
              size="small"
              tooltipPosition="bottom"
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.conversationScroll}
          >
            {turns.length === 0 && !loading ? (
              <Text style={styles.emptyText}>{labels.empty}</Text>
            ) : null}

            {loading ? (
              <View
                accessibilityLiveRegion="polite"
                style={styles.statusRow}
              >
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{labels.thinking}</Text>
              </View>
            ) : null}

            {turns.map((turn) => {
              const statusLabel =
                turn.proposalStatus === 'pending'
                  ? labels.historyPending
                  : turn.proposalStatus === 'executed'
                    ? labels.historyExecuted
                    : turn.proposalStatus === 'undone'
                      ? labels.historyUndone
                    : turn.proposalStatus === 'rejected'
                        ? labels.historyRejected
                        : turn.proposalStatus === 'invalid'
                          ? labels.historyInvalid
                          : null;
              return (
                <View
                  key={turn.id}
                  style={[
                    styles.conversationTurn,
                    turn.role === 'user'
                      ? styles.userTurn
                      : styles.assistantTurn,
                    turn.error && styles.errorTurn,
                  ]}
                >
                  <Text
                    style={[
                      styles.conversationText,
                      turn.role === 'user' && styles.userTurnText,
                    ]}
                  >
                    {turn.message}
                  </Text>
                  {turn.proposal ? (
                    <View style={styles.historyProposal}>
                      <Text numberOfLines={2} style={styles.historyProposalText}>
                        {turn.proposal.summary}
                      </Text>
                      {statusLabel ? (
                        <Text style={styles.historyProposalStatus}>
                          {statusLabel}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}

            {response?.clarification ? (
              <View style={styles.clarificationCard}>
                <Text style={styles.sectionLabel}>{labels.clarification}</Text>
                <Text style={styles.clarificationQuestion}>
                  {response.clarification.question}
                </Text>
                {response.clarification.choices?.map((choice) => (
                  <Pressable
                    accessibilityRole="button"
                    key={choice.id}
                    onPress={() => void send(choice.label)}
                    style={({ pressed }) => [
                      styles.choice,
                      pressed && styles.choicePressed,
                    ]}
                  >
                    <Text style={styles.choiceText}>{choice.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {proposal ? (
              <View style={styles.proposalCard}>
                <View style={styles.proposalHeader}>
                  <Text style={styles.sectionLabel}>{labels.proposal}</Text>
                  <View
                    style={[
                      styles.riskPill,
                      proposal.risk === 'high'
                        ? styles.riskHigh
                        : proposal.risk === 'medium'
                          ? styles.riskMedium
                          : styles.riskLow,
                    ]}
                  >
                    <Text style={styles.riskText}>
                      {labels.risk[proposal.risk]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.proposalSummary}>{proposal.summary}</Text>
                <View style={styles.operationList}>
                  {proposal.operations.map((operation) => (
                    <OperationRow
                      key={operation.operationId}
                      language={language}
                      labels={labels.operations}
                      operation={operation}
                      preview={response?.proposalPreview?.operations.find(
                        (item) => item.operationId === operation.operationId,
                      )}
                    />
                  ))}
                </View>
                {proposal.assumptions.length > 0 ? (
                  <View style={styles.assumptions}>
                    <Text style={styles.assumptionLabel}>
                      {labels.assumptions}
                    </Text>
                    {proposal.assumptions.map((assumption, index) => (
                      <Text
                        key={`${assumption}-${index}`}
                        style={styles.assumptionText}
                      >
                        {assumption}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <View style={styles.proposalActions}>
                  <ActionButton
                    disabled={loading}
                    label={labels.reject}
                    onPress={rejectProposal}
                    variant="ghost"
                  />
                  <View style={styles.actionGap} />
                  <ActionButton
                    disabled={loading}
                    label={labels.confirm}
                    onPress={confirmProposal}
                  />
                </View>
              </View>
            ) : null}

            {error ? (
              <View accessibilityRole="alert" style={styles.errorCard}>
                <Ionicons color="#B44758" name="alert-circle" size={15} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <SafeAreaView
            edges={nativeWorkspace ? ['bottom'] : []}
            style={styles.composerSafeArea}
          >
            <View style={styles.composer}>
              <TextInput
                {...inputAccentProps}
                accessibilityLabel={labels.inputPlaceholder}
                autoFocus
                editable={!loading}
                maxLength={1200}
                multiline
                onChangeText={setDraft}
                placeholder={labels.inputPlaceholder}
                placeholderTextColor="#9B9CA8"
                style={styles.input}
                value={draft}
              />
              <View style={styles.sendButtonPosition}>
                <IconButton
                  disabled={!draft.trim() || loading}
                  icon="arrow-up"
                  label={labels.send}
                  onPress={() => void send()}
                  size="medium"
                  variant="solid"
                />
              </View>
            </View>
            {undoAvailable ? (
              <Pressable
                accessibilityRole="button"
                onPress={undo}
                style={({ pressed }) => [
                  styles.undoButton,
                  pressed && styles.undoPressed,
                ]}
              >
                <Ionicons color="#6759E8" name="arrow-undo" size={14} />
                <Text style={styles.undoText}>{labels.undo}</Text>
              </Pressable>
            ) : null}
          </SafeAreaView>
            </Animated.View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const OperationRow = ({
  language,
  labels,
  operation,
  preview,
}: {
  language: 'zh' | 'en';
  labels: Record<AgentOperation['type'], string>;
  operation: AgentOperation;
  preview?: AgentOperationPreview;
}) => {
  const allLabels = translations[language];
  const agentLabels = allLabels.agent;
  const detail =
    preview?.target ??
    (operation.type === 'task.create' ||
    operation.type === 'milestone.create'
      ? operation.title
      : operation.type === 'group.create' ||
          operation.type === 'group.update'
        ? operation.name
        : '');
  const formatValue = (
    value: AgentPreviewValue,
    field: AgentOperationPreview['changes'][number]['field'],
  ) => {
    if (value === null || value === '') {
      return agentLabels.valueEmpty;
    }
    if (typeof value === 'boolean') {
      return value ? agentLabels.valueYes : agentLabels.valueNo;
    }
    if (
      field === 'priority' &&
      (value === 'none' ||
        value === 'high' ||
        value === 'medium' ||
        value === 'low')
    ) {
      return allLabels.taskMenu.priorityOptions[value];
    }
    if (field === 'position' && typeof value === 'string') {
      const [position, ...title] = value.split(':');
      return agentLabels.relativePosition(
        title.join(':'),
        position === 'before' ? 'before' : 'after',
      );
    }
    return String(value);
  };

  return (
    <View style={styles.operationRow}>
      <View style={styles.operationDot} />
      <View style={styles.operationText}>
        <Text style={styles.operationType}>{labels[operation.type]}</Text>
        {detail ? (
          <Text numberOfLines={1} style={styles.operationDetail}>
            {detail}
          </Text>
        ) : null}
        {preview?.changes.map((change) => (
          <Text
            key={`${preview.operationId}-${change.field}`}
            style={styles.operationChange}
          >
            {agentLabels.previewFields[change.field]}:{' '}
            {formatValue(change.before, change.field)} →{' '}
            {formatValue(change.after, change.field)}
          </Text>
        ))}
        {preview && preview.affectedIds.length > 1 ? (
          <Text style={styles.operationImpact}>
            {agentLabels.affectedTasks(preview.affectedIds.length)}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(31, 30, 43, 0.2)',
    flex: 1,
    justifyContent: 'center',
  },
  nativeOverlay: {
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  workspaceSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  workspaceKeyboardAvoider: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DEDEE7',
    borderWidth: 1,
    flexDirection: 'column',
    height: 560,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#262438',
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
  },
  panelWide: {
    alignSelf: 'center',
    borderRadius: 18,
    maxWidth: 680,
    width: '92%',
  },
  panelCompact: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    bottom: 0,
    height: '80%',
    left: 0,
    maxHeight: undefined,
    minHeight: undefined,
    position: 'absolute',
    right: 0,
  },
  panelNative: {
    borderColor: '#E2E0E8',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    height: '78%',
    maxHeight: undefined,
    minHeight: undefined,
    shadowOpacity: 0.15,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#ECEBF1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    padding: 14,
  },
  agentIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: '#303145',
    fontSize: 14,
    fontWeight: '700',
  },
  shortcut: {
    color: '#999AA6',
    fontSize: 10,
    marginTop: 2,
  },
  content: {
    padding: 14,
  },
  conversationScroll: {
    flex: 1,
  },
  emptyText: {
    color: '#858694',
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 4,
    paddingVertical: 18,
    textAlign: 'center',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 8,
  },
  statusDot: {
    backgroundColor: '#6759E8',
    borderRadius: 3,
    height: 6,
    marginRight: 8,
    width: 6,
  },
  statusText: {
    color: '#6A61B8',
    fontSize: 12,
  },
  conversationTurn: {
    borderRadius: 12,
    marginBottom: 9,
    maxWidth: '88%',
    padding: 11,
  },
  assistantTurn: {
    backgroundColor: '#F6F5F9',
    alignSelf: 'flex-start',
  },
  userTurn: {
    alignSelf: 'flex-end',
    backgroundColor: '#6759E8',
  },
  errorTurn: {
    backgroundColor: '#FFF1F3',
  },
  conversationText: {
    color: '#3B3C4E',
    fontSize: 13,
    lineHeight: 20,
  },
  userTurnText: {
    color: '#FFFFFF',
  },
  historyProposal: {
    borderTopColor: '#E2E0E9',
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 7,
  },
  historyProposalText: {
    color: '#555667',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 15,
  },
  historyProposalStatus: {
    color: '#7770B8',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  clarificationCard: {
    borderColor: '#E3E1EB',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  sectionLabel: {
    color: '#777887',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  clarificationQuestion: {
    color: '#303145',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 10,
    marginTop: 7,
  },
  choice: {
    backgroundColor: '#F5F4F8',
    borderRadius: 9,
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  choicePressed: {
    backgroundColor: '#EDEAFB',
    transform: [{ scale: 0.995 }],
  },
  choiceText: {
    color: '#4E4F61',
    fontSize: 12,
  },
  proposalCard: {
    borderColor: '#DCD8F3',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 13,
  },
  proposalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  proposalSummary: {
    color: '#303145',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 8,
  },
  riskPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  riskLow: {
    backgroundColor: '#EAF8F2',
  },
  riskMedium: {
    backgroundColor: '#FFF4DF',
  },
  riskHigh: {
    backgroundColor: '#FCECEF',
  },
  riskText: {
    color: '#686979',
    fontSize: 10,
    fontWeight: '700',
  },
  operationList: {
    marginTop: 10,
  },
  operationRow: {
    alignItems: 'center',
    borderTopColor: '#EEECEF',
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 42,
    paddingVertical: 7,
  },
  operationDot: {
    backgroundColor: '#6759E8',
    borderRadius: 3,
    height: 6,
    marginHorizontal: 4,
    width: 6,
  },
  operationText: {
    flex: 1,
    marginLeft: 8,
  },
  operationType: {
    color: '#555667',
    fontSize: 11,
    fontWeight: '600',
  },
  operationDetail: {
    color: '#8B8C99',
    fontSize: 11,
    marginTop: 2,
  },
  operationChange: {
    color: '#5D5E70',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 3,
  },
  operationImpact: {
    color: '#B44758',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  assumptions: {
    backgroundColor: '#FFF9ED',
    borderRadius: 9,
    marginTop: 8,
    padding: 9,
  },
  assumptionLabel: {
    color: '#A16A24',
    fontSize: 10,
    fontWeight: '700',
  },
  assumptionText: {
    color: '#76583A',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  proposalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionGap: {
    width: 6,
  },
  errorCard: {
    alignItems: 'center',
    backgroundColor: '#FFF1F3',
    borderRadius: 10,
    flexDirection: 'row',
    padding: 10,
  },
  errorText: {
    color: '#A33F50',
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 7,
  },
  composerSafeArea: {
    backgroundColor: '#FFFFFF',
  },
  composer: {
    alignItems: 'flex-end',
    borderTopColor: '#ECEBF1',
    borderTopWidth: 1,
    flexDirection: 'row',
    padding: 12,
  },
  input: {
    backgroundColor: '#F6F5F8',
    borderColor: '#E2E0E8',
    borderRadius: 12,
    borderWidth: 1,
    color: '#303145',
    flex: 1,
    fontSize: 13,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButtonPosition: {
    marginLeft: 8,
  },
  undoButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  undoPressed: {
    opacity: 0.65,
  },
  undoText: {
    color: '#6759E8',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default AgentCommandPanel;
