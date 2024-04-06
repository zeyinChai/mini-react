// 无优先级
export const NoPriority = 0;
// 立即执行优先级
export const ImmediatePriority = 1;
// 用户阻塞操作优先级 用户点击、输入
export const UserBlockingPriority = 2;
// 正常优先级
export const NormalPriority = 3;
// 低优先级
export const LowPriority = 4;
// 空闲优先级
export const IdlePriority = 5;


// js舍去小数部分 保留整数部分 转成32位二进制数 然后进行运算
//      最左边的第一位是符号 正数为0 负数为1 值以补码的形式存储