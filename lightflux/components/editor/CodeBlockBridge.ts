import { BridgeExtension } from '@10play/tentap-editor';
import CodeBlock from '@tiptap/extension-code-block';

interface CodeBlockState {
  canToggleCodeBlock: boolean;
  isCodeBlockActive: boolean;
}

interface CodeBlockInstance {
  toggleCodeBlock: () => void;
}

interface CodeBlockMessage {
  type: 'toggle-code-block';
}

export const CodeBlockBridge = new BridgeExtension<
  CodeBlockState,
  CodeBlockInstance,
  CodeBlockMessage
>({
  tiptapExtension: CodeBlock,
  onBridgeMessage: (editor, message) => {
    if (message.type === 'toggle-code-block') {
      editor.chain().focus().toggleCodeBlock().run();
    }
    return false;
  },
  extendEditorInstance: (sendBridgeMessage) => ({
    toggleCodeBlock: () =>
      sendBridgeMessage({ type: 'toggle-code-block' }),
  }),
  extendEditorState: (editor) => ({
    canToggleCodeBlock: editor.can().toggleCodeBlock(),
    isCodeBlockActive: editor.isActive('codeBlock'),
  }),
  extendCSS: `
    pre {
      background: #25233b;
      border-radius: 12px;
      color: #f4f2ff;
      overflow-x: auto;
      padding: 16px;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
  `,
});
