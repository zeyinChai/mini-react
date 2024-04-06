 function initialUpdateQueue(fiber) {
  // 创建一个新的更新队列
  //  pending其实是一个循环链表
  const queue = {
    shared: {
      pending: null,
    },
  };
  fiber.updateQueue = queue;
}
function createUpdate() {
  return {};
}
function enqueueUpdate(fiber, update) {
  const updateQueue = fiber.updateQueue;
  const shared = updateQueue.shared;
  const pending = shared.pending;
  if (pending === null) {
    // 如果pending为空的话 就让现在需要更新的队列自己指向自己
    update.next = update;
  } else {
    // 如果更新队列不为空的话，取出第一个更新
    update.next = pending.next;
    // 然后让原来队列的最后一个next指向新的next
    pending.next = update;
  }
  updateQueue.shared.pending = update;
}
function processUpdateQueue(fiber){
    const queue = fiber.updateQueue
    const pending = queue.shared.pending
    if(pending !== null){
        queue.shared.pending = null
        // 最后一个更新
        const lastPendingUpdate = pending
        const firstPendingUpdate = lastPendingUpdate.next
        // 把环状链表剪开
        lastPendingUpdate.next = null
        let newState = fiber.memoizedState
        let update = firstPendingUpdate
        while(update){
            newState = getStateFromUpdate(update,newState)
            update = update.next
        }
        fiber.memoizedState = newState
    }
}
function getStateFromUpdate(update,prevState){
    const payload = update.payload
    let partialState = payload(prevState)
    return Object.assign({},prevState,partialState)
}
let fiber = { memoizedState: { id: 1 } };
initialUpdateQueue(fiber);

let update1 = createUpdate();
update1.payload = { name: "zs" };
enqueueUpdate(fiber, update1);

let update2 = createUpdate();
update2.payload = { age: 14 };
enqueueUpdate(fiber, update2);

// 基于老状态计算新状态
processUpdateQueue(fiber)
console.log(fiber.memoizedState);