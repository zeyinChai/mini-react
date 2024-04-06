import {
  scheduleCallback as Scheduler_scheduleCallback,
  shouldYield,
  NormalPriority as NormalSchedulePriority,
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
} from "./Scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";
import {
  NoFlags,
  Placement,
  mutationMask,
  Update,
  ChildDeletion,
  Passive,
} from "./ReactFiberFlags";
import {
  commitMutationsEffectsOnFiber,
  commitPassiveUnmountEffects,
  commitPassiveMountEffects,
} from "./ReactFiberCommitWork";
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./ReactWorkTags";
import { finishQueueingConcurrentUpdates } from "./ReactFiberConcurrentUpdates";
import {
  NoLanes,
  markRootUpdate,
  getNextLanes,
  getHighestPriorityLane,
  SyncLane,
  includesBlockingLane,
} from "./ReactFiberLane";
import {
  ContinuousEventPriority,
  DefaultEventPriority,
  DisCreateEventPriority,
  IdleEventPriority,
  getCurrentUpdatePriority,
  lanesToEventPriority,
  setCurrentUpdatePriority,
} from "./ReactEventPriorities";
import { getCurrentEventPriority } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import {
  scheduleSyncCallback,
  flushSyncCallbacks,
} from "./ReactFiberSyncTaskQueue";

let workInProgress = null;
let workInProgressRoot = null; // 正在构建中的根节点
let rootDoesHavePassiveEffect = false; // 根节点上有没有useEffect副作用
let rootWithPendingPassiveEffects = null; // 具有effect副作用的根节点 FiberRootNode
let workInProgressRenderLanes = NoLanes;

// 构建fiber树正在进行中
const RootInProgress = 0;
// 构建fiber树已经完成
const RootCompleted = 5;
// 当渲染工作结束的时候当前的fiber树处于什么状态
let workInProgressRootExitStatus = RootInProgress;

/**
 * 计划更新root
 * 源码有调度任务的功能
 * @param {*} root
 */
export function scheduleUpdateOnFiber(root, fiber, lane) {
  markRootUpdate(root, lane);
  // 确保调度执行root上的更新
  ensureRootIsScheduled(root);
}
function ensureRootIsScheduled(root) {
  // 获取当前优先级最高的车道
  const nextLanes = getNextLanes(root, NoLanes); // 16
  if (nextLanes === NoLanes) {
    return;
  }
  // 获取新的调度优先级
  let newCallbackPriority = getHighestPriorityLane(nextLanes);
  let newCallbackNode;
  // 如果新的优先级是同步的话
  if (newCallbackPriority === SyncLane) {
    // 先把performSyncWorkOnRoot添加到同步队列中
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    // 再把flushSyncCallbacks放入微任务
    queueMicrotask(flushSyncCallbacks);
    newCallbackNode = null;
  } else {
    // 如果不是同步就要调度一个新的任务
    let schedulerPriorityLevel;
    switch (lanesToEventPriority(nextLanes)) {
      case DisCreateEventPriority:
        schedulerPriorityLevel = ImmediateSchedulerPriority;
        break;
      case ContinuousEventPriority:
        schedulerPriorityLevel = UserBlockingSchedulerPriority;
        break;
      case DefaultEventPriority:
        schedulerPriorityLevel = NormalSchedulePriority;
        break;
      case IdleEventPriority:
        schedulerPriorityLevel = IdleSchedulerPriority;
        break;
      default:
        schedulerPriorityLevel = NormalSchedulePriority;
        break;
    }
    newCallbackNode = Scheduler_scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root)
    );
  }
  root.newCallbackNode = newCallbackNode;
  // if (workInProgressRoot) return;
  // workInProgressRoot = root;
}
function performSyncWorkOnRoot(root) {
  // 获得最高优的lane
  const lanes = getNextLanes(root);
  // 渲染新的fiber树
  renderRootSync(root, lanes);
  // 获取渲染完成的fiber根节点
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  commitRoot(root);
  return null;
}
function renderRootConcurrent(root, lanes) {
  if (workInProgressRoot !== root || workInProgressRenderLanes !== lanes) {
    prepareFreshStack(root, lanes);
  }
  // 在当前分配的时间片内执行fiber树的构建
  workLoopConcurrent();
  // 如果workInProgress不为null 说明fiber树的构建还没完成
  if (workInProgress !== null) {
    return RootInProgress;
  }
  // 如果workInProgress为null说明已经构建完成了
  return workInProgressRootExitStatus;
}
// 告诉浏览器要执行此函数
/**
 * 根据虚拟dom构建fiber树，要创建真实的dom节点，把真实的dom节点插入容器
 * @param {*} root
 */
function performConcurrentWorkOnRoot(root, didiTimeout) {
  console.log('performConcurrentWorkOnRoot');
  // 先过去当前根节点上的任务
  const originalCallbackNode = root.callbackNode;
  // 获取当前优先级最高的车道
  const lanes = getNextLanes(root, NoLanes); // 16
  if (lanes === NoLanes) {
    return null;
  }
  // 如果不包含阻塞的车道 并且没有超时 就可以并行渲染 就是启用时间分片
  // 默认更新车道是同步的
  const shouldTimeSlice = !includesBlockingLane(root, lanes) && !didiTimeout;
  console.log(shouldTimeSlice, "shouldTimeSlice");
  // 执行渲染得到退出的状态
  const exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes);
  // 如果不是渲染中的话 那说明肯定渲染完了
  if (exitStatus !== RootInProgress) {
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    commitRoot(root);
  }
  // 说明任务没有完成
  if (root.callbackNode === originalCallbackNode) {
    return performConcurrentWorkOnRoot.bind(null, root);
  }
  return null;
}
function flushPassiveEffect() {
  if (rootWithPendingPassiveEffects !== null) {
    const root = rootWithPendingPassiveEffects;
    // 卸载副作用
    commitPassiveUnmountEffects(root.current);
    // 执行挂载副作用
    commitPassiveMountEffects(root, root.current);
  }
}
function commitRoot(root) {
  // 暂存当前的更新优先级
  const previousUpdatePriority = getCurrentUpdatePriority();
  try {
    setCurrentUpdatePriority(DisCreateEventPriority);
    commitRootImpl(root);
  } finally {
    setCurrentUpdatePriority(previousUpdatePriority);
  }
}
function commitRootImpl(root) {
  const { finishedWork } = root;
  workInProgressRoot = null;
  workInProgressRenderLanes = null;
  root.callbackNode = null;
  printFinishedWork(finishedWork);
  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true;
      Scheduler_scheduleCallback(NormalSchedulePriority, flushPassiveEffect);
    }
  }
  // 判断子树有没有副作用
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & mutationMask) !== NoFlags;
  const rootHasEffects = (finishedWork.flags & mutationMask) !== NoFlags;
  // 如果自己有副作用或者子节点有副作用就进行提交dom操作
  if (subtreeHasEffects || rootHasEffects) {
    // 当dom执行变更之后
    commitMutationsEffectsOnFiber(finishedWork, root);
    // 执行layoutEffect TODO
    if (rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = false;
      rootWithPendingPassiveEffects = root;
    }
  }
  // 等dom变更后，就可以把让root的current指向最新的fiber树
  root.current = finishedWork;
}
function prepareFreshStack(root, renderLanes) {
  workInProgress = createWorkInProgress(root.current, null);
  workInProgressRenderLanes = renderLanes;
  workInProgressRoot = root;
  finishQueueingConcurrentUpdates();
}
function renderRootSync(root, renderLanes) {
  if (
    workInProgressRoot !== root ||
    workInProgressRenderLanes !== renderLanes
  ) {
    // 开始构建fiber树 见构建fiber.png
    prepareFreshStack(root, renderLanes);
  }
  // 工作循环
  workLoopSync();
}
function workLoopSync() {
  while (workInProgress !== null) {
    // 执行工作单元
    performUnitOfWork(workInProgress);
  }
}
// 并发渲染会判断时间 如果过期就在下一帧在构建fiber
function workLoopConcurrent() {
  // 如果有下一个要构建的fiber并且时间片么有过期
  while (workInProgress !== null && !shouldYield()) {
    // 在这里可以验证 分批构建fiber
    sleep(6);
    // 执行工作单元
    performUnitOfWork(workInProgress);
    console.log("shouldYield()", shouldYield(), workInProgress);
  }
}
/**
 * 执行一个工作单元
 * @param {*} unitOfWork
 */
function performUnitOfWork(unitOfWork) {
  // 获取新的fiber对应的老fiber
  const current = unitOfWork.alternate;
  // 完成当前fiber的子fiber链表构建    (构建子fiber并返回子fiber)
  const next = beginWork(current, unitOfWork, workInProgressRenderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    // 如果没有子节点表示当前的fiber已经结束了
    // workInProgress = null
    completeUnitOfWork(unitOfWork);
  } else {
    // 如果有子节点就让子节点成为下一个工作单元
    workInProgress = next;
  }
}

function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    // 执行此fiber的完成工作 如果是原生组件的话就是创建真实的dom节点
    completeWork(current, completedWork);
    // 如果有弟弟就构建弟弟对应的fiber子链表
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }
    // 如果没有弟弟就说明父fiber这就是最后一个节点了
    // 也就是说一个父fiber的所有子fiber全部完成了
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null); // 直到最顶层节点就推出
  // 如果走到这里 说明整个fiber树全部构建完成
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted;
  }
}

function printFinishedWork(fiber) {
  const { flags, deletions } = fiber;
  if ((flags & ChildDeletion) !== NoFlags) {
    fiber.flags &= ~ChildDeletion;
    console.log("子节点有要删除");
  }
  let child = fiber.child;
  while (child) {
    printFinishedWork(child);
    child = child.sibling;
  }
  if (fiber.flags !== 0) {
    console.log(
      getFlags(fiber),
      getTag(fiber.tag),
      typeof fiber.type === "function" ? fiber.type.name : fiber.type,
      fiber.memoizedProps
    );
  }
}
function getFlags(fiber) {
  const { flags, deletions } = fiber;
  if (flags === (Placement | Update)) {
    return "移动";
  }
  if (flags === Placement) {
    return "插入";
  }
  if (flags === Update) {
    return "更新";
  }
  return flags;
}
function getTag(tag) {
  switch (tag) {
    case FunctionComponent:
      return "FunctionComponent";
    case HostRoot:
      return "HostRoot";
    case HostComponent:
      return "HostComponent";
    case HostText:
      return "HostText";
    default:
      return tag;
  }
}

export function requestUpdateLane() {
  const updateLane = getCurrentUpdatePriority();
  if (updateLane !== NoLanes) {
    return updateLane;
  }
  const eventLane = getCurrentEventPriority();
  return eventLane;
}
function sleep(duration) {
  const timeStamp = new Date().getTime();
  const endTime = timeStamp + duration;
  while (true) {
    if (new Date().getTime() > endTime) {
      return;
    }
  }
}
