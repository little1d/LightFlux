import React, { useState } from 'react';

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

const createDragPreview = (
  row: HTMLElement,
  nested: boolean,
): HTMLElement => {
  const visibleRow = row.lastElementChild as HTMLElement | null;
  const source = visibleRow ?? row;
  const bounds = source.getBoundingClientRect();
  const preview = source.cloneNode(true) as HTMLElement;
  Object.assign(preview.style, {
    backgroundColor: '#F0EEFF',
    borderRadius: nested ? '9px' : '12px',
    boxShadow: '0 9px 22px rgba(58, 49, 120, 0.2)',
    height: `${bounds.height}px`,
    left: '-10000px',
    margin: '0',
    opacity: '0.96',
    pointerEvents: 'none',
    position: 'fixed',
    top: '-10000px',
    transform: 'none',
    width: `${bounds.width}px`,
    zIndex: '9999',
  });
  document.body.appendChild(preview);
  return preview;
};

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
  const [targeted, setTargeted] = useState(false);

  return (
    <div
      aria-label={label}
      onDragEnter={() => setTargeted(true)}
      onDragLeave={() => setTargeted(false)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        try {
          const rawPayload = event.dataTransfer.getData(DRAG_TYPE);
          if (!rawPayload) {
            return;
          }
          const payload = JSON.parse(rawPayload) as {
            id?: string;
            scopeId?: string;
          };
          if (payload.id && payload.scopeId === scopeId) {
            onMove(payload.id, index);
          }
        } catch {
          // Ignore unrelated or malformed drag payloads.
        } finally {
          setTargeted(false);
        }
      }}
      role="listitem"
      style={{
        backgroundColor: 'transparent',
        borderRadius: nested ? 9 : 12,
        boxShadow: targeted ? 'inset 0 2px 0 #8B7EFF' : 'none',
        marginBottom: 2,
        opacity: dragging ? 0.52 : 1,
        position: 'relative',
        transition:
          'box-shadow 120ms ease, opacity 120ms ease',
      }}
    >
      <div
        aria-label={label}
        draggable
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDragEnd={() => setDragging(false)}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData(
            DRAG_TYPE,
            JSON.stringify({ id, scopeId }),
          );
          const row = event.currentTarget.parentElement;
          if (row) {
            const preview = createDragPreview(row, nested);
            const bounds = preview.getBoundingClientRect();
            event.dataTransfer.setDragImage(
              preview,
              bounds.width / 2,
              bounds.height / 2,
            );
            requestAnimationFrame(() => preview.remove());
          }
          setDragging(true);
        }}
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
          transform: 'translateY(-50%)',
          userSelect: 'none',
          width: nested ? 22 : 14,
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
