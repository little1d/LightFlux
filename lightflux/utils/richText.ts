import { RichTextDocument, RichTextNode } from '../types/todo';

export const emptyRichTextDocument = (): RichTextDocument => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

export const isRichTextDocument = (
  value: unknown,
): value is RichTextDocument => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const document = value as Partial<RichTextDocument>;
  return document.type === 'doc' && Array.isArray(document.content);
};

const collectText = (node: RichTextNode): string => {
  const ownText = typeof node.text === 'string' ? node.text : '';
  const childText = node.content?.map(collectText).join(' ') ?? '';
  return `${ownText} ${childText}`.trim();
};

export const richTextPreview = (
  document: RichTextDocument,
  maxLength = 90,
): string => {
  const text = collectText(document).replace(/\s+/g, ' ').trim();
  return text.length > maxLength
    ? `${text.slice(0, maxLength).trim()}…`
    : text;
};
