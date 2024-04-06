import {
  IdlePriority,
  ImmediatePriority,
  LowPriority,
  NormalPriority,
  UserBlockingPriority,
} from "./SchedulerPriorities";
import { push,peek,pop } from "./SchedulerMinHeap";

function getCurrentTime() {
  return performance.now();
}
var maxSigned31BitInt = 1073741823;
// 立即过期
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// 用户阻塞操作优先级
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
// 正常的优先级的过期时间
var NORMAL_PRIORITY_TIMEOUT = 5000;
// 低优先级的过期时间
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;
// 任务id计数器
let taskIdCounter = 1;
// 任务最小堆
const taskQueue = [];
let schedulerHostCallback = null;
let startTime = null;
let currentTask = null;
// react每一帧向浏览器申请5毫秒用于自己任务执行
// 如果5毫秒没有完成 react会放弃控制权，把控制权交给浏览器
const frameInterval = 5;

const channel = new MessageChannel();
var port2 = channel.port2;
var port1 = channel.port1;
port1.onmessage = performWorkUntilDeadline;

/**
 * 按照优先级执行任务
 * @param {*} priorityLevel
 * @param {*} callback
 */
 function schedulerCallback(priorityLevel, callback) {
  // 获取当前的时间
  const currentTime = getCurrentTime();
  //   此任务的开始时间
  const startTime = currentTime;
  //   超时时间
  let timeout;
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }
  //   计算此任务的过期时间
  const expirationTime = startTime + timeout;
  const newTask = {
    id: taskIdCounter++,
    callback, // 回调函数
    priorityLevel, //优先级别
    startTime, // 任务开始时间
    expirationTime, //任务过期时间
    sortIndex: expirationTime, // 排序依赖
  };
  //   向任务最小堆里添加任务，排序依据是过期时间
  push(taskQueue, newTask);
  //   flushWork执行工作、刷新工作
  requsetHostCallback(workLoop);
  return newTask;
}
function workLoop(startTime) {
  let currentTime = startTime;
  // 取出优先级最高的任务
  currentTask = peek(taskQueue);
  while (currentTask !== null) {
    // 如果此任务的过期时间小于当前时间 也就是说没有过期 并且需要放弃执行
    // 如果任务过期了必须要执行
    if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      break;
    }
    const callback = currentTask.callback;
    if (typeof callback === "function") {
      currentTask.callback = null;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime
      const continuationCallback = callback(didUserCallbackTimeout);
      if (typeof continuationCallback === "function") {
        currentTask.callback = continuationCallback;
        return true; // 还有任务要执行
      }
      // 如果此任务已经完成 则不需要在执行了 可以把此任务弹出去
      if (currentTask === peek(taskQueue)) {
        pop(taskQueue);
      }
    } else {
      pop(taskQueue);
    }
    // 如果当前的任务执行完了 就取下一个任务执行
    currentTask = peek(taskQueue);
  }
  // 如果循环结束还有未完成的任务那就表示hasMoreWork=true
  if (currentTask !== null) {
    return true;
  }
  // 没有任务要完成的任务了
  return false;
}
function shouldYieldToHost() {
  // 用当前时间减去开始的时间就是过去的时间
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameInterval) {
    return false;
  }
  return true;
}
function requsetHostCallback(workLoop) {
  schedulerHostCallback = workLoop;
  // 执行工作直到截止时间
  schedulePerformWorkUntilDeadline();
}
function schedulePerformWorkUntilDeadline() {
  port2.postMessage(null);
}
function performWorkUntilDeadline() {
  if (schedulerHostCallback) {
    // 获取开始执行任务的时间
    startTime = getCurrentTime();
    // 是否有更多的工作要做
    let hasMoreWork = true;
    try {
      // 执行flushWork并判断有没有返回值 有返回值代表任务没有完成 
      //    先让出线程然后再异步的 触发postmessage
      hasMoreWork = schedulerHostCallback(startTime);
    } finally {
      // 执行完以后如果为true说明还有更多工作要做
      if (hasMoreWork) {
        // 继续执行
        schedulePerformWorkUntilDeadline();
      } else {
        schedulerHostCallback = null;
      }
    }
  }
}
export {
  schedulerCallback as unstable_scheduleCallback,
  shouldYieldToHost as unstable_shouldYield,
  IdlePriority as unstable_IdlePriority,
  ImmediatePriority as unstable_ImmediatePriority,
  LowPriority as unstable_LowPriority,
  NormalPriority as unstable_NormalPriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
};
