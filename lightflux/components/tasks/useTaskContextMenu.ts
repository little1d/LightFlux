import { useCallback, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

export interface TaskMenuPosition {
  x: number;
  y: number;
}

export type OpenTaskMenu = (
  todoId: string,
  position?: TaskMenuPosition,
) => void;

export const useTaskContextMenu = (
  todoId: string,
  onOpen: OpenTaskMenu,
) => {
  const targetRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const element = targetRef.current as unknown as HTMLElement | null;
    if (!element) {
      return undefined;
    }

    const suppressSecondaryPointer = (event: PointerEvent) => {
      if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const openMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onOpen(todoId, { x: event.clientX, y: event.clientY });
    };

    element.addEventListener(
      'pointerdown',
      suppressSecondaryPointer,
      true,
    );
    element.addEventListener('contextmenu', openMenu);
    return () => {
      element.removeEventListener(
        'pointerdown',
        suppressSecondaryPointer,
        true,
      );
      element.removeEventListener('contextmenu', openMenu);
    };
  }, [onOpen, todoId]);

  const openFromLongPress = useCallback(
    () => onOpen(todoId),
    [onOpen, todoId],
  );

  const openFromButton = useCallback(() => {
    if (Platform.OS === 'web') {
      const element = targetRef.current as unknown as HTMLElement | null;
      const rect = element?.getBoundingClientRect();
      if (rect) {
        onOpen(todoId, { x: rect.right - 200, y: rect.bottom + 6 });
        return;
      }
    }

    onOpen(todoId);
  }, [onOpen, todoId]);

  return { targetRef, openFromButton, openFromLongPress };
};
