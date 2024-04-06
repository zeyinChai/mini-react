// 两个车道 1 2
const NoLanes = 0b00;
const NoLane = 0b00;
const SyncLanes = 0b01; // 1
const InputContinuousHydrationLane = 0b10; // 2

function isSubsetOfLanes(set,subset){
  return (set & subset) === subset
}
function mergeLanes(a,b){
  return a | b
}

function initializeUpdateQueue(fiber) {
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

function enqueueUpdate(fiber, update) {
  let updateQueue = fiber.updateQueue;
  const sharedQueue = updateQueue.shared;
  const pending = sharedQueue.pending;
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  sharedQueue.pending = update;
}

function processUpdateQueue(fiber, renderLanes) {
  const queue = fiber.updateQueue;
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
    let newState = queue.baseState
    let newLanes = NoLanes
    let newBaseState = null
    let newFirstBaseUpdate = null
    let newLastBaseUpdate = null
    let update = firstBaseUpdate
    do{
      const updateLane = update.lane
      if(!isSubsetOfLanes(renderLanes,updateLane)){
        const clone = {
          id:update.id,
          lane:updateLane,
          payload:update.payload
        }
        if(newLastBaseUpdate === null){
          // 让新的跳过的链表头和链表尾都指向这个第一次跳过的更新
          newFirstBaseUpdate = newLastBaseUpdate = clone
          newBaseState = newState
        }else{
          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }
        newLanes = mergeLanes(newLanes,updateLane)
      }else{
        if(newLastBaseUpdate !== null){
          const clone = {
            id:update.id,
            lane:NoLane,
            payload:update.payload
          }
          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }
        newState = getStateFromUpdate(update,newState)
      }
      update = update.next
    }while(update)
    if(!newLastBaseUpdate){
      newBaseState = newState
    }
    queue.baseState = newBaseState
    queue.firstBaseUpdate = newFirstBaseUpdate
    queue.lastBaseUpdate = newLastBaseUpdate
    fiber.lanes = newLanes
    fiber.memoizedState = newState
  }
}
function getStateFromUpdate(update,prevState){
  return update.payload(prevState)
}
// 演示如何给fiber添加不同优先级的更新
// 在执行渲染的时候总是找优先级最高的执行 跳过优先级低的
let fiber = {
  memoizedState: "",
};
initializeUpdateQueue(fiber);
let update1 = {
  id: "A",
  payload: (state) => state + "A",
  lane: InputContinuousHydrationLane,
};
enqueueUpdate(fiber, update1);
let update2 = { id: "B", payload: (state) => state + "B", lane: SyncLanes };
enqueueUpdate(fiber, update2);
let update3 = {
  id: "C",
  payload: (state) => state + "C",
  lane: InputContinuousHydrationLane,
};
enqueueUpdate(fiber, update3);
let update4 = { id: "D", payload: (state) => state + "D", lane: SyncLanes };
enqueueUpdate(fiber, update4);
// 处理更新队列 在处理的时候需要指定一个渲染优先级
processUpdateQueue(fiber, SyncLanes);
console.log(fiber.memoizedState); // BD
console.log('updateQueue',printUpdateQueue(fiber.updateQueue));
// 此时会把ABCD这个链表放到baseQueue
let update5 = {
  id: "E",
  payload: (state) => state + "E",
  lane: InputContinuousHydrationLane,
};
enqueueUpdate(fiber, update5);
let update6 = { id: "F", payload: (state) => state + "F", lane: SyncLanes };
enqueueUpdate(fiber, update6);
// pendingQueue = EF
// 处理更新队列 在处理的时候需要指定一个渲染优先级
processUpdateQueue(fiber, InputContinuousHydrationLane);
console.log(fiber.memoizedState);


function printUpdateQueue(updateQueue){
  const {baseState,firstBaseUpdate} = updateQueue
  let desc = baseState + '#'
  let update = firstBaseUpdate
  while(update){
    desc += (update.id+'=>')
    update = update.next
  }
  desc += 'null'
  console.log(desc);
}