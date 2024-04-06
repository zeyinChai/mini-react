import hasOwnProperty from "shared/hasOwnProperty";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};
function hasValidKey(config) {
  return config.key !== undefined;
}
function hasValidRef(config) {
  return config.ref !== undefined;
}
function ReactElement(type, key, ref, props) {
  return {
    // 这就是react元素也被称为虚拟dom
    $$typeof: REACT_ELEMENT_TYPE,
    type, // dom类型
    key, // 唯一标识
    ref, // 用来获取真实dom的
    props, // 属性 children style等
  };
}
// react18用的新版本babel转换虚拟dom
export function jsxDEV(type, config, maybeKey) {
  let propName; // 属性名
  const props = {}; // 属性对象
  let key = null; // 每个虚拟dom可以有一个可选的key属性，用来区分一个父节点下的不同子节点
  let ref = null; // 引用，后面可以通过这个实现获取真实dom的需求
  if (typeof maybeKey !== undefined) {
    key = maybeKey;
  }
  if (hasValidRef(config)) {
    ref = config.ref;
  }
  for (propName in config) {
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }
  return ReactElement(type, key, ref, props);
}
