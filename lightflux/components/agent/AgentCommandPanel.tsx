import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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

import {
  canUndoLastAgentProposal,
  executeConfirmedAgentProposal,
  getAgentContextSnapshot,
  undoLastAgentProposal,
} from '../../agent/todoCommandStoreAdapter';
import { AgentOperation, AgentProposal } from '../../agent/types';
import { inputAccentProps } from '../../config/input';
import { translations } from '../../i18n/translations';
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
  const progress = useRef(new Animated.Value(0)).current;
  const requestController = useRef<AbortController | null>(null);
  const [conversationId, setConversationId] = useState<string>();
  const [draft, setDraft] = useState('');
  const [response, setResponse] = useState<AgentTurnResponse | null>(null);
  const [proposal, setProposal] = useState<AgentProposal | null>(null);
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
    setDraft('');
    setError('');
    setProposal(null);
    setLoading(true);
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const result = await submitAgentTurn({
        conversationId,
        message: normalizedMessage,
        signal: controller.signal,
      });
      setConversationId(result.conversationId);
      setResponse(result);
      setProposal(result.proposal ?? null);
    } catch (nextError) {
      if (!controller.signal.aborted) {
        setError(
          nextError instanceof Error ? nextError.message : labels.requestFailed,
        );
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
      setUndoAvailable(true);
      onNotify(labels.applied);
      void reportAgentProposalResult(result).catch(() => {
        setError(labels.resultReportFailed);
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : labels.requestFailed,
      );
    }
  };

  const undo = () => {
    try {
      if (undoLastAgentProposal()) {
        setUndoAvailable(false);
        onNotify(labels.undone);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : labels.undoFailed,
      );
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={closePanel}
      transparent
      visible
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={labels.close}
          onPress={closePanel}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.panel,
            compact ? styles.panelCompact : styles.panelWide,
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [compact ? 16 : 8, 0],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1],
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
              <Text style={styles.shortcut}>{labels.shortcut}</Text>
            </View>
            <IconButton
              icon="close"
              label={labels.close}
              onPress={closePanel}
              size="small"
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!response && !loading ? (
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

            {response ? (
              <View style={styles.responseCard}>
                <Text style={styles.responseText}>{response.message}</Text>
              </View>
            ) : null}

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
                      labels={labels.operations}
                      operation={operation}
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
                    onPress={() => setProposal(null)}
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
            <Pressable
              accessibilityLabel={labels.send}
              accessibilityRole="button"
              disabled={!draft.trim() || loading}
              onPress={() => void send()}
              style={({ pressed }) => [
                styles.sendButton,
                (!draft.trim() || loading) && styles.sendButtonDisabled,
                pressed && styles.sendButtonPressed,
              ]}
            >
              <Ionicons color="#FFFFFF" name="arrow-up" size={17} />
            </Pressable>
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
        </Animated.View>
      </View>
    </Modal>
  );
};

const OperationRow = ({
  labels,
  operation,
}: {
  labels: Record<AgentOperation['type'], string>;
  operation: AgentOperation;
}) => {
  const context = getAgentContextSnapshot();
  const taskId = 'taskId' in operation ? operation.taskId : null;
  const taskTitle = taskId
    ? context.tasks.find((task) => task.id === taskId)?.title
    : null;
  const milestoneId =
    'milestoneId' in operation ? operation.milestoneId : null;
  const milestoneTitle = milestoneId
    ? context.milestones.find(
        (milestone) => milestone.id === milestoneId,
      )?.title
    : null;
  const detail =
    operation.type === 'task.create' ||
    operation.type === 'milestone.create'
      ? operation.title
      : operation.type === 'group.create' ||
          operation.type === 'group.update'
        ? operation.name
        : taskTitle ??
          taskId ??
          milestoneTitle ??
          milestoneId ??
          '';

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
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DEDEE7',
    borderWidth: 1,
    maxHeight: '82%',
    overflow: 'hidden',
    shadowColor: '#262438',
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
  },
  panelWide: {
    alignSelf: 'center',
    borderRadius: 18,
    maxWidth: 620,
    width: '94%',
  },
  panelCompact: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    bottom: 0,
    left: 0,
    maxHeight: '88%',
    position: 'absolute',
    right: 0,
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
  responseCard: {
    backgroundColor: '#F6F5F9',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
  },
  responseText: {
    color: '#3B3C4E',
    fontSize: 13,
    lineHeight: 20,
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
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    marginLeft: 8,
    width: 38,
  },
  sendButtonDisabled: {
    backgroundColor: '#C8C5DB',
  },
  sendButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.94 }],
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
