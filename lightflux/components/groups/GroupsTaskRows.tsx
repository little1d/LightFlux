import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { inputAccentProps } from '../../config/input';
import { Todo } from '../../types/todo';
import TaskIndicators from '../tasks/TaskIndicators';
import TaskPriorityIndicator, {
  TASK_PRIORITY_THEME,
} from '../tasks/TaskPriorityIndicator';
import {
  TaskCheckbox,
  TaskMoreButton,
  TaskNestingIndicator,
} from '../tasks/TaskRowControls';
import TaskSelectionMarker, {
  TASK_SELECTED_ROW_STYLE,
} from '../tasks/TaskSelectionMarker';
import {
  OpenTaskMenu,
  useTaskContextMenu,
} from '../tasks/useTaskContextMenu';

const InlineTaskTitle = ({
  editLabel,
  nested,
  onCreateNext,
  onOpenDetails,
  onRename,
  todo,
}: {
  editLabel: string;
  nested: boolean;
  onCreateNext: () => void;
  onOpenDetails: () => void;
  onRename: (title: string) => void;
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
      onPressIn={() => requestAnimationFrame(openDetails)}
      onSubmitEditing={() => {
        commit();
        requestAnimationFrame(onCreateNext);
      }}
      returnKeyType="done"
      value={draft}
    />
  );
};

export const InlineTaskComposer = ({
  draft,
  nested,
  onCancel,
  onChange,
  onSubmit,
  placeholder,
}: {
  draft: string;
  nested: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) => (
  <View
    className={`${nested ? 'ml-6 min-h-[40px]' : 'min-h-[48px]'} my-0.5 flex-row items-center rounded-[10px] border border-[#DDD9F0] bg-[#F8F7FF] px-2`}
    nativeID="inline-task-composer"
  >
    {nested ? (
      <Text className="mr-1.5 text-[12px] text-[#9D9AAB]">↳</Text>
    ) : null}
    <View className="h-5 w-5 rounded-[7px] border-[1.5px] border-[#C5C2D4]" />
    <TextInput
      {...inputAccentProps}
      accessibilityLabel={placeholder}
      autoFocus
      className="ml-3 h-9 flex-1 border-0 bg-transparent px-1 py-0 text-[13px] font-semibold text-[#303145]"
      maxLength={160}
      onChangeText={onChange}
      onKeyPress={(event) => {
        if (event.nativeEvent.key === 'Escape') {
          onCancel();
        }
      }}
      onSubmitEditing={onSubmit}
      placeholder={placeholder}
      placeholderTextColor="#9A98A8"
      returnKeyType="done"
      value={draft}
    />
  </View>
);

export const GroupTask = ({
  childCount,
  editLabel,
  markActive,
  markComplete,
  moreActionsLabel,
  nested,
  onCreateNext,
  onEdit,
  onOpenMenu,
  onRename,
  onToggle,
  selected,
  todo,
}: {
  childCount: number;
  editLabel: string;
  markActive: string;
  markComplete: string;
  moreActionsLabel: string;
  nested: boolean;
  onCreateNext: () => void;
  onEdit: (id: string) => void;
  onOpenMenu: OpenTaskMenu;
  onRename: (id: string, title: string) => void;
  onToggle: (id: string) => void;
  selected: boolean;
  todo: Todo;
}) => {
  const { targetRef, openFromButton } = useTaskContextMenu(
    todo.id,
    onOpenMenu,
  );

  return (
    <View
      accessibilityState={{ selected }}
      className={`${nested ? 'ml-6 min-h-[40px] px-2' : 'min-h-[48px] px-2'} my-0.5 flex-row items-center border-b ${
        selected
          ? nested
            ? 'rounded-[8px] border-transparent bg-[#F6F4FF]'
            : 'rounded-[12px] border-transparent bg-[#EEECFF]'
          : 'border-[#ECECF1]'
      }`}
      nativeID={`group-task-${todo.id}`}
      ref={targetRef}
      style={[
        !selected &&
          todo.priority !== 'none' && {
            backgroundColor:
              TASK_PRIORITY_THEME[todo.priority].rowBackground,
          },
        selected && TASK_SELECTED_ROW_STYLE,
      ]}
    >
      <TaskSelectionMarker visible={selected} />
      {nested ? <TaskNestingIndicator /> : null}
      <TaskCheckbox
        completed={todo.completed}
        markActive={markActive}
        markComplete={markComplete}
        onPress={() => onToggle(todo.id)}
        uncheckedBorderColor="#BFC1CB"
      />
      <InlineTaskTitle
        editLabel={editLabel}
        nested={nested}
        onCreateNext={onCreateNext}
        onOpenDetails={() => onEdit(todo.id)}
        onRename={(title) => onRename(todo.id, title)}
        todo={todo}
      />
      <TaskPriorityIndicator priority={todo.priority} />
      <TaskIndicators childCount={childCount} todo={todo} />
      <TaskMoreButton
        label={moreActionsLabel}
        onPress={openFromButton}
      />
    </View>
  );
};
