import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
} from "./ReactFiber";
import { Placement, ChildDeletion } from "./ReactFiberFlags";
import isArray from "shared/isArray";
import { HostText } from "./ReactWorkTags";
/**
 * 是否跟踪副作用
 * @param {*} shouldTrackSideEffect
 */
function createChildReconciler(shouldTrackSideEffect) {
  function useFiber(fiber, penddingProps) {
    const clone = createWorkInProgress(fiber, penddingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }
  function deleteChild(returnFiber, childToDelete) {
    if (!shouldTrackSideEffect) {
      return;
    }
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      returnFiber.deletions.push(childToDelete);
    }
  }
  /**
   *
   * @param {*} returnFiber 根fiber
   * @param {*} currentFirstChild 老的functionComponent对应的fiber
   * @param {*} element 新的虚拟dom对象
   * @returns 返回新的第一个fiber
   */
  function reconcileSingleElement(returnFiber, currentFirstChild, element) {
    const key = element.key;
    let child = currentFirstChild; //老的functionComponent对应的fiber
    // 第一次更新，复用的时候会创建 alternate
    while (child !== null) {
      // 判断老fiber对应的key和新的虚拟dom对应的key是否一样
      if (child.key === key) {
        // 判断老fiber对应的类型是否想同
        if (child.type === element.type) {
          deleteRemainingChildren(returnFiber, child.sibling);
          // 如果类型一样 key也一样 则认为此fiber可以复用
          const existing = useFiber(child, element.props);
          existing.return = returnFiber;
          return existing;
        } else {
          deleteRemainingChildren(returnFiber, child);
        }
      } else {
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }
    // 现在实现的是初次挂载，老节点currentFirstFiber肯定是没有，所以可以直接挂载
    const created = createFiberFromElement(element);
    created.return = returnFiber;
    return created;
  }
  // 删除从currentFirstChild之后所有的fiber节点
  function deleteRemainingChildren(returnFiber, currentFirstChild) {
    if (!shouldTrackSideEffect) {
      return;
    }
    let childToDelete = currentFirstChild;
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
    return null;
  }
  /**
   * 设置副作用
   * @param {*} newFiber
   * @returns
   */
  function placeSingleChild(newFiber) {
    // 说明要去添加副作用
    if (shouldTrackSideEffect && newFiber.alternate === null) {
      // 要在最后的提交阶段插入此节点
      newFiber.flags |= Placement;
    }
    return newFiber;
  }
  function createChild(returnFiber, newChild) {
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      const created = createFiberFromText(`${newChild}`);
      created.return = returnFiber;
      return created;
    }
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const created = createFiberFromElement(newChild);
          created.return = returnFiber;
          return created;
        }
        default:
          break;
      }
      return null;
    }
  }
  function placeChild(newFiber, lastPlaceIndex, newIndex) {
    // 指定新的fiber在新的挂载索引
    newFiber.index = newIndex;
    // 如果不需要跟踪副作用
    if (!shouldTrackSideEffect) {
      return lastPlaceIndex;
    }
    // 获取它的老fiber
    const current = newFiber.alternate;
    // 如果有，说明这是一个更新的节点，有老的真实dom
    if (current !== null) {
      const oldIndex = current.index;
      // 进行比较 如果找到的老fiber的索引比lastPlaceIndex要小 则老fiber对应的dom节点需要移动
      if (oldIndex < lastPlaceIndex) {
        newFiber.flags |= Placement;
        return lastPlaceIndex;
      } else {
        return oldIndex;
      }
    } else {
      // 如果没有说明这是一个新的1节点插入
      newFiber.flags |= Placement;
      return lastPlaceIndex;
    }
  }
  function updateElement(returnFiber, current, element) {
    const elementType = element.type;
    if (current !== null) {
      // 判断类型是否一样
      if (current.type === elementType) {
        const existing = useFiber(current, element.props);
        existing.return = returnFiber;
        return existing;
      }
    }
    const created = createFiberFromElement(element);
    created.return = returnFiber;
    return created;
  }
  function updateSlot(returnFiber, oldFiber, newChild) {
    const key = oldFiber !== null ? oldFiber.key : null;
    if (newChild !== null && typeof newChild === "object") {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          // 如果key一样就进入更新元素的逻辑
          if (newChild.key === key) {
            return updateElement(returnFiber, oldFiber, newChild);
          }
        }
        default:
          return null;
      }
    }
    return null;
  }
  function mapRemainingChildren(returnFiber, currentFirstChild) {
    const existingChildren = new Map();
    let existingChild = currentFirstChild;
    while (existingChild !== null) {
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild);
      } else {
        existingChildren.set(existingChild.index, existingChild);
      }
      existingChild = existingChild.sibling;
    }
    return existingChildren;
  }
  function updateTextNode(returnFiber, current, textContent) {
    if (current === null || current.tag !== HostText) {
      const created = createFiberFromText(textContent);
      created.return = returnFiber;
      return created;
    } else {
      const existing = useFiber(current, textContent);
      existing.return = returnFiber;
      return existing;
    }
  }
  function updateFromMap(existingChildren, returnFiber, newIndex, newChild) {
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      const matchedFiber = existingChildren.get(newIndex) || null;
      return updateTextNode(returnFiber, matchedFiber, "" + newChild);
    }
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const matchedFiber =
            existingChildren.get(
              newChild.key === null ? newIndex : newChild.key
            ) || null;
          return updateElement(returnFiber, matchedFiber, newChild);
        }
      }
    }
  }
  // 多节点dom-diff
  function reconcileChildArray(returnFiber, currentFirstFiber, newChildren) {
    let resultingFirstChild = null; // 返回的第一个新儿子
    let previousNewFiber = null; // 上一个的一个新的儿fiber
    let newIndex = 0; // 用来遍历新的虚拟dom的索引
    let oldFiber = currentFirstFiber; // 第一个老fiber
    let nextOldFiber = null; // 下一个老fiber
    let lastPlaceIndex = 0; // 上一个不需要移动的节点的索引
    // 开始第一轮循环 如果老fiber有值 新虚拟dom也有值
    for (; oldFiber !== null && newIndex < newChildren.length; newIndex++) {
      nextOldFiber = oldFiber.sibling; // 先暂存下一个老fiber
      // 试图更新或试图复用老的fiber
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIndex]);
      if (newFiber === null) {
        break;
      }
      if (shouldTrackSideEffect) {
        // 如果有老fiber，但是新的fiber并没有成功复用老fiber（复用成功才有alternate）
        // 就删除老fiber，后面提交阶段会删除真实dom
        if (oldFiber && newFiber.alternate === null) {
          deleteChild(returnFiber, oldFiber);
        }
      }
      lastPlaceIndex = placeChild(newFiber, lastPlaceIndex, newIndex);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }
    // 如果说新的虚拟dom已经循环完毕，3=>2
    if (newIndex === newChildren.length) {
      // 删除剩下的老fiber
      deleteRemainingChildren(returnFiber, oldFiber);
      return resultingFirstChild;
    }
    if (oldFiber === null) {
      // 如果老的fiber已经结束了 新的虚拟dom还有就进入插入新节点的逻辑
      for (; newIndex < newChildren.length; newIndex++) {
        const newFiber = createChild(returnFiber, newChildren[newIndex]);
        if (newFiber === null) continue;
        lastPlaceIndex = placeChild(newFiber, lastPlaceIndex, newIndex);
        // 如果previousNewFiber为null说明这是第一个fiber
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber; // 这个newFiber就是大儿子
        } else {
          // 否则的话 说明不是大儿子 就把这个newFiber添加上一个子节点的后面
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }
    // 处理节点移动的情况
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);
    // 开始遍历剩下的虚拟dom子节点
    for (; newIndex < newChildren.length; newIndex++) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIndex,
        newChildren[newIndex]
      );
      if (newFiber !== null) {
        if (shouldTrackSideEffect) {
          // 如果要跟踪副作用 并且有老fiber
          if (newFiber.alternate !== null) {
            existingChildren.delete(
              newFiber.key === null ? newIndex : newFiber.key
            );
          }
        }
        // 指定新的fiber存放位置 并且给lastPlaceIndex赋值
        lastPlaceIndex = placeChild(newFiber, lastPlaceIndex, newIndex);
        // 如果previousNewFiber为null说明这是第一个fiber
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber; // 这个newFiber就是大儿子
        } else {
          // 否则的话 说明不是大儿子 就把这个newFiber添加上一个子节点的后面
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }
    if (shouldTrackSideEffect) {
      // 等全部处理完之后，删除map中所有剩下的老fiber
      existingChildren.forEach((child) => deleteChild(returnFiber, child));
    }
    return resultingFirstChild;
  }
  /**
   * 比较子fiber 老儿子和要新增的儿子进行比较 该增加增加该修改修改 DOM-DIFF
   * @param {*} returnFiber 新的父fiber
   * @param {*} currentFirstChild 老Fiber的第一个子fiber
   * @param {*} newChild 新的子虚拟dom
   */
  function reconcileChildFibers(returnFiber, currentFirstChild, newChild) {
    // 暂时只考虑新的节点只有一个的情况
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFirstChild, newChild)
          );
        default:
          break;
      }
    }
    // newChild [hellow文本节点，span虚拟dom元素]
    if (isArray(newChild)) {
      return reconcileChildArray(returnFiber, currentFirstChild, newChild);
    }
    return null;
  }
  return reconcileChildFibers;
}
// 无老fiber更新的时候用这个
export const mountChildFibers = createChildReconciler(false);
// 有老fiber更新的时候用这个
export const reconcileChildFibers = createChildReconciler(true);
