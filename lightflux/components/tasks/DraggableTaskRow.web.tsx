import React, { useEffect, useRef, useState } from 'react';

interface DraggableTaskRowProps {
  children: React.ReactNode;
  id: string;
  index: number;
  label: string;
  nested: boolean;
  onMove: (id: string, targetIndex: number) => void;
  scopeId: string;
}

const DRAG_TYPE = 'text/lightflux-task-id';

const DraggableTaskRow = ({
  children,
  id,
  index,
  label,
  nested,
  onMove,
  scopeId,
}: DraggableTaskRowProps) => {
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dropTargeted, setDropTargeted] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const cleanupDrag = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);

  useEffect(
    () => () => {
      cleanupDrag.current?.();
    },
    [],
  );

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary || !rowRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    cleanupDrag.current?.();

    const pointerId = event.pointerId;
    const startY = event.clientY;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-task-drag-scope]'),
    )
      .filter((element) => element.dataset.taskDragScope === scopeId)
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          centerY: bounds.top + bounds.height / 2,
          element,
          index: Number(element.dataset.taskDragIndex),
        };
      })
      .filter((target) => Number.isFinite(target.index));
    let activated = false;
    let targetIndex = index;
    let targetElement: HTMLElement | null = null;
    let finished = false;

    const clearTarget = () => {
      if (targetElement) {
        targetElement.style.boxShadow = '';
        targetElement = null;
      }
    };
    const setTarget = (nextTarget: (typeof targets)[number]) => {
      if (targetElement === nextTarget.element) {
        targetIndex = nextTarget.index;
        return;
      }
      clearTarget();
      targetIndex = nextTarget.index;
      if (nextTarget.element !== rowRef.current) {
        targetElement = nextTarget.element;
        targetElement.style.boxShadow = 'inset 0 2px 0 #8B7EFF';
      }
    };
    const finish = (commit: boolean) => {
      if (finished) {
        return;
      }
      finished = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', cancel);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      clearTarget();
      cleanupDrag.current = null;
      setDragOffset(0);
      setDragging(false);
      if (activated) {
        suppressClick.current = true;
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
      if (commit && activated && targetIndex !== index) {
        onMove(id, targetIndex);
      }
    };
    const move = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) {
        return;
      }
      const nextOffset = pointerEvent.clientY - startY;
      if (!activated && Math.abs(nextOffset) < 4) {
        return;
      }
      pointerEvent.preventDefault();
      if (!activated) {
        activated = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
        setDragging(true);
      }
      setDragOffset(nextOffset);
      const nextTarget = targets.reduce((closest, candidate) =>
        Math.abs(candidate.centerY - pointerEvent.clientY) <
        Math.abs(closest.centerY - pointerEvent.clientY)
          ? candidate
          : closest,
      );
      setTarget(nextTarget);
    };
    const release = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId === pointerId) {
        finish(true);
      }
    };
    const cancel = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId === pointerId) {
        finish(false);
      }
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', cancel);
    cleanupDrag.current = () => finish(false);
  };

  return (
    <div
      aria-label={label}
      data-task-drag-index={index}
      data-task-drag-scope={scopeId}
      onDragEnter={() => setDropTargeted(true)}
      onDragLeave={() => setDropTargeted(false)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDropTargeted(false);
        try {
          const payload = JSON.parse(
            event.dataTransfer.getData(DRAG_TYPE),
          ) as {
            id?: string;
            scopeId?: string;
          };
          if (payload.id && payload.scopeId === scopeId) {
            onMove(payload.id, index);
          }
        } catch {
          // Ignore unrelated or malformed desktop drag payloads.
        }
      }}
      ref={rowRef}
      role="listitem"
      style={{
        backgroundColor: dragging ? '#F0EEFF' : 'transparent',
        borderRadius: nested ? 9 : 12,
        boxShadow: dragging
          ? '0 9px 22px rgba(58, 49, 120, 0.2)'
          : dropTargeted
            ? 'inset 0 2px 0 #8B7EFF'
            : 'none',
        marginBottom: 2,
        opacity: dragging ? 0.96 : 1,
        position: 'relative',
        transform: `translateY(${dragOffset}px) scale(${dragging ? 1.012 : 1})`,
        transition:
          dragging
            ? 'none'
            : 'box-shadow 120ms ease, opacity 120ms ease, transform 120ms ease',
        zIndex: dragging ? 10 : 0,
      }}
    >
      <div
        aria-label={label}
        draggable
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (suppressClick.current) {
            suppressClick.current = false;
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            onMove(id, index - 1);
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            onMove(id, index + 1);
          }
        }}
        onDragEnd={() => {
          setDragOffset(0);
          setDragging(false);
        }}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData(
            DRAG_TYPE,
            JSON.stringify({ id, scopeId }),
          );
          setDragging(true);
        }}
        onPointerDown={beginDrag}
        role="button"
        style={{
          alignItems: 'center',
          color: '#A3A2AD',
          cursor: dragging ? 'grabbing' : 'grab',
          display: 'flex',
          fontSize: 12,
          height: 28,
          justifyContent: 'center',
          left: nested ? 0 : -14,
          position: 'absolute',
          top: '50%',
          touchAction: 'none',
          transform: 'translateY(-50%)',
          userSelect: 'none',
          width: 28,
          zIndex: 2,
        }}
        tabIndex={0}
      >
        ⠿
      </div>
      {children}
    </div>
  );
};

export default DraggableTaskRow;
