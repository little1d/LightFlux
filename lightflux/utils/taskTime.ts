const TASK_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const TASK_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}`;
});

export const isTaskTime = (value: unknown): value is string =>
  typeof value === 'string' && TASK_TIME_PATTERN.test(value);

export const normalizeTaskTime = (value: unknown): string | null =>
  isTaskTime(value) ? value : null;
