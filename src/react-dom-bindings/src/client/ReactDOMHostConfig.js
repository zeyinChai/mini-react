import { setInitialProperties,diffProperties,updateProperties } from "./ReactDOMComponent";
import { precacheFiberNode, updateFiberProps } from "./ReactDOMComponentTree";
import {DefaultEventPriority} from 'react-reconciler/src/ReactEventPriorities'
import {getEventPriority} from '../events/ReactDOMEventListener'
export function shouldSetTextContent(type, props) {
  return (
    typeof props.children === "string" || typeof props.children === "number"
  );
}

export function createTextInstance(content) {
  return document.createTextNode(content);
}

export function createInstance(type, newProps, internalInstanceHandle) {
  const domElement = document.createElement(type);
  // TODO updateFiberProps(element,props)
  precacheFiberNode(internalInstanceHandle,domElement);
  // 把属性直接保存在domElement的属性上
  updateFiberProps(domElement,newProps)
  return domElement;
}

export function appendInitialChild(parent, child) {
  parent.appendChild(child);
}

export function finalizeInitialChildren(domElement, type, props) {
  setInitialProperties(domElement, type, props);
}

export function appendChild(parent, child) {
  parent.appendChild(child);
}

export function inserBefore(parent, child, beforeChild) {
  parent.insertBefore(child, beforeChild);
}

export function prepareUpdate(domElement,type,oldProps,newProps){
  return diffProperties(domElement,type,oldProps,newProps)
}

export function commitUpdate(domElement,updatePayload,type,oldProps,newProps){
  updateProperties(domElement,updatePayload,type,oldProps,newProps)
  updateFiberProps(domElement,newProps)
}

export function removeChild(parentInstance,child){
  parentInstance.removeChild(child)
}

export function getCurrentEventPriority(){
  const currentEvent = window.event
  if(currentEvent === undefined){
      return DefaultEventPriority
  }
  return getEventPriority(currentEvent.type)
}