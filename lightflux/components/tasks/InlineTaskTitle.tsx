import { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';

import { inputAccentProps } from '../../config/input';
import { Todo } from '../../types/todo';

// Shared inline title editor used by both the Groups and Today lists so a task
// title can be renamed directly on its row. Opening details is optional: the
// Today list keeps the composer focused without pulling up the editor pane, so
// callers decide whether typing/focus also opens the details view.
const InlineTaskTitle = ({
  editLabel,
  nested,
  onCreateNext,
  onOpenDetails,
  onRename,
  openDetailsOnEdit = true,
  todo,
}: {
  editLabel: string;
  nested: boolean;
  onCreateNext?: () => void;
  onOpenDetails?: () => void;
  onRename: (title: string) => void;
  openDetailsOnEdit?: boolean;
  todo: Todo;
}) => {
  const [draft, setDraft] = useState(todo.title);
  const [focused, setFocused] = useState(false);
  const detailsOpened = useRef(false);

  useEffect(() => {
    if (!focused) {
      setDraft(todo.title);
    }
  }, [focused, todo.title]);

  const commit = () => {
    const title = draft.trim();
    setFocused(false);
    detailsOpened.current = false;
    if (title) {
      setDraft(title);
      onRename(title);
    } else {
      setDraft(todo.title);
    }
  };

  const openDetails = () => {
    if (!openDetailsOnEdit || !onOpenDetails) {
      return;
    }
    if (!detailsOpened.current) {
      detailsOpened.current = true;
      onOpenDetails();
    }
  };

  return (
    <TextInput
      {...inputAccentProps}
      accessibilityLabel={`${editLabel}: ${todo.title}`}
      className={`${nested ? 'ml-2.5' : 'ml-3'} h-9 flex-1 border-0 bg-transparent px-1 py-0 text-[13px] font-semibold ${
        todo.completed ? 'text-[#A1A2AD] line-through' : 'text-[#303145]'
      }`}
      maxLength={160}
      nativeID={`task-title-${todo.id}`}
      onBlur={commit}
      onChangeText={(value) => {
        openDetails();
        setDraft(value);
        if (value.trim()) {
          onRename(value);
        }
      }}
      onFocus={() => {
        setFocused(true);
        openDetails();
      }}
      onPointerDown={openDetails}
      onPressIn={openDetailsOnEdit ? () => requestAnimationFrame(openDetails) : undefined}
      onSubmitEditing={() => {
        commit();
        if (onCreateNext) {
          requestAnimationFrame(onCreateNext);
        }
      }}
      returnKeyType="done"
      value={draft}
    />
  );
};

export default InlineTaskTitle;
