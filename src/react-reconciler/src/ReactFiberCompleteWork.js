import logger, { indent } from "shared/logger";
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./ReactWorkTags";
import {
  createTextInstance,
  createInstance,
  appendInitialChild,
  finalizeInitialChildren,
  prepareUpdate
} from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { NoFlags, Update } from "./ReactFiberFlags";
/**
 * 把当前的完成的fiber所有的子节点对应的真实dom都挂载到自己父parent真实DOM节点上
 * @param {*} parent 当前完成的fiber真实的DOM节点
 * @param {*} workInProgress 完成的fiber
 */
function appendAllChildren(parent, workInProgress) {
  let node = workInProgress.child;
  while (node) {
    // 如果子节点是原生节点或者文本节点
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      // 如果第一个儿子不是一个原生节点 说明可能是一个函数组件
      node = node.child;
      continue;
    }
    if (node === workInProgress) {
      return;
    }
    // 如果当前节点没有弟弟
    while (node.sibling === null) {
      // 如果父亲已经是父fiber了那就结束了
      if (node.return === null || node.return === workInProgress) {
        return;
      }
      // 回到父节点：找叔叔
      node = node.return;
    }
    node = node.sibling;
  }
}
function markUpdate(workInProgress){
  workInProgress.flags |= Update // 给当前的fiber添加更新的副作用
}
/**
 * 在fiber完成节点 准备更新dom
 * @param {*} current button老fiber
 * @param {*} workInProgress button的新fiber
 * @param {*} type 类型
 * @param {*} newProps 新属性
 */
function updateHostComponent(current,workInProgress,type,newProps){
  const oldProps  = current.memoizedProps // 老的属性
  const instance = workInProgress.stateNode // 老的dom节点
  const updatePayload = prepareUpdate(instance,type,oldProps,newProps)
  // const updatePayload = ['children',6]
  console.log(updatePayload,'@');
  workInProgress.updateQueue = updatePayload
  if(updatePayload){
    markUpdate(workInProgress)
  }
}
/**
 * 完成一个fiber节点
 * @param {*} current 老fiber
 * @param {*} workInProgress 新的构建的fiber
 */
export function completeWork(current, workInProgress) {
  indent.number -= 2;
  logger(" ".repeat(indent.number) + "completeWork", workInProgress);
  const newProps = workInProgress.pendingProps;
  // console.log(workInProgress);
  switch (workInProgress.tag) {
    case HostRoot:
      bubbleProperties(workInProgress);
      break;
    // 如果完成的是原生节点的话
    case HostComponent:
      // 创建真实的dom节点
      const { type } = workInProgress;
      // 如果老fiber存在并且老fiber上有真实dom节点的话 要走节点更新的逻辑
      if (current !== null && workInProgress.stateNode !== null) {
        updateHostComponent(current,workInProgress,type,newProps)
      } else {
        const instance = createInstance(type, newProps, workInProgress);
        appendAllChildren(instance, workInProgress);
        //  把自己所有的儿子都添加到自己的身上
        workInProgress.stateNode = instance;
        finalizeInitialChildren(instance, type, newProps);
      }
      bubbleProperties(workInProgress);
      break;
    case FunctionComponent:
      bubbleProperties(workInProgress);
      break
    case HostText:
      // 如果完成的fiber是文本节点 那就创建真实的文本节点
      const nextText = newProps;
      //   创建真实的文本dom节点
      workInProgress.stateNode = createTextInstance(nextText);
      //   向上冒泡属性
      bubbleProperties(workInProgress);
      break;
  }
}

function bubbleProperties(completedWork) {
  let subtreeFlags = NoFlags;
  // 便利当前fiber的所有子节点 把所有子节点的副作用 全部合并起来
  let child = completedWork.child;
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;
    child = child.sibling;
  }
  completedWork.subtreeFlags = subtreeFlags;
}
