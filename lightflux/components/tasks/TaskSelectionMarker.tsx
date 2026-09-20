import type { ViewStyle } from 'react-native';

// “当前在右侧打开的任务”指示：只保留一抹很淡的圆角背景。
// 左侧竖条已按设计移除，描边与阴影也一并去掉，避免整块填得太满。
export const TASK_SELECTED_ROW_STYLE: ViewStyle = {
  backgroundColor: '#F2F1FC',
};
