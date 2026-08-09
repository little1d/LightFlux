import React, { useRef } from 'react';

interface ResizableDividerProps {
  label: string;
  maxWidth: number;
  minWidth: number;
  onResize: (width: number) => void;
  width: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const ResizableDivider = ({
  label,
  maxWidth,
  minWidth,
  onResize,
  width,
}: ResizableDividerProps) => {
  const dragStart = useRef({ pointerX: 0, width });

  const beginDrag = (clientX: number) => {
    dragStart.current = { pointerX: clientX, width };
  };

  const resizeFromPointer = (clientX: number) => {
    onResize(
      clamp(
        dragStart.current.width + clientX - dragStart.current.pointerX,
        minWidth,
        maxWidth,
      ),
    );
  };

  return (
    <div
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemax={Math.round(maxWidth)}
      aria-valuemin={Math.round(minWidth)}
      aria-valuenow={Math.round(width)}
      onClick={(event) => event.currentTarget.focus()}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
          return;
        }
        event.preventDefault();
        onResize(
          clamp(
            width + (event.key === 'ArrowLeft' ? -24 : 24),
            minWidth,
            maxWidth,
          ),
        );
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.focus();
        beginDrag(event.clientX);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          resizeFromPointer(event.clientX);
        }
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      role="slider"
      style={{
        alignItems: 'center',
        background: '#F7F6FA',
        borderLeft: '1px solid #E4E3E9',
        borderRight: '1px solid #E4E3E9',
        boxSizing: 'border-box',
        cursor: 'col-resize',
        display: 'flex',
        justifyContent: 'center',
        touchAction: 'none',
        userSelect: 'none',
        width: 8,
      }}
      tabIndex={0}
    >
      <div
        style={{
          background: '#C7C4D2',
          borderRadius: 2,
          height: 44,
          width: 3,
        }}
      />
    </div>
  );
};

export default ResizableDivider;
