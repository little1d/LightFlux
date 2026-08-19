import { NavigationItemId } from '../../types/todo';

// Shared, platform-agnostic drag state for sidebar reordering. The parent owns
// this so non-dragged rows can animate out of the way while a row is lifted.
export interface NavigationDragState {
  id: NavigationItemId;
  sourceIndex: number;
  targetIndex: number;
}

// Row height (48) plus the 12px vertical gap between sidebar items.
export const NAVIGATION_ITEM_STEP = 60;
