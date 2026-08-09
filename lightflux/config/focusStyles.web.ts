const STYLE_ID = 'lightflux-focus-styles';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    input:focus,
    textarea:focus,
    [contenteditable="true"]:focus {
      outline: none !important;
    }

    #task-title-input:focus {
      border-bottom-color: #6759e8 !important;
      box-shadow: 0 2px 0 rgba(103, 89, 232, 0.16);
    }

    #task-rich-editor:focus-within {
      border-color: rgba(103, 89, 232, 0.62) !important;
      box-shadow: 0 0 0 3px rgba(103, 89, 232, 0.1);
    }

    #today-task-composer:focus-within,
    #calendar-task-composer:focus-within,
    #group-name-composer:focus-within,
    #context-subtask-composer:focus-within,
    [id^="group-task-composer-"]:focus-within {
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
        border-color 150ms ease,
        box-shadow 150ms ease,
        outline-color 150ms ease,
        background-color 150ms ease;
    }
  `;
  document.head.appendChild(style);
}

export {};
