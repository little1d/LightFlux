import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface WebVisualViewportFrame {
  height: number;
  offsetTop: number;
}

export const useWebVisualViewport = (active: boolean) => {
  const [frame, setFrame] = useState<WebVisualViewportFrame | null>(null);

  useEffect(() => {
    if (
      !active ||
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      !window.visualViewport
    ) {
      setFrame(null);
      return;
    }

    const viewport = window.visualViewport;
    const updateFrame = () => {
      setFrame({
        height: viewport.height,
        offsetTop: viewport.offsetTop,
      });
    };

    updateFrame();
    viewport.addEventListener('resize', updateFrame);
    viewport.addEventListener('scroll', updateFrame);
    return () => {
      viewport.removeEventListener('resize', updateFrame);
      viewport.removeEventListener('scroll', updateFrame);
    };
  }, [active]);

  return frame;
};
