# class-state
Class based state management library

## 问题点
- commit 函数闭包问题
- get 访问器调用 getStoreOrCreate
- state的初始化，需要对的可枚举的属性进行严格校验，如果不对，则抛错误
- TS Store 类型问题
- Vue2 state 劫持钩子