import React, { useEffect, useRef, useState } from 'react';

import { NavigationItemId } from '../../types/todo';
import {
  NAVIGATION_ITEM_STEP,
  NavigationDragState,
} from './navigationDrag';

interface DraggableNavigationItemProps {
  children: React.ReactNode;
  dragState: NavigationDragState | null;
  id: NavigationItemId;
  index: number;
  itemCount: number;
  label: string;
  onDragStateChange: (state: NavigationDragState | null) => void;
  onMove: (id: NavigationItemId, targetIndex: number) => void;
}

// Ignore micro movements so a plain click still selects the view.
const DRAG_THRESHOLD = 5;

// HTML5 native drag-and-drop does not fire reliably inside the Tauri
// WebView, so the desktop sidebar drags with window-level mouse events
// instead. The dragged row lifts and follows the cursor as a live preview
// while the other rows slide out of the way to reveal the drop slot.
//
// The window listeners are attached synchronously on mouse down (not from an
// effect) so a drag never misses the first moves while React re-renders.
const DraggableNavigationItem = ({
  children,
  dragState,
  id,
  index,
  itemCount,
  label,
  onDragStateChange,
  onMove,
}: DraggableNavigationItemProps) => {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [activated, setActivated] = useState(false);
  const startY = useRef(0);
  const activatedRef = useRef(false);
  const suppressClick = useRef(false);
  const latestOffset = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  latestOffset.current = offset;

  // Keep the latest props in refs so the imperatively-attached listeners
  // always act on current values without re-binding.
  const moveState = useRef({ id, index, itemCount, onDragStateChange, onMove });
  moveState.current = { id, index, itemCount, onDragStateChange, onMove };

  const endDrag = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    activatedRef.current = false;
    setActivated(false);
    setDragging(false);
    setOffset(0);
    moveState.current.onDragStateChange(null);
  };

  // Detach listeners if the component unmounts mid-drag.
  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
    [],
  );

  const clampTarget = (raw: number) =>
    Math.max(0, Math.min(raw, moveState.current.itemCount - 1));

  const beginDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || cleanupRef.current) {
      return;
    }
    // Clear any stale suppression left by a drag that ended off-row so a
    // fresh click still selects the view.
    suppressClick.current = false;
    startY.current = event.clientY;
    activatedRef.current = false;
    setActivated(false);
    setDragging(true);

    const handleMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY.current;
      if (!activatedRef.current && Math.abs(delta) < DRAG_THRESHOLD) {
        return;
      }
      if (!activatedRef.current) {
        activatedRef.current = true;
        setActivated(true);
      }
      setOffset(delta);
      const { id: liveId, index: liveIndex, onDragStateChange: report } =
        moveState.current;
      report({
        id: liveId,
        sourceIndex: liveIndex,
        targetIndex: clampTarget(liveIndex + Math.round(delta / NAVIGATION_ITEM_STEP)),
      });
    };
    const handleUp = () => {
      if (activatedRef.current) {
        suppressClick.current = true;
        const { id: liveId, index: liveIndex, onMove: move } =
          moveState.current;
        const targetIndex = clampTarget(
          liveIndex + Math.round(latestOffset.current / NAVIGATION_ITEM_STEP),
        );
        move(liveId, targetIndex);
      }
      endDrag();
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    cleanupRef.current = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  };

  const lifted = dragging && activated;

  // While another row is lifted, slide this row into the gap it leaves so the
  // drop slot is always visible. Rows between the source and the live target
  // shift by exactly one step in the opposite direction of the drag.
  let displacement = 0;
  if (dragState && !lifted && dragState.id !== id) {
    const { sourceIndex, targetIndex } = dragState;
    if (targetIndex > sourceIndex && index > sourceIndex && index <= targetIndex) {
      displacement = -NAVIGATION_ITEM_STEP;
    } else if (
      targetIndex < sourceIndex &&
      index >= targetIndex &&
      index < sourceIndex
    ) {
      displacement = NAVIGATION_ITEM_STEP;
    }
  }

  const translateY = lifted ? offset : displacement;

  return (
    <div
      aria-label={label}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      }}
      onMouseDown={beginDrag}
      role="listitem"
      style={{
        alignItems: 'center',
        backgroundColor: lifted ? '#ECE9FF' : 'transparent',
        borderRadius: 15,
        boxShadow: lifted ? '0 12px 26px rgba(58, 49, 120, 0.26)' : 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        display: 'inline-flex',
        justifyContent: 'center',
        marginBottom: 12,
        opacity: dragging ? 0.96 : 1,
        position: 'relative',
        touchAction: 'none',
        transform: lifted
          ? `translateY(${translateY}px) scale(1.06)`
          : `translateY(${translateY}px) scale(1)`,
        transition: lifted
          ? 'none'
          : 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 140ms ease, background-color 140ms ease',
        userSelect: 'none',
        zIndex: lifted ? 40 : 0,
      }}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

export default DraggableNavigationItem;
