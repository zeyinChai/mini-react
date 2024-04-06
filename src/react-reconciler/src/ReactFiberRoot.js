import { createHostRootFiber } from "./ReactFiber";
import {initialUpdateQueue} from './ReactFiberClassUpdateQueue'
import { NoLanes } from "./ReactFiberLane";
function FiberRootNode(containerInfo) {
  this.containerInfo = containerInfo; // div#root
  // 此根上有哪些赛道等待被处理
  this.pendingLanes = NoLanes
}
// FiberRootNode = containerInfo 本质就是一个真实的容器dom节点
export function createFiberRoot(containerInfo) {
  const root = new FiberRootNode(containerInfo);
  // 创建根fiber
  const uninitializedFiber = createHostRootFiber();
  //   根容器的current指向当前的根fiber
  root.current = uninitializedFiber;
  //   根fiber的stateNode也就是真实dom节点
  uninitializedFiber.stateNode = root;
  initialUpdateQueue(uninitializedFiber)
  return root;
}
