import { useCallback, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

import { MenuSurfacePosition } from '../ui/MenuSurface';

export type OpenMilestoneMenu = (
  milestoneId: string,
  position?: MenuSurfacePosition,
) => void;

export const useMilestoneContextMenu = (
  milestoneId: string,
  onOpen: OpenMilestoneMenu,
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
    const open = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onOpen(milestoneId, { x: event.clientX, y: event.clientY });
    };
    element.addEventListener('contextmenu', open);
    return () => element.removeEventListener('contextmenu', open);
  }, [milestoneId, onOpen]);

  const openFromLongPress = useCallback(
    () => onOpen(milestoneId),
    [milestoneId, onOpen],
  );
  const openFromButton = useCallback(() => {
    if (Platform.OS === 'web') {
      const element = targetRef.current as unknown as HTMLElement | null;
      const rect = element?.getBoundingClientRect();
      if (rect) {
        onOpen(milestoneId, { x: rect.right - 210, y: rect.top + 38 });
        return;
      }
    }
    onOpen(milestoneId);
  }, [milestoneId, onOpen]);

  return { targetRef, openFromButton, openFromLongPress };
};
