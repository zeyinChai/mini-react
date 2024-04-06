import { allowConcurrentByDefault } from "shared/ReactFeatureFlags";
export const TotalLanes = 31;

export const NoLanes = 0b0000000000000000000000000000000;
export const NoLane = 0b0000000000000000000000000000000;

export const SyncLane = 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane = 0b0000000000000000000000000000010;
export const InputContinuousLane = 0b0000000000000000000000000000100;

export const DefaultHydrationLane = 0b0000000000000000000000000001000;
export const DefaultLane = 0b0000000000000000000000000010000;

const RetryLane1 = 0b0000000010000000000000000000000;

export const SomeRetryLane = RetryLane1;

export const SelectiveHydrationLane = 0b0001000000000000000000000000000;

export const IdleHydrationLane = 0b0010000000000000000000000000000;
export const IdleLane = 0b0100000000000000000000000000000;

export const OffscreenLane = 0b1000000000000000000000000000000;

const NonIdleLanes = 0b0001111111111111111111111111111;

export function markRootUpdate(root, updateLane) {
  // 此根上等待生效的lane
  root.pendingLanes |= updateLane;
}

export function getNextLanes(root) {
  // 获取所有有更新的车道
  const pendingLanes = root.pendingLanes;
  if (pendingLanes == NoLanes) {
    return NoLanes;
  }
  const nextLanes = getHighestPriorityLanes(pendingLanes);
  return nextLanes;
}

function getHighestPriorityLanes(lanes) {
  return getHighestPriorityLane(lanes);
}
// 找到最右边的1  只能返回一个车道  6: 0110   -6: 1010    0010
export function getHighestPriorityLane(lanes) {
  return lanes & -lanes;
}

export function includesNonIdleWork(lanes) {
    return (lanes & NonIdleLanes) !== NoLanes
}


export function includesBlockingLane(root,lanes){
  // 如果允许默认并发渲染
  if(allowConcurrentByDefault){
    return false
  }
  const SyncDefaultLanes = InputContinuousLane | DefaultLane
  return (lanes & SyncDefaultLanes) !== NoLane
}