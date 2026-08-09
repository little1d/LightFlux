import React, { useState } from 'react';

interface DraggableSubtaskProps {
  children: React.ReactNode;
  id: string;
  index: number;
  label: string;
  onMove: (id: string, targetIndex: number) => void;
  parentId: string;
}

const DRAG_TYPE = 'text/lightflux-subtask-id';

const DraggableSubtask = ({
  children,
  id,
  index,
  label,
  onMove,
  parentId,
}: DraggableSubtaskProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isTarget, setIsTarget] = useState(false);

  return (
    <div
      aria-label={label}
      onDragEnter={() => setIsTarget(true)}
      onDragLeave={() => setIsTarget(false)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        const payload = event.dataTransfer.getData(DRAG_TYPE).split(':');
        const [sourceParentId, sourceId] = payload;
        setIsTarget(false);
        if (sourceId && sourceParentId === parentId) {
          onMove(sourceId, index);
        }
      }}
      role="listitem"
      style={{
        borderTop: isTarget ? '2px solid #8B7EFF' : '2px solid transparent',
        opacity: isDragging ? 0.48 : 1,
        position: 'relative',
      }}
    >
      <div
        aria-label={label}
        draggable
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDragEnd={() => setIsDragging(false)}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData(DRAG_TYPE, `${parentId}:${id}`);
          setIsDragging(true);
        }}
        role="button"
        style={{
          alignItems: 'center',
          color: '#A3A2AD',
          cursor: 'grab',
          display: 'flex',
          fontSize: 12,
          height: 28,
          justifyContent: 'center',
          left: 0,
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          userSelect: 'none',
          width: 22,
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

export default DraggableSubtask;
