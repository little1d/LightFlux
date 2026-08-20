import {
  AgentExecutionResult,
  AgentProposal,
  AgentProposalPreview,
} from '../agent/types';
import {
  AgentContextSnapshot,
  getAgentContextForMessage,
  previewAgentProposal,
} from '../agent/todoCommandStoreAdapter';
import { authenticatedFetch } from './authApi';

const publicEnvironment = process.env as Record<string, string | undefined>;
const agentApiUrl = (
  publicEnvironment.EXPO_PUBLIC_AI_API_URL ??
  publicEnvironment.EXPO_PUBLIC_AUTH_API_URL ??
  ''
).replace(/\/$/, '');

export interface AgentClarification {
  id: string;
  question: string;
  choices?: Array<{
    id: string;
    label: string;
  }>;
}

export interface AgentTurnResponse {
  conversationId: string;
  message: string;
  clarification?: AgentClarification;
  proposal?: AgentProposal;
  proposalPreview?: AgentProposalPreview;
}

interface AgentTurnRequest {
  conversationId?: string;
  message: string;
  currentTime: string;
  timeZone: string;
  context: AgentContextSnapshot;
}

export class AgentApiError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.status = status;
  }
}

const configuredApiUrl = (): string => {
  if (!agentApiUrl) {
    throw new AgentApiError('AI Agent API is not configured.');
  }
  return agentApiUrl;
};

export const submitAgentTurn = async ({
  message,
  conversationId,
  signal,
  now = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}: {
  message: string;
  conversationId?: string;
  signal?: AbortSignal;
  now?: Date;
  timeZone?: string;
}): Promise<AgentTurnResponse> => {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    throw new AgentApiError('Agent message cannot be empty.');
  }

  const request: AgentTurnRequest = {
    conversationId,
    message: normalizedMessage,
    currentTime: now.toISOString(),
    timeZone,
    context: getAgentContextForMessage(normalizedMessage, now),
  };
  const response = await authenticatedFetch(
    `${configuredApiUrl()}/api/ai/turns`,
    {
      body: JSON.stringify(request),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal,
    },
  );
  const body = (await response.json()) as AgentTurnResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new AgentApiError(
      body.error || 'Unable to process the Agent request.',
      response.status,
    );
  }
  if (!body.conversationId || typeof body.message !== 'string') {
    throw new AgentApiError('The Agent API returned an invalid response.');
  }
  return {
    ...body,
    ...(body.proposal
      ? { proposalPreview: previewAgentProposal(body.proposal) }
      : {}),
  };
};

export const reportAgentProposalResult = async (
  result: AgentExecutionResult,
  signal?: AbortSignal,
): Promise<void> => {
  const response = await authenticatedFetch(
    `${configuredApiUrl()}/api/ai/proposals/${encodeURIComponent(
      result.proposalId,
    )}/result`,
    {
      body: JSON.stringify({
        beforeRevision: result.beforeRevision,
        afterRevision: result.afterRevision,
        operations: result.operations,
      }),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      method: 'POST',
      signal,
    },
  );
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new AgentApiError(
      body.error || 'Unable to report the Agent operation result.',
      response.status,
    );
  }
};
