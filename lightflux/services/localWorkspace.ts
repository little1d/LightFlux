import {
  httpError,
  mutateMilestoneState,
  mutateProjectState,
  mutateTaskState,
  publicMilestone,
  publicProject,
  publicTask,
} from "@lightflux/domain";
import type { PersistedAppState } from "../types/todo";

export interface LocalMutation {
  id: string;
  action: string;
  actorId: string;
  createdAt: number;
  undoneAt: number | null;
}

export interface LocalAutomation {
  version: 1;
  revision: number;
  mutations: LocalMutation[];
  replays: Record<
    string,
    { signature: string; result: Record<string, unknown> }
  >;
  undo: { id: string; before: PersistedAppState; after: string } | null;
  comments: Array<{
    id: string;
    taskId: string;
    message: string;
    createdAt: number;
    actorId: string;
  }>;
}

export interface LocalRequest {
  method: string;
  path: string;
  body?: Record<string, unknown>;
  idempotencyKey?: string | null;
}

export const emptyLocalAutomation = (): LocalAutomation => ({
  version: 1,
  revision: 0,
  mutations: [],
  replays: {},
  undo: null,
  comments: [],
});

export const isLocalAutomation = (value: unknown): value is LocalAutomation => {
  if (!value || typeof value !== "object") return false;
  const journal = value as LocalAutomation;
  return (
    journal.version === 1 &&
    Number.isSafeInteger(journal.revision) &&
    journal.revision >= 0 &&
    Array.isArray(journal.mutations) &&
    journal.mutations.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.action === "string" &&
        typeof item.actorId === "string" &&
        Number.isFinite(item.createdAt) &&
        (item.undoneAt === null || Number.isFinite(item.undoneAt)),
    ) &&
    Array.isArray(journal.comments) &&
    journal.comments.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.taskId === "string" &&
        typeof item.message === "string" &&
        typeof item.actorId === "string" &&
        Number.isFinite(item.createdAt),
    ) &&
    Boolean(
      journal.replays &&
      typeof journal.replays === "object" &&
      !Array.isArray(journal.replays) &&
      Object.values(journal.replays).every(
        (item) =>
          item &&
          typeof item.signature === "string" &&
          item.result &&
          typeof item.result === "object",
      ),
    ) &&
    (journal.undo === null ||
      Boolean(
        journal.undo &&
        typeof journal.undo.id === "string" &&
        typeof journal.undo.after === "string" &&
        journal.undo.before?.schemaVersion === 12 &&
        Array.isArray(journal.undo.before.todos) &&
        Array.isArray(journal.undo.before.projects) &&
        !journal.undo.before.localAutomation,
      ))
  );
};

export const stateFingerprint = (state: PersistedAppState): string => {
  const { updatedAt: _, localAutomation: __, ...content } = state;
  return JSON.stringify(content);
};

const snapshotWithoutJournal = (
  state: PersistedAppState,
): PersistedAppState => {
  const { localAutomation: _, ...snapshot } = state;
  return structuredClone(snapshot);
};

// Synchronous transaction preparation: callers publish once and durably save
// before acknowledging success. No file or network access belongs in this layer.
export const executeLocalRequest = (
  state: PersistedAppState,
  request: LocalRequest,
  options: { actorId: 'local-cli' | 'xiaoguang' } = { actorId: 'local-cli' },
): { state: PersistedAppState; result: Record<string, unknown> } => {
  const url = new URL(request.path, "http://127.0.0.1");
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const body = request.body ?? {};
  const journal = state.localAutomation ?? emptyLocalAutomation();
  const revision = journal.revision;
  const task = (id: string) => {
    const found = state.todos.find((item) => item.id === id);
    if (!found) throw httpError(404, "Task not found.");
    return found;
  };
  const milestone = (id: string) => {
    const found = state.milestones.find((item) => item.id === id);
    if (!found) throw httpError(404, "Milestone not found.");
    return found;
  };
  const project = (id: string) => {
    const found = state.projects.find((item) => item.id === id);
    if (!found) throw httpError(404, "Project not found.");
    return found;
  };
  const result = (value: Record<string, unknown>) => ({ state, result: value });
  if (parts[0] !== "api" || parts[1] !== "v1")
    throw httpError(404, "Route not found.");
  const [, , resource, id, operation] = parts;
  if (parts.length > 5) throw httpError(404, "Route not found.");
  if (resource === "workspaces" && id && id !== "local")
    throw httpError(404, "Workspace not found.");
  if (request.method === "GET") {
    if (resource === "workspaces") {
      if (!id)
        return result({
          workspaces: [{ id: "local", name: "Local Workspace", kind: "local" }],
        });
      if (operation === "projects")
        return result({ projects: state.projects, revision });
      if (operation === "audit")
        return result({
          mutations: [...journal.mutations].reverse(),
          revision,
        });
      if (operation === "milestones")
        return result({
          milestones: state.milestones
            .filter(
              (item) =>
                url.searchParams.get("trash") === "true" ||
                item.trashedAt === null,
            )
            .filter(
              (item) =>
                url.searchParams.get("archived") === "true" ||
                item.archivedAt === null,
            )
            .map((item) => publicMilestone(item, revision)),
          revision,
        });
    }
    if (resource === "projects" && operation === "tasks") {
      if (!state.projects.some((item) => item.id === id))
        throw httpError(404, "Project not found.");
      return result({
        tasks: state.todos
          .filter((item) => item.projectId === id)
          .filter(
            (item) =>
              url.searchParams.get("trash") === "true" ||
              item.trashedAt === null,
          )
          .filter(
            (item) =>
              url.searchParams.get("completed") === "true" || !item.completed,
          )
          .map((item) => publicTask(item, revision)),
        revision,
      });
    }
    if (resource === "projects" && id && !operation)
      return result({ project: publicProject(project(id), revision) });
    if (resource === "tasks" && id && !operation)
      return result({
        task: publicTask(task(id), revision, true),
        comments: journal.comments.filter((comment) => comment.taskId === id),
      });
    if (resource === "milestones" && id && !operation)
      return result({ milestone: publicMilestone(milestone(id), revision) });
    throw httpError(404, "Route not found.");
  }
  if (request.method !== "POST") throw httpError(405, "Unsupported method.");
  if (typeof body !== "object" || Array.isArray(body))
    throw httpError(400, "JSON object required.");

  if (resource === "mutations" && operation === "undo") {
    const undo = journal.undo;
    if (!undo || undo.id !== id || undo.after !== stateFingerprint(state)) {
      throw httpError(409, "Only the latest unchanged mutation can be undone.");
    }
    const next = structuredClone(journal);
    next.revision += 1;
    next.mutations = next.mutations.map((item) =>
      item.id === id ? { ...item, undoneAt: Date.now() } : item,
    );
    next.undo = null;
    next.comments = next.comments.filter((item) => item.id !== id);
    return {
      state: {
        ...structuredClone(undo.before),
        localAutomation: next,
        updatedAt: Date.now(),
      },
      result: { ok: true, revision: next.revision },
    };
  }

  const key = request.idempotencyKey;
  if (typeof key !== "string" || !key.trim() || key.length > 200) {
    throw httpError(400, "A valid Idempotency-Key is required.");
  }
  const signature = JSON.stringify([url.pathname, body]);
  const replay = Object.hasOwn(journal.replays, key)
    ? journal.replays[key]
    : undefined;
  if (replay) {
    if (replay.signature !== signature)
      throw httpError(409, "Idempotency key already used for another request.");
    return result({ ...replay.result, replayed: true });
  }
  const next = structuredClone(state);
  const automation = structuredClone(journal);
  const mutationId = crypto.randomUUID();
  let action: string;
  let response: Record<string, unknown>;
  const nextRevision = revision + 1;
  if (
    (resource === "projects" && operation === "tasks") ||
    (resource === "tasks" && operation === "mutations")
  ) {
    action = resource === "projects" ? "task.create" : String(body.action);
    if (resource === "tasks" && action === "task.create")
      throw httpError(400, "Use a Project to create tasks.");
    const entity = mutateTaskState({
      action,
      state: next,
      taskId: resource === "tasks" ? id : undefined,
      body:
        resource === "projects"
          ? { ...body, projectId: id, generatedTaskId: crypto.randomUUID() }
          : body,
      now: Date.now(),
      allowInlineImages: true,
    });
    response = { task: publicTask(entity, nextRevision, true) };
  } else if (
    (resource === "workspaces" && operation === "milestones") ||
    (resource === "milestones" && operation === "mutations")
  ) {
    action =
      resource === "workspaces" ? "milestone.create" : String(body.action);
    if (resource === "milestones" && action === "milestone.create")
      throw httpError(400, "Use a Workspace to create milestones.");
    const entity = mutateMilestoneState({
      action,
      state: next,
      milestoneId: resource === "milestones" ? id : undefined,
      body:
        resource === "workspaces"
          ? { ...body, generatedMilestoneId: crypto.randomUUID() }
          : body,
      now: Date.now(),
    });
    response = { milestone: publicMilestone(entity, nextRevision) };
  } else if (
    (resource === "workspaces" && operation === "projects") ||
    (resource === "projects" && operation === "mutations")
  ) {
    action =
      resource === "workspaces" ? "project.create" : String(body.action);
    if (resource === "projects" && action === "project.create")
      throw httpError(400, "Use a Workspace to create projects.");
    const entity = mutateProjectState({
      action,
      state: next,
      projectId: resource === "projects" ? id : undefined,
      body:
        resource === "workspaces"
          ? { ...body, generatedProjectId: crypto.randomUUID() }
          : body,
      now: Date.now(),
    });
    response = { project: publicProject(entity, nextRevision) };
  } else if (resource === "tasks" && operation === "comments") {
    task(id);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 10_000)
      throw httpError(400, "Comment must contain 1 to 10000 characters.");
    action = "task.comment";
    const comment = {
      id: mutationId,
      taskId: id,
      message,
      createdAt: Date.now(),
      actorId: options.actorId,
    };
    automation.comments.push(comment);
    response = { comment };
  } else {
    throw httpError(404, "Route not found.");
  }
  automation.revision = nextRevision;
  automation.mutations.push({
    id: mutationId,
    action,
    actorId: options.actorId,
    createdAt: Date.now(),
    undoneAt: null,
  });
  automation.undo = {
    id: mutationId,
    before: snapshotWithoutJournal(state),
    after: stateFingerprint(next),
  };
  const responseBody = {
    ...response,
    mutationId,
    revision: nextRevision,
    replayed: false,
  };
  Object.defineProperty(automation.replays, key, {
    value: { signature, result: responseBody },
    enumerable: true,
    writable: true,
    configurable: true,
  });
  next.localAutomation = automation;
  return { state: next, result: responseBody };
};
