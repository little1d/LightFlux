import { DESKTOP_LAYOUT_BREAKPOINT } from './layout';

const STYLE_ID = 'lightflux-focus-styles';
const WEB_MIN_WIDTH = 320;
const WEB_MIN_HEIGHT = 568;

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html,
    body {
      margin: 0;
      min-height: ${WEB_MIN_HEIGHT}px;
      min-width: ${WEB_MIN_WIDTH}px;
      overflow: auto;
    }

    #root {
      display: flex;
      min-height: max(100vh, ${WEB_MIN_HEIGHT}px);
      min-width: ${WEB_MIN_WIDTH}px;
    }

    #root > div {
      flex: 1 0 auto;
      min-height: ${WEB_MIN_HEIGHT}px;
      min-width: ${WEB_MIN_WIDTH}px;
    }

    input:focus,
    textarea:focus,
    [contenteditable="true"]:focus {
      outline: none !important;
    }

    #task-title-input:focus {
      border-bottom-color: #6759e8 !important;
      box-shadow: 0 2px 0 rgba(103, 89, 232, 0.16);
    }

    @media (max-width: ${DESKTOP_LAYOUT_BREAKPOINT - 1}px) {
      html,
      body,
      #root,
      #root > div {
        height: 100%;
        min-height: 0;
      }

      html,
      body {
        overflow-x: auto;
        overflow-y: hidden;
      }

      #root {
        overflow: hidden;
      }

      @supports (height: 100dvh) {
        html,
        body,
        #root,
        #root > div {
          height: 100dvh;
        }
      }
    }

    @media (min-width: ${DESKTOP_LAYOUT_BREAKPOINT}px) {
      #task-rich-editor:focus-within {
        border-color: rgba(103, 89, 232, 0.62) !important;
        box-shadow: 0 0 0 3px rgba(103, 89, 232, 0.1);
      }
    }

    #today-task-composer:focus-within,
    #calendar-task-composer:focus-within,
    #project-name-composer:focus-within,
    #context-subtask-composer:focus-within,
    [id^="project-task-composer-"]:focus-within {
      border-color: rgba(103, 89, 232, 0.56) !important;
      box-shadow: 0 0 0 3px rgba(103, 89, 232, 0.09);
    }

    button:focus {
      outline: none;
    }

    button:focus-visible,
    [role="button"]:focus-visible,
    [role="checkbox"]:focus-visible,
    [role="tab"]:focus-visible {
      outline: 2px solid rgba(103, 89, 232, 0.72) !important;
      outline-offset: 2px;
    }

    input,
    textarea,
    [contenteditable="true"],
    button,
    [role="button"],
    [role="checkbox"],
    [role="tab"] {
      transition:
        border-color 140ms ease,
        box-shadow 140ms ease,
        outline-color 140ms ease,
        background-color 140ms ease;
    }
  `;
  document.head.appendChild(style);
}

export {};
