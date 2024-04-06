export const NoFlags = 0b00000000000000000000000000;
export const PerformedWork = 0b00000000000000000000000001;
export const Placement = 0b00000000000000000000000010; // 插入
export const Update = 0b00000000000000000000000100;
export const ChildDeletion = 0b00000000000000000000001000
export const mutationMask = Placement | Update | ChildDeletion
// 如果函数组件使用了useEffect那么此函数组件身上会有一个flags 1024
export const Passive = 0b00000000000000010000000000