import { describe, expect, it } from "vitest";

import { mutateTaskState } from "@lightflux/domain";

type SharedTask = {
  id: string;
  updatedAt: number;
  parentId: string | null;
  projectId: string;
  trashedAt: number | null;
  [key: string]: unknown;
};

type SharedState = {
  schemaVersion: number;
  updatedAt: number;
  todos: SharedTask[];
  projects: Record<string, unknown>[];
  milestones: Record<string, unknown>[];
  taskEvents: { id: string; taskId: string; type: string; occurredAt: number }[];
};

const task = (
  id: string,
  overrides: Record<string, unknown> = {},
): SharedTask => ({
  id,
  title: id,
  content: { type: "doc", content: [] },
  completed: false,
  completedAt: null,
  createdAt: 1,
  updatedAt: 1,
  scheduledDate: "2026-11-17",
  scheduledTime: null,
  projectId: "inbox",
  milestoneId: null,
  parentId: null,
  priority: "none",
  sortOrder: 0,
  trashedAt: null,
  ...overrides,
});

const workspace = (todos: SharedTask[]): SharedState => ({
  schemaVersion: 12,
  updatedAt: 1,
  todos,
  projects: [
    {
      id: "inbox",
      name: "Inbox",
      color: "#8B7EFF",
      createdAt: 1,
      kind: "inbox",
      sortOrder: 0,
    },
  ],
  milestones: [],
  taskEvents: [],
});

const mutate = (
  state: SharedState,
  taskId: string,
  body: Record<string, unknown>,
) =>
  mutateTaskState({
    action: String(body.action),
    body,
    state,
    taskId,
    now: 100,
  });

describe("shared task mutation rules", () => {
  it("refuses to delete a task that is still active", () => {
    const state = workspace([task("a")]);

    expect(() =>
      mutate(state, "a", {
        action: "task.delete",
        expectedVersion: 1,
      }),
    ).toThrow(/Trash the task before deleting it/);
    expect(state.todos).toHaveLength(1);
  });

  it("deletes only the trashed branch and keeps active children", () => {
    const state = workspace([
      task("parent", { trashedAt: 5 }),
      task("trashed-child", { parentId: "parent", trashedAt: 5 }),
      task("active-child", { parentId: "parent" }),
    ]);

    mutate(state, "parent", { action: "task.delete", expectedVersion: 1 });

    expect(state.todos.map((item) => item.id)).toEqual(["active-child"]);
    expect(state.todos[0].parentId).toBeNull();
  });

  it("drops history only for the deleted branch", () => {
    const state = workspace([
      task("parent", { trashedAt: 5 }),
      task("active-child", { parentId: "parent" }),
    ]);
    state.taskEvents = [
      { id: "e1", taskId: "parent", type: "trashed", occurredAt: 5 },
      { id: "e2", taskId: "active-child", type: "created", occurredAt: 1 },
    ];

    mutate(state, "parent", { action: "task.delete", expectedVersion: 1 });

    expect(state.taskEvents?.map((event) => event.id)).toEqual(["e2"]);
  });

  it("detaches a child restored after its branch moved Projects", () => {
    const state = workspace([
      task("parent", { projectId: "work" }),
      task("child", {
        parentId: "parent",
        projectId: "inbox",
        trashedAt: 5,
      }),
    ]);

    mutate(state, "child", {
      action: "task.restore",
      expectedVersion: 1,
    });

    expect(state.todos.find((item) => item.id === "child")).toMatchObject({
      parentId: null,
      projectId: "inbox",
      trashedAt: null,
    });
  });

  it("restores the parent link when both sides share a Project", () => {
    const state = workspace([
      task("parent", { projectId: "work" }),
      task("child", {
        parentId: "parent",
        projectId: "work",
        trashedAt: 5,
      }),
    ]);

    mutate(state, "child", {
      action: "task.restore",
      expectedVersion: 1,
    });

    expect(state.todos.find((item) => item.id === "child")).toMatchObject({
      parentId: "parent",
      trashedAt: null,
    });
  });
});
