import { enqueueConcurrentClassUpdate } from "./ReactFiberConcurrentUpdates";
import assign from "shared/assign";
import { NoLanes } from "./ReactFiberLane";
export const UpdateState = 0;
export function initialUpdateQueue(fiber) {
  // 创建一个新的更新队列
  //  pending其实是一个循环链表
  const queue = {
    baseState: fiber.memoizedState, // 当前fiber的状态，更新会基于它进行计算状态
    firstBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链表头
    lastBaseUpdate: null, // 本次更新前该fiber上保存的上次跳过的更新链表尾
    shared: {
      pending: null,
    },
  };
  fiber.updateQueue = queue;
}
export function createUpdate(lane) {
  const update = { tag: UpdateState, lane, next: null };
  return update;
}
// 图解见update队列.png
export function enqueueUpdate(fiber, update, lane) {
  const updateQueue = fiber.updateQueue;
  const sharedQueue = updateQueue.shared;
  return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);
}
/**
 * 根据老状态和更新队列中的更新计算最新的状态
 * @param {*} workInProgress 需要计算的fiber
 */
// export function processUpdateQueue(workInProgress) {
//   const queue = workInProgress.updateQueue;
//   const pendingQueue = queue.shared.pending;
//   // 如果有更新 或者说更新队列里有内容
//   if (pendingQueue !== null) {
//     // 清除等待生效的更新
//     queue.shared.pending = null;
//     // 获取更新队列中最后一个更新 update = {payload:{element:'h1'}}
//     const lastPendingUpdate = pendingQueue;
//     // 拿到一个更新
//     const firstPendingUpdate = lastPendingUpdate.next;
//     // 更新链表给解开 变成一个单链表
//     lastPendingUpdate.next = null;
//     // 获取老状态 null
//     let newState = workInProgress.memoizedState;
//     let update = firstPendingUpdate;
//     while (update) {
//       // 根据老状态和更新计算新状态
//       newState = getStateFromUpdate(update, newState);
//       update = update.next;
//     }
//     // console.log('newState',newState); // {payload:{element:'h1'}}
//     // 把最终计算出的状态 赋值给memoizedState
//     workInProgress.memoizedState = newState;
//   }
// }
export function processUpdateQueue(workInProgress, nextProps, renderLanes) {
  const queue = workInProgress.updateQueue;
  // 老链表头
  let firstBaseUpdate = queue.firstBaseUpdate;
  // 老链表尾
  let lastBaseUpdate = queue.lastBaseUpdate;
  // 新链表尾
  const pendingQueue = queue.shared.pending;
  if (pendingQueue !== null) {
    queue.shared.pending = null;
    // 新链表尾
    const lastPendingUpdate = pendingQueue;
    // 新链表尾
    const firstPendingUpdate = lastPendingUpdate.next;
    // 间断变成单链表
    lastPendingUpdate.next = null;
    // 如果没有老链表
    if (lastBaseUpdate === null) {
      // 指向新的链表头
      firstBaseUpdate = firstPendingUpdate;
    } else {
      lastBaseUpdate.next = firstPendingUpdate;
    }
    lastBaseUpdate = lastPendingUpdate;
  }
  if (firstBaseUpdate !== null) {
    // 上次跳过的更新前的状态
    let newState = queue.baseState;
    let newLanes = NoLanes;
    let newBaseState = null;
    let newFirstBaseUpdate = null;
    let newLastBaseUpdate = null;
    let update = firstBaseUpdate;
    do {
      const updateLane = update.lane;
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        const clone = {
          id: update.id,
          lane: updateLane,
          payload: update.payload,
        };
        if (newLastBaseUpdate === null) {
          // 让新的跳过的链表头和链表尾都指向这个第一次跳过的更新
          newFirstBaseUpdate = newLastBaseUpdate = clone;
          newBaseState = newState;
        } else {
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }
        newLanes = mergeLanes(newLanes, updateLane);
      } else {
        if (newLastBaseUpdate !== null) {
          const clone = {
            id: update.id,
            lane: NoLane,
            payload: update.payload,
          };
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }
        newState = getStateFromUpdate(update, newState);
      }
      update = update.next;
    } while (update);
    if (!newLastBaseUpdate) {
      newBaseState = newState;
    }
    queue.baseState = newBaseState;
    queue.firstBaseUpdate = newFirstBaseUpdate;
    queue.lastBaseUpdate = newLastBaseUpdate;
    workInProgress.lanes = newLanes;
    workInProgress.memoizedState = newState;
  }
}
/**
 * 根据老状态和更新计算新状态
 * @param {*} update 更新的对象其实有很多类型
 * @param {*} prevState
 */
function getStateFromUpdate(update, prevState, nextProps) {
  switch (update.tag) {
    case UpdateState:
      const { payload } = update;
      let partialState;
      if (typeof payload === "function") {
        prevState = payload.call(null, prevState, nextProps);
      }else{
        partialState = payload
      }
      return assign({}, prevState, partialState); // 合并状态
  }
}

export function cloneUpdateQueue(current, workInProgress) {
  const workInProgressQueue = workInProgress.updateQueue;
  const currentQueue = current.updateQueue;
  if (workInProgressQueue === currentQueue) {
    const clone = {
      baseState: currentQueue.baseState,
      firstBaseUpdate: currentQueue.firstBaseUpdate,
      lastBaseUpdate: currentQueue.lastBaseUpdate,
      shared: currentQueue.shared,
    };
    workInProgress.updateQueue = clone;
  }
}
function isSubsetOfLanes(set, subset) {
  return (set & subset) === subset;
}
function mergeLanes(a, b) {
  return a | b;
}
