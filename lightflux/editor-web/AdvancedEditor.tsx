import { EditorContent } from '@tiptap/react';

import {
  TenTapStartKit,
  useTenTap,
} from '@10play/tentap-editor';
import { CodeBlockBridge } from '../components/editor/CodeBlockBridge';

export const AdvancedEditor = () => {
  const editor = useTenTap({
    bridges: [...TenTapStartKit, CodeBlockBridge],
  });

  return <EditorContent editor={editor} />;
};
