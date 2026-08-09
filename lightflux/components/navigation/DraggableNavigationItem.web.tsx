import React, { useState } from 'react';

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
      role="listitem"
      style={{
        borderRadius: 15,
        boxShadow: targeted ? 'inset 0 2px 0 #8B7EFF' : 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        opacity: dragging ? 0.52 : 1,
      }}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

export default DraggableNavigationItem;
