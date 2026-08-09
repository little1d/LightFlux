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
    <Text className="text-[9px] font-bold text-[#9696A3]">
      {children}
    </Text>
  </View>
);

const TaskIndicators = ({ todo, childCount }: TaskIndicatorsProps) => {
  const hasImage = hasNodeType(todo, 'image');
  const hasCode = hasNodeType(todo, 'codeBlock');
  const hasDetails = todo.content.content.some(
    (node) => node.type !== 'paragraph' || Boolean(node.content?.length),
  );

  return (
    <View className="flex-row items-center">
      {childCount > 0 ? <Indicator>↳{childCount}</Indicator> : null}
      {hasCode ? <Indicator>{'{ }'}</Indicator> : null}
      {hasImage ? <Indicator>▧</Indicator> : null}
      {hasDetails && !hasCode && !hasImage ? <Indicator>▤</Indicator> : null}
    </View>
  );
};

export default TaskIndicators;
