import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { inputAccentProps } from '../../config/input';
import { Translation } from '../../content';

interface TaskComposerProps {
  dateKey: string;
  focusRequestId?: number;
  labels: Pick<Translation, 'addTask' | 'inputPlaceholder'>;
  onCreate: (title: string, dateKey: string) => void;
}

/**
 * The "add a task" field for the Today screen.
 *
 * The draft lives here rather than in the screen: it changes on every
 * keystroke, so keeping it local means typing only re-renders the composer
 * instead of the whole task list.
 */
const TaskComposer = ({
  dateKey,
  focusRequestId,
  labels,
  onCreate,
}: TaskComposerProps) => {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);
  const canAdd = draft.trim().length > 0;

  useEffect(() => {
    if (!focusRequestId) {
      return undefined;
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [focusRequestId]);

  const submit = () => {
    const title = draft.trim();
    if (!title) {
      return;
    }
    onCreate(title, dateKey);
    setDraft('');
    Keyboard.dismiss();
  };

  return (
    <View
      className="mb-5 flex-row items-center rounded-[20px] border border-[#E8E7EF] bg-surface p-[7px] pl-[17px]"
      nativeID="today-task-composer"
      style={styles.composerShadow}
    >
      <TextInput
        {...inputAccentProps}
        accessibilityLabel={labels.inputPlaceholder}
        className="min-h-[46px] flex-1 py-2.5 text-[15px] text-[#292A3D]"
        maxLength={120}
        onChangeText={setDraft}
        onSubmitEditing={submit}
        placeholder={labels.inputPlaceholder}
        placeholderTextColor="#9297A8"
        ref={inputRef}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        value={draft}
      />
      <Pressable
        accessibilityLabel={labels.addTask}
        accessibilityRole="button"
        className={`ml-2.5 h-11 flex-row items-center justify-center rounded-[15px] px-3.5 ${
          canAdd ? 'bg-primary' : 'bg-[#C8C5DD]'
        }`}
        disabled={!canAdd}
        onPress={submit}
        style={({ pressed }) => [pressed && canAdd && styles.addButtonPressed]}
      >
        <Text className="mr-1 text-[17px] font-medium text-white">＋</Text>
        <Text className="text-[13px] font-semibold text-white">
          {labels.addTask}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  addButtonPressed: {
    backgroundColor: '#574ACD',
    transform: [{ scale: 0.98 }],
  },
  composerShadow: {
    shadowColor: '#45435F',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 13,
  },
});

export default React.memo(TaskComposer);
