import logger, { indent } from "shared/logger";
import {
  HostComponent,
  HostRoot,
  HostText,
  FunctionComponent,
  IndeterminateComponent,
} from "./ReactWorkTags";
import { processUpdateQueue,cloneUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import { shouldSetTextContent } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { renderWithHooks } from "react-reconciler/src/ReactFiberHooks";
/**
 * 根据新的虚拟dom生成新的fiber链表
 * @param {*} current 老的父fiber
 * @param {*} workInProgress 新的工作中的fiber
 * @param {*} nextChildren 新的子虚拟dom
 */
function reconcileChildren(current, workInProgress, nextChildren) {
  // 如果此新fiber没有老fiber 说明此新fiber是新创建的
  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren);
  } else {
    // 如果有老fiber的话 做dom-diff 拿老的子fiber链表和新的子虚拟dom进行比较，进行最小化的更新
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren
    );
  }
}
function updateHostRoot(current, workInProgress, renderLanes) {
  const nextProps = workInProgress.pendingProps
  cloneUpdateQueue(current,workInProgress)
  // 需要知道它的子虚拟dom：知道它的儿子的虚拟dom信息
  processUpdateQueue(workInProgress,nextProps,renderLanes); // workInProgress.memoizedState = {element}
  const nextState = workInProgress.memoizedState;
  // nextChildren就是新的子虚拟DOM
  const nextChildren = nextState.element; //h1
  // 根据新的虚拟dom生成对应的新的子fiber链表
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child; // { tag:5,type:'h1' }
}
/**
 * 构建原生组件的子fiber链表
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 */
function updateHostComponent(current, workInProgress) {
  const { type } = workInProgress;
  const nextProps = workInProgress.pendingProps;
  let nextChildren = nextProps.children;
  // 判断当前虚拟dom的儿子是不是一个文本节点
  const isDirectTextChild = shouldSetTextContent(type, nextProps);
  if (isDirectTextChild) {
    nextChildren = null;
  }
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child; // { tag:6,type:null,pendingProps:hello }
}
/**
 * 挂载函数组件
 * @param {*} current 老fiber
 * @param {*} workInProgress 新的fiber
 * @param {*} Compoent 组件类型也就是函数组件的定义
 */
export function mountIndeterminateComponent(current, workInProgress, Compoent) {
  const props = workInProgress.pendingProps;
  // const value = Compoent(props); // 执行函数
  const value = renderWithHooks(current, workInProgress, Compoent, props);
  workInProgress.tag = FunctionComponent; // 标记为函数组件
  reconcileChildren(current, workInProgress, value);
  return workInProgress.child;
}
export function updateFuntionComponent(
  current,
  workInProgress,
  Compoent,
  nextProps
) {
  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    Compoent,
    nextProps
  );
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}
/**
 * 目标是根据新虚拟dom构建新的fiber子链表
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @returns
 */
export function beginWork(current, workInProgress, renderLanes) {
  indent.number += 2;
  logger(" ".repeat(indent.number) + `beginwork`, workInProgress);
  switch (workInProgress.tag) {
    // 在react里组件有两种 函数组件+类组件
    case IndeterminateComponent:
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type, // 函数组件虚拟dom的type就是函数
        renderLanes
      );
    case FunctionComponent:
      const Compoent = workInProgress.type;
      const nextProps = workInProgress.pendingProps;
      return updateFuntionComponent(
        current,
        workInProgress,
        Compoent,
        nextProps,
        renderLanes
      );
    // 根
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    // 原生组件
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return null;
    default:
      return null;
  }
}
