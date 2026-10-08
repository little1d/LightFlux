import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import { Todo } from '../../types/todo';

const hasNodeType = (todo: Todo, type: string): boolean => {
  const visit = (
    nodes: typeof todo.content.content | undefined,
  ): boolean =>
    nodes?.some(
      (node) => node.type === type || visit(node.content),
    ) ?? false;

  return visit(todo.content.content);
};

interface TaskIndicatorsProps {
  todo: Todo;
  childCount: number;
}

const Indicator = ({ children }: { children: React.ReactNode }) => (
  <View className="ml-2 items-center justify-center">
    <Text className="text-[9px] font-medium text-[#9696A3]">
      {children}
    </Text>
  </View>
);

const TimeIndicator = ({ value }: { value: string }) => (
  <View className="ml-2 flex-row items-center">
    <Ionicons color="#8A8998" name="time-outline" size={11} />
    <Text className="ml-0.5 text-[9px] font-semibold text-[#777786]">
      {value}
    </Text>
  </View>
);

const TaskIndicators = ({ todo, childCount }: TaskIndicatorsProps) => {
  const hasImage = hasNodeType(todo, 'image');
  const hasCode = hasNodeType(todo, 'codeBlock');

  return (
    <View className="flex-row items-center">
      {todo.scheduledTime ? (
        <TimeIndicator value={todo.scheduledTime} />
      ) : null}
      {childCount > 0 ? <Indicator>↳{childCount}</Indicator> : null}
      {hasCode ? <Indicator>{'{ }'}</Indicator> : null}
      {hasImage ? <Indicator>▧</Indicator> : null}
    </View>
  );
};

export default TaskIndicators;
