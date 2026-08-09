import React from 'react';
import { Text, View } from 'react-native';

import { TaskEditorScreenProps } from './TaskEditorScreen.types';

const TaskEditorScreen = (_props: TaskEditorScreenProps) => (
  <View className="flex-1 items-center justify-center bg-canvas px-6">
    <Text className="text-center text-sm text-[#77798A]">
      This platform does not provide a rich-text editor.
    </Text>
  </View>
);

export default TaskEditorScreen;
