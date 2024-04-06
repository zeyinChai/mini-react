import { registerTwoPhaseEvent } from "./EventRegistry";
const simpleEventPluginEvents = ["click"];
export const topLevelEventsToReactNames = new Map()
function registerSimpleEvent(domEventName, reactName) {
  // onClick在哪里可以取到? 可以从元素的fiber属性上可以取到
  topLevelEventsToReactNames.set(domEventName,reactName)
  registerTwoPhaseEvent(reactName, [domEventName]);
}

export function registerSimpleEvents() {
  for (let i = 0; i < simpleEventPluginEvents.length; i++) {
    const eventName = simpleEventPluginEvents[i]; // click
    const domEventName = eventName.toLowerCase(); // click
    // 首字母大写的事件名字
    const captializeEvent = eventName[0].toUpperCase() + eventName.slice(1); // Click
    registerSimpleEvent(domEventName, `on${captializeEvent}`); // click onClick
  }
}
