import assign from "shared/assign";

function functionThatReturnsTrue() {
  return true;
}
function functionThatReturnsFalse() {
  return false;
}
const MouseEventInterface = {
  clientX: 0,
  clientY: 0,
};

function createSyntheticMouseEvent(inter) {
  // 合成事件的基类
  function SynctheticBaseEvent(
    reactName,
    reactEventType,
    targetInst,
    nativeEvent,
    nativeEventTarget
  ) {
    this._reactName = reactName;
    this.type = reactEventType;
    this._targetInst = targetInst;
    this.nativeEvent = nativeEvent;
    this.target = nativeEventTarget;
    // 把此接口上对应的属性从原生事件上拷贝到合成事件实例上
    for (const propName in inter) {
      if (!inter.hasOwnProperty(propName)) {
        continue;
      }
      this[propName] = nativeEvent[propName];
    }
    // 是否已经阻止默认事件了
    this.isDefaultPrevented = functionThatReturnsFalse;
    // 是否已经阻止继续传播了
    this.isPropagationStopped = functionThatReturnsFalse;
    return this;
  }
  assign(createSyntheticMouseEvent.prototype,{
    preventDefault(){
        const event = this.nativeEvent
        if(event.preventDefault){
            event.preventDefault()
        }else{
            event.returnValue = false
        }
        this.isDefaultPrevented = functionThatReturnsTrue
    },
    stopPropagation(){
        const event = this.stopPropagation
        if(event.stopPropagation){
            event.stopPropagation()
        }else{
            event.cancelBubble = true
        }
        this.isPropagationStopped = functionThatReturnsTrue
    }
  })
  return SynctheticBaseEvent;
}

export const SyntheticMouseEvent =
  createSyntheticMouseEvent(MouseEventInterface);
