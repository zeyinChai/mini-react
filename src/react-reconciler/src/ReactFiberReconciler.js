import { createFiberRoot } from "./ReactFiberRoot";
import { createUpdate, enqueueUpdate } from "./ReactFiberClassUpdateQueue";
import {scheduleUpdateOnFiber,requestUpdateLane} from './ReactFiberWorkLoop'
export function createContainer(containerInfo) {
  return createFiberRoot(containerInfo);
}
/**
 * 更新容器，把虚拟dom element变成真实dom插入到container容器中
 * @param {*} element 虚拟dom
 * @param {*} container dom容器 FiberRootNode
 */
export function updateContainer(element, container) {
  // current是根fiber
  const current = container.current;
  // 请求一个更新车道
  const lane = requestUpdateLane(current)
  // 创建更新
  const update = createUpdate(lane);
  // 要更新的虚拟dom
  update.payload = { element }; // h1
  // 把本次更新对象 添加到这个根Fiber的更新队列上,返回根节点
  const root = enqueueUpdate(current, update,lane);
  scheduleUpdateOnFiber(root,current,lane)
}
