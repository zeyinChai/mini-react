import {
  DefaultLane,
  IdleLane,
  InputContinuousLane,
  NoLane,
  SyncLane,
  getHighestPriorityLane,
  includesNonIdleWork
} from "./ReactFiberLane";
// 默认事件车道
export const DefaultEventPriority = DefaultLane; // 16
// 离散事件优先级
export const DisCreateEventPriority = SyncLane; // 1
// 连续事件优先级
export const ContinuousEventPriority = InputContinuousLane; // 4
// 空闲事件优先级
export const IdleEventPriority = IdleLane;

let currentUpdatePriority = NoLane;

export function getCurrentUpdatePriority() {
  return currentUpdatePriority;
}

export function setCurrentUpdatePriority(newPriority) {
  currentUpdatePriority = newPriority;
}

export function isHigherEventPriority(a, b) {
  return a !== b && a < b;
}
/**
 * 把lane转成事件优先级  lane有31个 调度优先级有5个
 * @param {*} lanes 
 * @returns 
 */
export function lanesToEventPriority(lanes) {
  const lane = getHighestPriorityLane(lanes);
  if (!isHigherEventPriority(DisCreateEventPriority, lane)) {
    return DisCreateEventPriority;
  }
  if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
    return ContinuousEventPriority;
  }
  if (includesNonIdleWork(lane)) {
    return DefaultEventPriority;
  }
  return IdleEventPriority;
}
