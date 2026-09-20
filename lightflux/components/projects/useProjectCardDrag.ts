// 非 web 平台不提供项目卡片拖拽（iOS/Android 已冻结），返回空绑定即可。
// 参数与 web 版保持一致，便于共享组件以同一方式调用。
export const useProjectCardDrag = (
  _args?: unknown,
): {
  bind: Record<string, never>;
  dragging: boolean;
  offset: number;
} => ({
  bind: {},
  dragging: false,
  offset: 0,
});
