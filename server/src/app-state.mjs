export const isCurrentAppState = (value) =>
  value?.schemaVersion === 12 &&
  Array.isArray(value.todos) &&
  Array.isArray(value.projects);
