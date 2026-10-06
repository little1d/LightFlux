import { describe, expect, it, vi } from "vitest";
vi.mock("expo-file-system", () => ({
  File: class {},
  Paths: { document: "" },
}));
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
import { executeLocalRequest, LocalRequest } from "../services/localWorkspace";
import {
  parsePersistedAppState,
  createAppStateBackup,
  parseAppStateBackup,
} from "../services/todoStorage";

const initial = () =>
  parsePersistedAppState(
    JSON.stringify({
      schemaVersion: 12,
      todos: [],
      projects: [],
      milestones: [],
      updatedAt: 1,
    }),
  )!;
const create = (title = "Task"): LocalRequest => ({
  method: "POST",
  path: "/api/v1/projects/inbox/tasks",
  idempotencyKey: title,
  body: { title, scheduledDate: "2026-09-12" },
});

describe("local desktop workspace transactions", () => {
  it("creates, queries, persists audit and replays without duplicate tasks", () => {
    const created = executeLocalRequest(initial(), create());
    const replay = executeLocalRequest(created.state, create());
    expect(replay.state.todos).toHaveLength(1);
    expect(replay.result.replayed).toBe(true);
    expect(created.state.taskEvents).toHaveLength(1);
    const restored = parseAppStateBackup(createAppStateBackup(created.state))!;
    expect(restored.localAutomation?.mutations).toHaveLength(1);
    expect(executeLocalRequest(restored, create()).result.replayed).toBe(true);
  });

  it("rejects key collisions and preserves original state after invalid operations", () => {
    const created = executeLocalRequest(initial(), create());
    expect(() =>
      executeLocalRequest(created.state, {
        ...create(),
        body: { ...create().body, title: "Different" },
      }),
    ).toThrow("Idempotency key");
    expect(created.state.todos[0].title).toBe("Task");
  });

  it("enforces task versions and prevents parent cycles", () => {
    const parent = executeLocalRequest(initial(), create());
    const id = parent.state.todos[0].id;
    const child = executeLocalRequest(parent.state, {
      ...create("Child"),
      body: { ...create("Child").body, parentId: id },
    });
    expect(child.state.todos[1].parentId).toBe(id);
    const change: LocalRequest = {
      method: "POST",
      path: `/api/v1/tasks/${id}/mutations`,
      idempotencyKey: "change",
      body: {
        action: "task.update",
        expectedVersion: 0,
        changes: { title: "Changed" },
      },
    };
    expect(() => executeLocalRequest(child.state, change)).toThrow("changed");
    expect(() =>
      executeLocalRequest(child.state, {
        ...change,
        body: {
          ...change.body,
          expectedVersion: child.state.todos[0].updatedAt,
          changes: { parentId: child.state.todos[1].id },
        },
      }),
    ).toThrow("descendant");
  });

  it("creates rich-text milestones and preserves associations", () => {
    const milestone = executeLocalRequest(initial(), {
      method: "POST",
      path: "/api/v1/workspaces/local/milestones",
      idempotencyKey: "milestone",
      body: {
        title: "Launch",
        dateRule: {
          calendar: "solar",
          year: 2026,
          month: 9,
          day: 20,
          leapDayPolicy: "feb-28",
        },
      },
    });
    const content = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Notes" }] },
      ],
    };
    const created = executeLocalRequest(milestone.state, {
      ...create(),
      body: {
        ...create().body,
        content,
        milestoneId: milestone.state.milestones[0].id,
      },
    });
    expect(created.state.todos[0].content).toEqual(content);
    expect(created.state.todos[0].milestoneId).toBe(
      milestone.state.milestones[0].id,
    );
  });

  it("undo survives reload but rejects subsequent desktop edits", () => {
    const created = executeLocalRequest(initial(), create());
    const undo: LocalRequest = {
      method: "POST",
      path: `/api/v1/mutations/${created.result.mutationId}/undo`,
    };
    const restored = parseAppStateBackup(createAppStateBackup(created.state))!;
    expect(executeLocalRequest(restored, undo).state.todos).toHaveLength(0);
    restored.todos[0].title = "Desktop edit";
    expect(() => executeLocalRequest(restored, undo)).toThrow(
      "latest unchanged",
    );
  });

  it("tracks comment mutations and undoes them without losing tasks", () => {
    const created = executeLocalRequest(initial(), create());
    const commented = executeLocalRequest(created.state, {
      method: "POST",
      path: `/api/v1/tasks/${created.state.todos[0].id}/comments`,
      idempotencyKey: "comment",
      body: { message: "Note" },
    });
    const undone = executeLocalRequest(commented.state, {
      method: "POST",
      path: `/api/v1/mutations/${commented.result.mutationId}/undo`,
    });
    expect(undone.state.localAutomation?.comments).toHaveLength(0);
    expect(undone.state.todos).toHaveLength(1);
  });

  it("permanently deletes an active task branch with audit and latest-only undo", () => {
    const parent = executeLocalRequest(initial(), create("Parent"));
    const parentId = parent.state.todos[0].id;
    const child = executeLocalRequest(parent.state, {
      ...create("Child"),
      body: { ...create("Child").body, parentId },
    });
    const removed = executeLocalRequest(
      child.state,
      {
        method: "POST",
        path: `/api/v1/tasks/${parentId}/mutations`,
        idempotencyKey: "delete-branch",
        body: {
          action: "task.delete",
          expectedVersion: child.state.todos[0].updatedAt,
        },
      },
      { actorId: "xiaoguang" },
    );
    expect(removed.state.todos).toEqual([]);
    expect(removed.state.taskEvents).toEqual([]);
    expect(removed.result.task).toMatchObject({ id: parentId, title: "Parent" });
    expect(removed.state.localAutomation?.mutations.at(-1)).toMatchObject({
      action: "task.delete",
      actorId: "xiaoguang",
    });

    const restored = executeLocalRequest(removed.state, {
      method: "POST",
      path: `/api/v1/mutations/${removed.result.mutationId}/undo`,
    });
    expect(restored.state.todos.map((task) => task.title)).toEqual([
      "Parent",
      "Child",
    ]);
    expect(restored.state.taskEvents).toHaveLength(2);
  });

  it("creates, updates, reorders and deletes projects with audit and undo", () => {
    const stateWithInbox = () => {
      const state = initial();
      state.projects = [
        {
          id: "inbox",
          name: "Inbox",
          color: "#8B7EFF",
          createdAt: 1,
          kind: "inbox",
          sortOrder: 0,
        },
      ];
      return state;
    };
    const createProject = (
      name: string,
      key: string,
      extra: Record<string, unknown> = {},
    ): LocalRequest => ({
      method: "POST",
      path: "/api/v1/workspaces/local/projects",
      idempotencyKey: key,
      body: { name, ...extra },
    });
    const mutateProject = (
      projectId: string,
      key: string,
      body: Record<string, unknown>,
    ): LocalRequest => ({
      method: "POST",
      path: `/api/v1/projects/${projectId}/mutations`,
      idempotencyKey: key,
      body,
    });
    const projectResult = (response: ReturnType<typeof executeLocalRequest>) =>
      response.result.project as {
        id: string;
        name: string;
        color: string;
        workspaceRevision: number;
      };

    let state = stateWithInbox();
    const first = executeLocalRequest(state, createProject("Work", "p1"));
    state = first.state;
    expect(projectResult(first).color).toBe("#55B9A5");
    const lifeBody = { color: "#55b9a5", afterProjectId: "inbox" };
    const second = executeLocalRequest(
      state,
      createProject("Life", "p2", lifeBody),
    );
    state = second.state;
    const workId = projectResult(first).id;
    const lifeId = projectResult(second).id;
    expect(state.projects.map((project) => project.id)).toEqual([
      "inbox",
      lifeId,
      workId,
    ]);
    expect(projectResult(second).color).toBe("#55B9A5");

    const shown = executeLocalRequest(state, {
      method: "GET",
      path: `/api/v1/projects/${workId}`,
    });
    expect(projectResult(shown).name).toBe("Work");
    expect(projectResult(shown).workspaceRevision).toBe(2);
    expect(() =>
      executeLocalRequest(state, { method: "GET", path: "/api/v1/projects/nope" }),
    ).toThrow("Project not found");

    const renamed = executeLocalRequest(
      state,
      mutateProject(workId, "p3", {
        action: "project.update",
        name: "Work 2",
        color: "#dd7c91",
      }),
    );
    expect(
      renamed.state.projects.find((project) => project.id === workId)?.name,
    ).toBe("Work 2");
    expect(projectResult(renamed).color).toBe("#DD7C91");

    expect(() =>
      executeLocalRequest(
        renamed.state,
        mutateProject("inbox", "bad", { action: "project.update", name: "X" }),
      ),
    ).toThrow("reserved");
    expect(() =>
      executeLocalRequest(
        renamed.state,
        createProject("Bad", "bad-color", { color: "blue" }),
      ),
    ).toThrow("Invalid project color");

    const reordered = executeLocalRequest(
      renamed.state,
      mutateProject(workId, "p4", { action: "project.reorder", position: 0 }),
    );
    expect(reordered.state.projects.map((project) => project.id)).toEqual([
      "inbox",
      workId,
      lifeId,
    ]);
    expect(() =>
      executeLocalRequest(
        reordered.state,
        mutateProject(workId, "bad-position", {
          action: "project.reorder",
          position: 1.5,
        }),
      ),
    ).toThrow("integer");

    const task = executeLocalRequest(reordered.state, {
      ...create("Inside"),
      body: { ...create("Inside").body },
    });
    // create() defaults to the inbox project; move the task into Work first
    const moved = executeLocalRequest(task.state, {
      method: "POST",
      path: `/api/v1/tasks/${task.state.todos[0].id}/mutations`,
      idempotencyKey: "move-task",
      body: {
        action: "task.update",
        expectedVersion: task.state.todos[0].updatedAt,
        changes: { projectId: workId },
      },
    });
    const deleted = executeLocalRequest(
      moved.state,
      mutateProject(workId, "p5", { action: "project.delete" }),
    );
    expect(deleted.state.projects.map((project) => project.id)).not.toContain(
      workId,
    );
    expect(deleted.state.todos[0].projectId).toBe("inbox");

    const actions = deleted.state.localAutomation?.mutations.map(
      (mutation) => mutation.action,
    );
    for (const action of [
      "project.create",
      "project.update",
      "project.reorder",
      "project.delete",
    ]) {
      expect(actions).toContain(action);
    }

    const replayed = executeLocalRequest(
      deleted.state,
      createProject("Life", "p2", lifeBody),
    );
    expect(replayed.result.replayed).toBe(true);
    expect(replayed.state.projects).toHaveLength(2);

    const undone = executeLocalRequest(deleted.state, {
      method: "POST",
      path: `/api/v1/mutations/${deleted.result.mutationId}/undo`,
    });
    expect(undone.state.projects.map((project) => project.id)).toContain(workId);
    expect(undone.state.todos[0].projectId).toBe(workId);
  });

  it("rejects unsupported routes and cross-workspace paths", () => {
    for (const path of [
      "/api/v1/auth/device",
      "/api/v1/workspaces/remote/projects",
      "/api/v1/tasks/x/extra/path",
    ]) {
      expect(() =>
        executeLocalRequest(initial(), { method: "GET", path }),
      ).toThrow();
    }
  });

  it("rejects unknown journal versions without silently dropping audit data", () => {
    expect(
      parsePersistedAppState(
        JSON.stringify({
          ...initial(),
          localAutomation: { version: 99 },
        }),
      ),
    ).toBeNull();
  });

  it("keeps raster images local and rejects executable SVG data URLs", () => {
    const request = (src: string): LocalRequest => ({
      ...create(),
      body: {
        ...create().body,
        content: { type: "doc", content: [{ type: "image", attrs: { src } }] },
      },
    });
    expect(
      executeLocalRequest(initial(), request("data:image/png;base64,YWJj"))
        .state.todos,
    ).toHaveLength(1);
    expect(() =>
      executeLocalRequest(initial(), request("data:image/svg+xml;base64,YWJj")),
    ).toThrow();
  });
});
