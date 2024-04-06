import ReactSharedInternals from "shared/ReactSharedInternals";
import { requestUpdateLane, scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";
import { enqueueConcurrentHookUpdate } from "./ReactFiberConcurrentUpdates";
import { Passive as PassiveEffect } from "./ReactFiberFlags";
import {
  HasEffect as HookHasEffect,
  Passive as HookPassive,
} from "./ReactHookEffectTags";
import { NoLanes } from "./ReactFiberLane";
const { ReactCurrentDispatcher } = ReactSharedInternals;

const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
  useEffect: mountEffect,
};
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useEffect: updateEffect,
};
let workInProgressHook = null;
let currentlyRenderingFiber = null; // 当前正在渲染中的fiber
let currentHook = null;

function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}
function updateEffectImpl(fiberFlags, hookFLags, create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy;
  if (currentHook !== null) {
    // 获取此useEffect这个hook上老的effect对象 create deps destroy
    const prevEffect = currentHook.memoizedState;
    destroy = prevEffect.destroy;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      // 新数组和老数组进行对比 如果一样的话就不需要执行了
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(hookFLags, create, destroy, nextDeps);
        return;
      }
    }
  }
  // 如果要执行的话 需要修改fiber的flags
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFLags,
    create,
    destroy,
    nextDeps
  );
}
function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) {
    return null;
  }
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}
function mountEffect(create, deps) {
  return mountEffectImpl(PassiveEffect, HookPassive, create, deps);
}
function mountEffectImpl(fiberFlags, hookFLags, create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  // 给当前的函数组件fiber添加flags
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFLags,
    create,
    undefined,
    nextDeps
  );
}
/**
 * 添加effect链表
 * @param {*} tag 标签
 * @param {*} create 创建方法
 * @param {*} destroy 销毁方法
 * @param {*} deps 依赖数组
 */
function pushEffect(tag, create, destroy, deps) {
  const effect = {
    tag,
    create,
    destroy,
    deps,
    next: null,
  };
  let compoentUpdateQueue = currentlyRenderingFiber.updateQueue;
  if (compoentUpdateQueue === null) {
    compoentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = compoentUpdateQueue;
    compoentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = compoentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      compoentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      compoentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}
function createFunctionComponentUpdateQueue() {
  return {
    lastEffect: null,
  };
}
function baseStateReducer(state, action) {
  return typeof action === "function" ? action(state) : action;
}

function updateState() {
  return updateReducer(baseStateReducer);
}

function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialState;
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: baseStateReducer, // 上一个reducer
    lastRenderedState: initialState, // 上一个state
  };
  hook.queue = queue;
  const dispatch = (queue.dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue
  ));
  return [hook.memoizedState, dispatch];
}
// 执行setState
function dispatchSetState(fiber, queue, action) {
  // 获取当前的更新赛道
  const lane = requestUpdateLane();
  const update = {
    lane, // 本次更新优先级就是1
    action,
    next: null,
    hasEagerState: false, // 是否有急切的更新
    eagerState: null, // 急切的更新状态
  };
  // 执行setState会将本次的这个useState的queue和update存起来
  // 在后面scheduleUpdateOnFiber执行后进入到updateState中循环链表会取出来进行执行
  // 所以不能在if中写useState因为存的时候是 根据索引存储 以及 函数组件重新执行useState要更新值
  //    updateState取出来执行如果发现少了一个useState会导致数据无法更新 以及 扰乱后续useState的值
  const alternate = fiber.alternate;
  // if (
  //   fiber.lanes === NoLanes &&
  //   (alternate === null || alternate.lanes == NoLanes)
  // ) {
  //   const { lastRenderedReducer, lastRenderedState } = queue;
  //   const eagerState = lastRenderedReducer(lastRenderedState, action);
  //   update.hasEagerState = true;
  //   update.eagerState = eagerState;
  //   if (Object.is(eagerState, lastRenderedState)) {
  //     return;
  //   }
  // }
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  scheduleUpdateOnFiber(root, fiber, lane);
}
/**
 * 构建新的hooks
 */
function updateWorkInProgressHook() {
  // 获取将来构建的新的hook的老hook
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    currentHook = current.memoizedState;
  } else {
    currentHook = currentHook.next;
  }
  // 根据老hook创建新hook
  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
  };
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
  } else {
    workInProgressHook = workInProgressHook.next = newHook;
  }
  return workInProgressHook;
}
function updateReducer(reducer) {
  // 获取新的hook
  const hook = updateWorkInProgressHook();
  console.log(hook, "hook");
  // 获取新的hook的更新队列
  const queue = hook.queue;
  // 获取老的hook
  const current = currentHook;
  // 获取将要生效的更新队列
  const penddingQueue = queue.pending;
  // 初始化一个新状态 取值为当前的状态
  let newState = current.memoizedState;
  if (penddingQueue !== null) {
    queue.pending = null;
    const firstUpdate = penddingQueue.next;
    let update = firstUpdate;
    // 取出当前useState中执行setState的顺序函数进行更新
    do {
      if (update.hasEagerState) {
        newState = update.eagerState;
      } else {
        const action = update.action;
        newState = reducer(newState, action);
      }
      update = update.next;
    } while (update !== null && update !== firstUpdate);
  }
  hook.memoizedState = newState;
  return [hook.memoizedState, queue.dispatch];
}
function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialArg;
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialArg,
  };
  hook.queue = queue;
  const dispatch = (queue.dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue
  ));
  return [hook.memoizedState, dispatch];
}
/**
 * 执行派发动作的方法，它要更新状态，并且让界面重新更新（重新执行scheduleUpdateOnFiber）
 * @param {*} fiber function对应的fiber
 * @param {*} queue hook对应的更新队列
 * @param {*} action 派发的动作
 */
function dispatchReducerAction(fiber, queue, action) {
  // 在每个hook里会存放一个更新队列 更新队列是一个更新对象的循环链表
  const update = {
    action, // { type: "add", payload: 1 }
    next: null,
  };
  // 把当前的最新的更添的添加更新队列中，并且返回当前的根
  const root = enqueueConcurrentHookUpdate(fiber, queue, update);
  scheduleUpdateOnFiber(root);
}
/**
 * 挂载构建中的hook
 */
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null, // hook的状态 0
    queue: null, // 存放hook的更新队列 queue.pending=update循环链表
    next: null, // 指向下一个hook，一个函数里面可能会有多个hook，它们会组成一个单向链表
  };
  if (workInProgressHook === null) {
    // 当前函数对应的fiber的状态等于第一个hook对象
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
/**
 * 渲染函数组件
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} Compoent 组件定义
 * @param {*} props 组件属性
 * @returns 虚拟dom或者React元素
 */
export function renderWithHooks(current, workInProgress, Compoent, props) {
  currentlyRenderingFiber = workInProgress; // Fuction组件对应的fiber
  workInProgress.updateQueue = null;
  // 如果有老的fiber并且有老的hook链表
  if (current !== null && current.memoizedState !== null) {
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  }
  // 需要在函数执行前给ReactcurrentDispatcher.current赋值
  const children = Compoent(props);
  currentlyRenderingFiber = null;
  workInProgress = null;
  currentHook = null;
  return children;
}
