import React from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
}

// On Web, menus and overlays must escape their trigger's ancestor chain.
// React Native Web wraps every View in a stacking/transform context and the
// Settings cards use `overflow: hidden`, so an in-tree overlay gets clipped or
// painted underneath sibling sections (e.g. the language dropdown hidden behind
// the statistics block). Rendering through a portal into `document.body` puts
// the overlay in the root stacking context where its own z-index wins.
const Portal = ({ children }: PortalProps) => {
  if (typeof document === 'undefined') {
    return <>{children}</>;
  }
  return createPortal(children, document.body);
};

export default Portal;
