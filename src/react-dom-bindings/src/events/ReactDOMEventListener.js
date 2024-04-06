import getEventTarget from "./getEventTarget";
import { getClosestInstanceFromNode } from "../client/ReactDOMComponentTree.js";
import { dispatchEventForPluginEventSystem } from "./DOMPluginEventSystem";
import {
  ContinuousEventPriority,
  DefaultEventPriority,
  DisCreateEventPriority,
  getCurrentUpdatePriority,
  setCurrentUpdatePriority,
} from "react-reconciler/src/ReactEventPriorities";
export function createEventListenerWrapperWithPriority(
  targetContainer,
  domEventName,
  eventSystemFlags
) {
  const listenerWrapper = dispatchDiscretEvent;
  return listenerWrapper.bind(
    null,
    domEventName,
    eventSystemFlags,
    targetContainer
  );
}
/**
 * 派发离散的事件的监听函数
 * @param {*} domEventName 事件名 click
 * @param {*} eventSystemFlags 节点 0冒泡 4捕获
 * @param {*} container 容器div#root
 * @param {*} nativeEvent 原生的事件 就是event
 */
function dispatchDiscretEvent(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent
) {
  // 在你是点击按钮的时候需要设置更新的优先级
  // 先获取当前老的更新优先级
  const previousPriority = getCurrentUpdatePriority();
  try {
    // 把当前的更新优先级设置成离散事件优先级
    setCurrentUpdatePriority(DisCreateEventPriority)
    dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
  } finally {
    setCurrentUpdatePriority(previousPriority)
  }
}
/**
 * 当容器root在捕获或冒泡节点处理事件的时候会执行此函数
 * @param {*} domEventName
 * @param {*} eventSystemFlags
 * @param {*} container
 * @param {*} nativeEvent
 */
export function dispatchEvent(
  domEventName,
  eventSystemFlags,
  targetContainer,
  nativeEvent
) {
  // 获取事件源
  const nativeEventTarget = getEventTarget(nativeEvent);
  const targetInst = getClosestInstanceFromNode(nativeEventTarget);
  dispatchEventForPluginEventSystem(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer
  );
}

/**
 * 获取事件优先级
 * @param {*} domEventName 事件的名称
 */
export function getEventPriority(domEventName) {
  switch (domEventName) {
    case "click":
      return DisCreateEventPriority;
    case "drag":
      return ContinuousEventPriority;
    default:
      return DefaultEventPriority;
  }
}
