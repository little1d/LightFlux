import React, { useEffect, useRef, useState } from 'react';

import { NavigationItemId } from '../../types/todo';

interface DraggableNavigationItemProps {
  children: React.ReactNode;
  id: NavigationItemId;
  index: number;
  label: string;
  onMove: (id: NavigationItemId, targetIndex: number) => void;
}

const DRAG_TYPE = 'text/lightflux-navigation-id';

const DraggableNavigationItem = ({
  children,
  id,
  index,
  label,
  onMove,
}: DraggableNavigationItemProps) => {
  const [dragging, setDragging] = useState(false);
  const [targeted, setTargeted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tab = containerRef.current?.querySelector<HTMLElement>('[role="tab"]');
    if (tab) {
      tab.style.cursor = dragging ? 'grabbing' : 'grab';
    }
  }, [dragging]);

  return (
    <div
      aria-label={label}
      draggable
      onDragEnd={() => {
        setDragging(false);
        setTargeted(false);
      }}
      onDragEnter={() => setTargeted(true)}
      onDragLeave={() => setTargeted(false)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(DRAG_TYPE, id);
        event.currentTarget.style.backgroundColor = '#ECE9FF';
        event.currentTarget.style.boxShadow =
          '0 10px 24px rgba(58, 49, 120, 0.24)';
        event.currentTarget.style.transform = 'scale(1.06)';
        const bounds = event.currentTarget.getBoundingClientRect();
        event.dataTransfer.setDragImage(
          event.currentTarget,
          bounds.width / 2,
          bounds.height / 2,
        );
        setDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData(
          DRAG_TYPE,
        ) as NavigationItemId;
        setTargeted(false);
        if (sourceId) {
          onMove(sourceId, index);
        }
      }}
      ref={containerRef}
      role="listitem"
      style={{
        alignItems: 'center',
        backgroundColor: dragging ? '#ECE9FF' : 'transparent',
        borderRadius: 15,
        boxShadow: dragging
          ? '0 10px 24px rgba(58, 49, 120, 0.24)'
          : targeted
            ? 'inset 0 0 0 2px #8B7EFF'
            : 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        display: 'inline-flex',
        justifyContent: 'center',
        marginBottom: 12,
        opacity: dragging ? 0.52 : 1,
        transform: dragging ? 'scale(1.06)' : 'scale(1)',
        transition:
          'background-color 120ms ease, box-shadow 120ms ease, transform 120ms ease, opacity 120ms ease',
      }}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

export default DraggableNavigationItem;
