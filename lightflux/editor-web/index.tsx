import { createRoot } from 'react-dom/client';

import { AdvancedEditor } from './AdvancedEditor';

declare global {
  interface Window {
    contentInjected?: boolean;
  }
}

const interval = window.setInterval(() => {
  if (!window.contentInjected) {
    return;
  }

  const container = document.getElementById('root');
  if (container) {
    createRoot(container).render(<AdvancedEditor />);
  }
  window.clearInterval(interval);
}, 1);
