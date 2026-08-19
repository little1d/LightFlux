import React from 'react';

interface PortalProps {
  children: React.ReactNode;
}

// Native already renders overlays through `Modal`, which escapes the view tree,
// so the portal is a transparent pass-through there.
const Portal = ({ children }: PortalProps) => <>{children}</>;

export default Portal;
