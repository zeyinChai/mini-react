// 每种虚拟dom都会对应自己的fiber tag类型
// 根fiber的tag类型
// 后面会讲到组件，组件分为类组件和函数组件，因为一开始我们不知道
export const FunctionComponent = 0 // 函数组件
export const ClassComponent = 1 // 函数组件
export const IndeterminateComponent = 2
export const HostRoot = 3 // 容器根节点
export const HostComponent = 5 // 原生组件
export const HostText = 6 // 纯文本节点