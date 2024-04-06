import { mutationMask, Passive, Placement, Update } from "./ReactFiberFlags";
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./ReactWorkTags";
import {
  appendChild,
  inserBefore,
  commitUpdate,
  removeChild,
} from "react-dom-bindings/src/client/ReactDOMHostConfig";
import {
  HasEffect as HookHasEffect,
  Passive as HookPassive,
} from "./ReactHookEffectTags";
let hostParent = null;

function commitDeletionEffects(root, returnFiber, deleteFiber) {
  let parent = returnFiber;
  // 一直向上查找 找到真实dom节点位置
  findParent: while (parent !== null) {
    switch (parent.tag) {
      case HostComponent: {
        hostParent = parent.stateNode;
        break findParent;
      }
      case HostRoot: {
        hostParent = parent.stateNode.containerInfo;
        break findParent;
      }
    }
    parent = parent.return;
  }
  commitDeletionEffectsOnFiber(root, returnFiber, deleteFiber);
  hostParent = null;
}
function commitDeletionEffectsOnFiber(
  finishedRoot,
  nearestMountedAnceston,
  deleteFiber
) {
  switch (deleteFiber.tag) {
    case HostComponent:
    case HostText: {
      // 当要删除一个节点的时候 要先删除他的子节点
      recusivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAnceston,
        deleteFiber
      );
      // 再把自己删除
      if (hostParent !== null) {
        removeChild(hostParent, deleteFiber.stateNode);
      }
      break;
    }
    default:
      break;
  }
}
function recusivelyTraverseDeletionEffects(
  finishedRoot,
  nearestMountedAnceston,
  parent
) {
  let child = parent.child;
  while (child !== null) {
    commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAnceston, child);
    child = child.sibling;
  }
}
/**
 * 递归遍历处理变更的副作用
 * @param {*} root 根节点
 * @param {*} parentFiber 父fiber
 */
function recusivelyTraverseMutationEffects(root, parentFiber) {
  // 先把父fiber上该该删除的节点都删除
  const deletions = parentFiber.deletions;
  if (deletions !== null) {
    for (let i = 0; i < deletions.length; i++) {
      const childToDelete = deletions[i];
      commitDeletionEffects(root, parentFiber, childToDelete);
    }
  }
  // 再去处理剩下的子节点
  if (parentFiber.subtreeFlags & mutationMask) {
    let { child } = parentFiber;
    while (child) {
      commitMutationsEffectsOnFiber(child, root);
      child = child.sibling;
    }
  }
}
function commitReconciliationEffects(finishedWork) {
  const { flags } = finishedWork;
  //   如果此fiber要执行插入操作
  if (flags & Placement) {
    // 也就是把此fiber对应的真实dom节点添加到父真实dom节点上
    commitPlacement(finishedWork);
    // 把flags里的placement删除
    finishedWork.flags & ~Placement;
  }
}
function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot; // div#root
}
function getHostParentFiber(fiber) {
  let parent = fiber.return;
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }
}
/**
 *
 * @param {*} node 将要插入的fiber节点
 * @param {*} parent 父真实dom节点
 */
function insertOrAppendPlacementNode(node, before, parent) {
  const { tag } = node;
  // 判断此fiber对应的节点是不是真实dom节点
  const isHost = tag === HostComponent || tag === HostText;
  // 如果是的话直接插入
  if (isHost) {
    const { stateNode } = node;
    if (before) {
      inserBefore(parent, stateNode, before);
    } else {
      appendChild(parent, stateNode);
    }
  } else {
    // 如果node不是真实的dom节点 获取它的大儿子
    const { child } = node;
    if (child !== null) {
      insertOrAppendPlacementNode(child, before, parent); // 把大儿子添加到父亲里面去
      let { sibling } = child;
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}
/**
 * 找到要插入的锚点
 * 找到可以插在它前面的那个fiber对应的真实dom 见找可插入的兄弟节点.jpg
 * @param {*} finishedWork
 */
function getHostSibling(fiber) {
  let node = fiber;
  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null;
      }
      node = node.return;
    }
    node = node.sibling;
    // 如果弟弟不是原生节点也不是文本节点
    while (node.tag !== HostComponent && node.tag !== HostText) {
      // 如果此节点是一个将要插入的新增节点 就不要管他直接找它的弟弟
      if (node.flags & Placement) {
        continue siblings;
      } else {
        node = node.child;
      }
    }
    if (!(node.flags & Placement)) {
      return node.stateNode;
    }
  }
}
/**
 * 把此fiber的真实dom插入到父dom里
 * @param {*} finishedWork
 */
function commitPlacement(finishedWork) {
  const parentFiber = getHostParentFiber(finishedWork);
  switch (parentFiber.tag) {
    case HostRoot: {
      const parent = parentFiber.stateNode.containerInfo;
      const before = getHostSibling(finishedWork); // 获取最近的弟弟真实dom节点
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
    case HostComponent: {
      const parent = parentFiber.stateNode;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
    default:
      break;
  }
}

/**
 * 遍历fiber树 执行fiber上的副作用
 * @param {*} finishedWork fiber节点
 * @param {*} root 根节点
 */
export function commitMutationsEffectsOnFiber(finishedWork, root) {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case FunctionComponent:
    case HostRoot:
    case HostText: {
      // 去遍历他们的子节点，处理他们的子节点上的副作用
      recusivelyTraverseMutationEffects(root, finishedWork);
      // 再处理自己身上的副作用
      commitReconciliationEffects(finishedWork);
      break;
    }
    case HostComponent: {
      // 去遍历他们的子节点，处理他们的子节点上的副作用
      recusivelyTraverseMutationEffects(root, finishedWork);
      // 再处理自己身上的副作用
      commitReconciliationEffects(finishedWork);
      // 处理dom更新
      if (flags & Update) {
        const instance = finishedWork.stateNode;
        if (instance !== null) {
          const newProps = finishedWork.memoizedProps;
          const oldProps = current !== null ? current.memoizedProps : newProps;
          const type = finishedWork.type;
          const updatePayload = finishedWork.updateQueue;
          finishedWork.updateQueue = null;
          if (updatePayload) {
            commitUpdate(
              instance,
              updatePayload,
              type,
              oldProps,
              newProps,
              finishedWork
            );
          }
        }
      }
      break;
    }
    default:
      break;
  }
}

export function commitPassiveUnmountEffects(finishedWork) {
  commitPassiveUnmountOnFiber(finishedWork);
}

function commitPassiveUnmountOnFiber(finishedWork) {
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case HostRoot: {
      recusivelyTraversePassiveUnMountEffects(finishedWork);
      break;
    }
    case FunctionComponent: {
      recusivelyTraversePassiveUnMountEffects(finishedWork);
      if (flags & Passive) {
        commitHookPassiveUnMountEffects(
          finishedWork,
          HookPassive | HookHasEffect
        );
      }
      break;
    }
  }
}

function recusivelyTraversePassiveUnMountEffects(parentFiber) {
  if (parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child;
    while (child !== null) {
      commitPassiveUnmountOnFiber(child);
      child = child.sibling;
    }
  }
}

function commitHookPassiveUnMountEffects(finishedWork, hookFLags) {
  commitHookEffectListUnMount(hookFLags, finishedWork);
}

function commitHookEffectListUnMount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        const destroy = effect.destroy;
        if (destroy !== undefined) {
          destroy();
        }
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

export function commitPassiveMountEffects(root, finishedWork) {
  commitPassiveMountOnFiber(root, finishedWork);
}

function commitPassiveMountOnFiber(finishedRoot, finishedWork) {
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case HostRoot: {
      recusivelyTraversePassiveMountEffects(finishedRoot, finishedWork);
      break;
    }
    case FunctionComponent: {
      recusivelyTraversePassiveMountEffects(finishedRoot, finishedWork);
      if (flags & Passive) {
        commitHookPassiveMountEffects(
          finishedWork,
          HookPassive | HookHasEffect
        );
      }
      break;
    }
  }
}
function recusivelyTraversePassiveMountEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child;
    while (child !== null) {
      commitPassiveMountOnFiber(root, child);
      child = child.sibling;
    }
  }
}
function commitHookPassiveMountEffects(finishedWork, hookFlags) {
  commitHookEffectListMount(hookFlags, finishedWork);
}
function commitHookEffectListMount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        const create = effect.create;
        effect.destroy = create();
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}
