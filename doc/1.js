// 在React进行DOM DIFF的时候会计算要执行的操作
const Placement = 0b001 // 1
const Update = 0b010 // 2

let flags = 0b00
// 增加操作 或运输
// flags |= Placement
// flags |= Update
// console.log(flags); // 3
// console.log(flags.toString(2)); // 11

// 删除操作
flags = flags & ~Placement // 先对Placement进行区分 然后与运算