import {
  TaskEvent,
  Todo,
  Project,
} from '../types/todo';
import { fromDateKey, toDateKey } from './date';

export type StatisticsRange = '7d' | '30d' | '90d' | 'year';

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
}

export interface TrendBucket {
  start: Date;
  end: Date;
  planned: number;
  completed: number;
}

export interface ProjectPressure {
  projectId: string;
  name: string;
  completed: number;
  pending: number;
  overdue: number;
}

export interface WeekdayRate {
  weekday: number;
  planned: number;
  completed: number;
  rate: number | null;
}

export type AnalyticsInsight =
  | {
      type: 'stable-days';
      weekdays: number[];
      advantage: number;
    }
  | {
      type: 'project-pressure';
      projectId: string;
      projectName: string;
      pending: number;
      overdue: number;
    }
  | {
      type: 'reduce-day';
      weekday: number;
      gap: number;
    }
  | {
      type: 'building-history';
    };

export interface TaskAnalytics {
  period: AnalyticsPeriod;
  completedCount: number;
  plannedCount: number;
  completionRate: number | null;
  completionRateDelta: number | null;
  pendingDelta: number;
  createdCount: number;
  currentOverdue: number;
  highPriorityOverdue: number;
  trend: TrendBucket[];
  pressure: ProjectPressure[];
  weekdays: WeekdayRate[];
  insights: AnalyticsInsight[];
  estimated: boolean;
  analyticsStartedAt: number;
}

interface HistoricalTaskState {
  exists: boolean;
  completed: boolean;
  trashed: boolean;
  scheduledDate: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const EVENT_ORDER: Record<TaskEvent['type'], number> = {
  created: 0,
  rescheduled: 1,
  completed: 2,
  reopened: 2,
  trashed: 3,
  restored: 3,
};

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, amount: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);

const dayCount = (start: Date, end: Date): number =>
  Math.max(
    1,
    Math.round(
      (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        DAY_MS,
    ) + 1,
  );

const periodForRange = (
  range: StatisticsRange,
  now: Date,
): AnalyticsPeriod => {
  const today = startOfDay(now);
  const start =
    range === 'year'
      ? new Date(today.getFullYear(), 0, 1)
      : addDays(
          today,
          range === '7d' ? -6 : range === '30d' ? -29 : -89,
        );
  return {
    start,
    end: today,
    startKey: toDateKey(start),
    endKey: toDateKey(today),
  };
};

const previousPeriod = (period: AnalyticsPeriod): AnalyticsPeriod => {
  const days = dayCount(period.start, period.end);
  const end = addDays(period.start, -1);
  const start = addDays(end, -(days - 1));
  return {
    start,
    end,
    startKey: toDateKey(start),
    endKey: toDateKey(end),
  };
};

const sortedEvents = (events: TaskEvent[]): TaskEvent[] =>
  [...events].sort(
    (a, b) =>
      a.occurredAt - b.occurredAt ||
      EVENT_ORDER[a.type] - EVENT_ORDER[b.type] ||
      a.id.localeCompare(b.id),
  );

const stateAt = (
  events: TaskEvent[],
  timestamp: number,
): Map<string, HistoricalTaskState> => {
  const states = new Map<string, HistoricalTaskState>();
  events.forEach((event) => {
    if (event.occurredAt > timestamp) {
      return;
    }
    const current = states.get(event.taskId) ?? {
      exists: false,
      completed: false,
      trashed: false,
      scheduledDate: null,
    };
    switch (event.type) {
      case 'created':
        states.set(event.taskId, {
          exists: true,
          completed: false,
          trashed: false,
          scheduledDate:
            event.metadata?.scheduledDate ?? current.scheduledDate,
        });
        break;
      case 'completed':
        states.set(event.taskId, { ...current, completed: true });
        break;
      case 'reopened':
        states.set(event.taskId, { ...current, completed: false });
        break;
      case 'rescheduled':
        states.set(event.taskId, {
          ...current,
          scheduledDate:
            event.metadata?.scheduledDate ?? current.scheduledDate,
        });
        break;
      case 'trashed':
        states.set(event.taskId, { ...current, trashed: true });
        break;
      case 'restored':
        states.set(event.taskId, { ...current, trashed: false });
        break;
    }
  });
  return states;
};

const endOfPeriodTimestamp = (period: AnalyticsPeriod): number =>
  addDays(period.end, 1).getTime() - 1;

const inPeriod = (timestamp: number, period: AnalyticsPeriod): boolean =>
  timestamp >= period.start.getTime() &&
  timestamp <= endOfPeriodTimestamp(period);

const keyInPeriod = (dateKey: string | null, period: AnalyticsPeriod) =>
  dateKey !== null &&
  dateKey >= period.startKey &&
  dateKey <= period.endKey;

const completionRateForPeriod = (
  events: TaskEvent[],
  activeIds: Set<string>,
  period: AnalyticsPeriod,
): { planned: number; completed: number; rate: number | null } => {
  const states = stateAt(events, endOfPeriodTimestamp(period));
  const plannedStates = Array.from(states.entries()).filter(
    ([taskId, state]) =>
      activeIds.has(taskId) &&
      state.exists &&
      !state.trashed &&
      keyInPeriod(state.scheduledDate, period),
  );
  const completed = plannedStates.filter(
    ([, state]) => state.completed,
  ).length;
  return {
    planned: plannedStates.length,
    completed,
    rate:
      plannedStates.length > 0
        ? Math.round((completed / plannedStates.length) * 100)
        : null,
  };
};

const pendingAt = (
  events: TaskEvent[],
  activeIds: Set<string>,
  timestamp: number,
): number =>
  Array.from(stateAt(events, timestamp).entries()).filter(
    ([taskId, state]) =>
      activeIds.has(taskId) &&
      state.exists &&
      !state.completed &&
      !state.trashed,
  ).length;

const makeTrendBuckets = (
  period: AnalyticsPeriod,
  range: StatisticsRange,
  events: TaskEvent[],
  activeIds: Set<string>,
): TrendBucket[] => {
  const days = dayCount(period.start, period.end);
  const count = range === '7d' ? 7 : range === '30d' ? 5 : 6;
  const bucketSize = Math.ceil(days / count);
  const buckets: TrendBucket[] = [];
  for (let index = 0; index < count; index += 1) {
    const start = addDays(period.start, index * bucketSize);
    if (start > period.end) {
      break;
    }
    const end = new Date(
      Math.min(
        addDays(start, bucketSize - 1).getTime(),
        period.end.getTime(),
      ),
    );
    const bucket: AnalyticsPeriod = {
      start,
      end,
      startKey: toDateKey(start),
      endKey: toDateKey(end),
    };
    const planned = completionRateForPeriod(
      events,
      activeIds,
      bucket,
    ).planned;
    const completed = new Set(
      events
        .filter(
          (event) =>
            activeIds.has(event.taskId) &&
            event.type === 'completed' &&
            inPeriod(event.occurredAt, bucket),
        )
        .map((event) => event.taskId),
    ).size;
    buckets.push({ start, end, planned, completed });
  }
  return buckets;
};

const makePressure = (
  todos: Todo[],
  projects: Project[],
  completedIds: Set<string>,
  todayKey: string,
): ProjectPressure[] => {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const pressure = new Map<string, ProjectPressure>();
  const getRow = (projectId: string) => {
    const current = pressure.get(projectId);
    if (current) {
      return current;
    }
    const row: ProjectPressure = {
      projectId,
      name: projectNames.get(projectId) ?? projectId,
      completed: 0,
      pending: 0,
      overdue: 0,
    };
    pressure.set(projectId, row);
    return row;
  };
  todos.forEach((todo) => {
    const row = getRow(todo.projectId);
    if (completedIds.has(todo.id)) {
      row.completed += 1;
    }
    if (!todo.completed) {
      row.pending += 1;
      if (todo.scheduledDate < todayKey) {
        row.overdue += 1;
      }
    }
  });
  return Array.from(pressure.values())
    .filter((row) => row.completed > 0 || row.pending > 0)
    .sort(
      (a, b) =>
        b.pending + b.completed - (a.pending + a.completed) ||
        b.pending - a.pending,
    )
    .slice(0, 6);
};

const makeWeekdays = (
  events: TaskEvent[],
  activeIds: Set<string>,
  period: AnalyticsPeriod,
): WeekdayRate[] => {
  const states = stateAt(events, endOfPeriodTimestamp(period));
  return WEEKDAY_ORDER.map((weekday) => {
    const planned = Array.from(states.entries()).filter(
      ([taskId, state]) =>
        activeIds.has(taskId) &&
        state.exists &&
        !state.trashed &&
        keyInPeriod(state.scheduledDate, period) &&
        state.scheduledDate !== null &&
        fromDateKey(state.scheduledDate).getDay() === weekday,
    );
    const completed = planned.filter(([, state]) => state.completed).length;
    return {
      weekday,
      planned: planned.length,
      completed,
      rate:
        planned.length > 0
          ? Math.round((completed / planned.length) * 100)
          : null,
    };
  });
};

const makeInsights = (
  weekdays: WeekdayRate[],
  pressure: ProjectPressure[],
  overallRate: number | null,
): AnalyticsInsight[] => {
  const insights: AnalyticsInsight[] = [];
  const comparable = weekdays.filter(
    (weekday) => weekday.planned >= 2 && weekday.rate !== null,
  );
  const stable = [...comparable]
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
    .filter(
      (weekday) =>
        overallRate === null || (weekday.rate ?? 0) >= overallRate + 5,
    )
    .slice(0, 2);
  if (stable.length > 0) {
    const stableRate = Math.round(
      stable.reduce((sum, weekday) => sum + (weekday.rate ?? 0), 0) /
        stable.length,
    );
    insights.push({
      type: 'stable-days',
      weekdays: stable.map((weekday) => weekday.weekday),
      advantage: Math.max(0, stableRate - (overallRate ?? stableRate)),
    });
  }
  const pressured = [...pressure].sort(
    (a, b) => b.pending - a.pending || b.overdue - a.overdue,
  )[0];
  if (pressured && pressured.pending > 0) {
    insights.push({
      type: 'project-pressure',
      projectId: pressured.projectId,
      projectName: pressured.name,
      pending: pressured.pending,
      overdue: pressured.overdue,
    });
  }
  const weakest = [...comparable].sort(
    (a, b) =>
      b.planned - b.completed - (a.planned - a.completed) ||
      (a.rate ?? 0) - (b.rate ?? 0),
  )[0];
  if (weakest && weakest.planned > weakest.completed) {
    insights.push({
      type: 'reduce-day',
      weekday: weakest.weekday,
      gap: weakest.planned - weakest.completed,
    });
  }
  if (insights.length === 0) {
    insights.push({ type: 'building-history' });
  }
  return insights.slice(0, 3);
};

export const buildTaskAnalytics = ({
  todos,
  projects,
  taskEvents,
  analyticsStartedAt,
  range,
  now = new Date(),
}: {
  todos: Todo[];
  projects: Project[];
  taskEvents: TaskEvent[];
  analyticsStartedAt: number;
  range: StatisticsRange;
  now?: Date;
}): TaskAnalytics => {
  const activeTodos = todos.filter((todo) => todo.trashedAt === null);
  const activeIds = new Set(activeTodos.map((todo) => todo.id));
  const events = sortedEvents(
    taskEvents.filter((event) => activeIds.has(event.taskId)),
  );
  const period = periodForRange(range, now);
  const previous = previousPeriod(period);
  const rate = completionRateForPeriod(events, activeIds, period);
  const previousRate = completionRateForPeriod(
    events,
    activeIds,
    previous,
  ).rate;
  const completedEvents = events.filter(
    (event) =>
      event.type === 'completed' && inPeriod(event.occurredAt, period),
  );
  const completedIds = new Set(
    completedEvents.map((event) => event.taskId),
  );
  const createdCount = new Set(
    events
      .filter(
        (event) =>
          event.type === 'created' && inPeriod(event.occurredAt, period),
      )
      .map((event) => event.taskId),
  ).size;
  const todayKey = toDateKey(startOfDay(now));
  const overdue = activeTodos.filter(
    (todo) => !todo.completed && todo.scheduledDate < todayKey,
  );
  const weekdays = makeWeekdays(events, activeIds, period);
  const pressure = makePressure(
    activeTodos,
    projects,
    completedIds,
    todayKey,
  );
  const pendingStart = pendingAt(
    events,
    activeIds,
    period.start.getTime() - 1,
  );
  const pendingEnd = pendingAt(
    events,
    activeIds,
    endOfPeriodTimestamp(period),
  );
  const estimated = period.start.getTime() < analyticsStartedAt;

  return {
    period,
    completedCount: completedIds.size,
    plannedCount: rate.planned,
    completionRate: rate.rate,
    completionRateDelta:
      rate.rate !== null && previousRate !== null
        ? rate.rate - previousRate
        : null,
    pendingDelta: pendingEnd - pendingStart,
    createdCount,
    currentOverdue: overdue.length,
    highPriorityOverdue: overdue.filter(
      (todo) => todo.priority === 'high',
    ).length,
    trend: makeTrendBuckets(period, range, events, activeIds),
    pressure,
    weekdays,
    insights: makeInsights(weekdays, pressure, rate.rate),
    estimated,
    analyticsStartedAt,
  };
};
