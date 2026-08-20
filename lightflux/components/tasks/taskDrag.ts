export interface TaskDragState {
  id: string;
  scopeId: string;
  sourceIndex: number;
  targetIndex: number;
}

export const taskRowStep = (nested: boolean): number => (nested ? 46 : 54);

export const taskDragDisplacement = ({
  dragState,
  id,
  index,
  nested,
  scopeId,
}: {
  dragState: TaskDragState | null;
  id: string;
  index: number;
  nested: boolean;
  scopeId: string;
}): number => {
  if (!dragState || dragState.id === id || dragState.scopeId !== scopeId) {
    return 0;
  }
  const { sourceIndex, targetIndex } = dragState;
  const step = taskRowStep(nested);
  if (targetIndex > sourceIndex && index > sourceIndex && index <= targetIndex) {
    return -step;
  }
  if (targetIndex < sourceIndex && index >= targetIndex && index < sourceIndex) {
    return step;
  }
  return 0;
};
