/**
 * 向最小堆里添加一个节点
 * @param {*} heap 最小堆
 * @param {*} node 节点
 */
export function push(heap, node) {
  // 获取元素的数量
  const index = heap.length;
  // 添加元素至末尾
  heap.push(node);
  //   向上调整到合适的位置
  shiftUp(heap, node, index);
}
/**
 * 查看最小堆顶的元素
 * @param {*} heap 最小堆
 */
export function peek(heap) {
  const first = heap[0];
  return first === undefined ? null : first;
}
/**
 * 弹出最小堆的堆顶元素
 * @param {*} heap
 */
export function pop(heap) {
  const first = heap[0];
  if (first !== undefined) {
    // 弹出数组中的最后一个元素
    const last = heap.pop();
    if (last !== first) {
      heap[0] = last;
      shiftDown(heap, last, 0);
    }
  } else {
    return null;
  }
  return first;
}
/**
 * 向上调整某个节点 使其位于正确的位置
 * @param {*} heap 最小堆
 * @param {*} node 节点
 * @param {*} i 节点所在的索引
 */
function shiftUp(heap, node, i) {
  let index = i;
  while (true) {
    // 获取父节点的索引
    const parentIndex = (index - 1) >>> 1;
    // 获取父节点
    const parent = heap[parentIndex];
    // 如果父节点存在并且父节点比子节点要大
    if (parent !== undefined && compare(parent, node) > 0) {
      // 交换位置
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      return;
    }
  }
}
/**
 * 向下调整某个节点 使其位于正确的位置
 * @param {*} heap 最小堆
 * @param {*} node 节点
 * @param {*} i 节点所在的索引
 */
function shiftDown(heap, node, i) {
  let index = i;
  const length = heap.length;
  while (index < length) {
    // 左子节点的索引
    let leftIndex = (index + 1) * 2 - 1;
    const left = heap[leftIndex];
    let rightIndex = leftIndex + 1;
    const right = heap[rightIndex];
    // 如果左子节点存在并且左子节点比父节点要小
    if (left !== undefined && compare(left, node) < 0) {
      // 如果右节点比左节点小
      if (right !== undefined && compare(right, left) < 0) {
        heap[index] = right;
        heap[rightIndex] = node;
        index = rightIndex;
      } else {
        heap[index] = left;
        heap[leftIndex] = node;
        index = leftIndex;
      }
    } else if (right !== undefined && compare(right, node) < 0) {
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;
    } else {
      return;
    }
  }
}

function compare(a, b) {
  const diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff: a.id - b.id;
}

// let heap = [];
// let id = 1;
// push(heap, { sortIndex: 1, id: id++ });
// push(heap, { sortIndex: 2, id: id++ });
// push(heap, { sortIndex: 3, id: id++ });
// push(heap, { sortIndex: 4, id: id++ });
// push(heap, { sortIndex: 5, id: id++ });
// push(heap, { sortIndex: 6, id: id++ });
// push(heap, { sortIndex: 7, id: id++ });
// pop(heap);
// console.log(peek(heap));
