import { useCallback, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

export interface ProjectMenuPosition {
  x: number;
  y: number;
}

export type OpenProjectMenu = (
  sectionId: string,
  position?: ProjectMenuPosition,
) => void;

export const useProjectContextMenu = (
  sectionId: string,
  onOpen: OpenProjectMenu,
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

    const openMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onOpen(sectionId, { x: event.clientX, y: event.clientY });
    };

    element.addEventListener('contextmenu', openMenu);
    return () => element.removeEventListener('contextmenu', openMenu);
  }, [onOpen, sectionId]);

  const openFromLongPress = useCallback(
    () => {
      if (Platform.OS === 'web') {
        onOpen(sectionId);
        return;
      }

      targetRef.current?.measureInWindow((x, y, width, height) => {
        onOpen(sectionId, {
          x: Math.max(12, x + width - 220),
          y: y + height + 6,
        });
      });
    },
    [onOpen, sectionId],
  );

  return { targetRef, openFromLongPress };
};
