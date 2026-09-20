import { useCallback, useEffect, useRef, useState } from 'react';

// Tauri WKWebView 中 HTML5 原生拖拽不稳定，这里改用 window 级指针事件：
// 按下项目头部、移动超过阈值后“抬起”卡片跟随光标，并在落点显示一条插入线；
// 松手时把目标下标交给 onReorder。卡片高度不一，因此落点通过实时测量得到。

const DRAG_THRESHOLD = 5;
const CARD_SELECTOR = '[data-testid="lf-card-in"]';

interface CardRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
}

interface UseProjectCardDragArgs {
  index: number;
  onReorder: (targetIndex: number) => void;
  total: number;
}

export interface ProjectCardDragBind {
  onPointerDown: (event: unknown) => void;
}

// 在“去掉被拖卡片后”的列表中，依据光标所在区间计算落点下标。
const resolveTarget = (
  rects: CardRect[],
  myIndex: number,
  clientY: number,
): number => {
  const others = rects.filter((_, itemIndex) => itemIndex !== myIndex);
  let gap = 0;
  others.forEach((rect) => {
    if (clientY > rect.top + rect.height / 2) {
      gap += 1;
    }
  });
  return gap;
};

// 落点指示线在“去掉被拖卡片后”的 gap 个间隙处的纵向位置（视口坐标）。
const resolveGapY = (
  rects: CardRect[],
  myIndex: number,
  gap: number,
): number => {
  const others = rects.filter((_, itemIndex) => itemIndex !== myIndex);
  if (others.length === 0) {
    return rects[myIndex]?.top ?? 0;
  }
  if (gap === 0) {
    return others[0].top;
  }
  if (gap >= others.length) {
    return others[others.length - 1].bottom;
  }
  return (others[gap - 1].bottom + others[gap].top) / 2;
};

export const useProjectCardDrag = ({
  index,
  onReorder,
  total,
}: UseProjectCardDragArgs) => {
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);

  const live = useRef({ index, total, onReorder });
  live.current = { index, total, onReorder };
  const startY = useRef(0);
  const activated = useRef(false);
  const targetRef = useRef(0);
  const cleanup = useRef<null | (() => void)>(null);
  const rectsRef = useRef<CardRect[]>([]);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const previousUserSelect = useRef('');

  const removeIndicator = useCallback(() => {
    indicatorRef.current?.remove();
    indicatorRef.current = null;
  }, []);

  const measureCards = useCallback((): CardRect[] => {
    return Array.from(document.querySelectorAll<HTMLElement>(CARD_SELECTOR)).map(
      (element) => {
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
        };
      },
    );
  }, []);

  const createIndicator = useCallback(() => {
    const line = document.createElement('div');
    line.setAttribute('aria-hidden', 'true');
    line.style.cssText =
      'position:fixed;height:3px;border-radius:3px;' +
      'background:linear-gradient(90deg,#8B7EFF,#6759E8);' +
      'box-shadow:0 0 0 3px rgba(103,89,232,0.14);z-index:9999;' +
      'pointer-events:none;transition:top 90ms ease;';
    document.body.appendChild(line);
    indicatorRef.current = line;
  }, []);

  const paintIndicator = useCallback(
    (gap: number) => {
      const line = indicatorRef.current;
      const rects = rectsRef.current;
      const mine = rects[live.current.index];
      if (!line || !mine) {
        return;
      }
      line.style.left = `${mine.left}px`;
      line.style.width = `${mine.right - mine.left}px`;
      line.style.top = `${resolveGapY(rects, live.current.index, gap)}px`;
    },
    [],
  );

  const finish = useCallback(() => {
    cleanup.current?.();
    cleanup.current = null;
    activated.current = false;
    removeIndicator();
    document.body.style.userSelect = previousUserSelect.current;
    setDragging(false);
    setOffset(0);
  }, [removeIndicator]);

  useEffect(
    () => () => {
      cleanup.current?.();
      removeIndicator();
    },
    [removeIndicator],
  );

  const onPointerDown = useCallback(
    (event: unknown) => {
      const nativeEvent =
        (event as { nativeEvent?: PointerEvent; button?: number })
          .nativeEvent ?? (event as PointerEvent);
      if (nativeEvent.button !== 0 || cleanup.current) {
        return;
      }
      startY.current = nativeEvent.clientY;
      activated.current = false;
      setDragging(false);

      const handleMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientY - startY.current;
        if (!activated.current) {
          if (Math.abs(delta) < DRAG_THRESHOLD) {
            return;
          }
          activated.current = true;
          previousUserSelect.current = document.body.style.userSelect;
          document.body.style.userSelect = 'none';
          rectsRef.current = measureCards();
          createIndicator();
          setDragging(true);
        }
        targetRef.current = resolveTarget(
          rectsRef.current,
          live.current.index,
          moveEvent.clientY,
        );
        paintIndicator(targetRef.current);
        setOffset(delta);
      };

      const handleUp = () => {
        if (activated.current && targetRef.current !== live.current.index) {
          live.current.onReorder(targetRef.current);
        }
        finish();
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', finish);
      cleanup.current = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', finish);
      };
    },
    [createIndicator, finish, measureCards, paintIndicator],
  );

  return {
    bind: { onPointerDown } as ProjectCardDragBind,
    dragging,
    offset,
  };
};
