import { produce } from "limu";

export type Json = Record<string, any>;
export interface Constructible {
  __proto__?: any;
  new (): any;
}
// name -> state
type ContextKey = Record<string, Json>;
// name -> store
type ContextValue = Record<string, any>;

export type iParams = {
  // 自定义名称
  name: string;
  // 自定义参数
  params?: Record<string, string | number>;
  // 全局 state 上下文
  context: ContextKey;
  // Class Store
  Store: new () => any;
};

// 缓存 context
const cachedContext = new WeakMap<ContextKey, ContextValue>();
// 初始化时默认的 state，未经更改的 store -> state
const cachedInitialState = new WeakMap<any, Json>();

function noop() {}

export function createStoreKey(
  name: string,
  params?: Record<string, string | number>
) {
  if (params) {
    const q = Object.keys(params)
      .sort()
      .map((key) => `${key}=${encodeURIComponent(params[key])}`);
    if (q) {
      name += "?" + q;
    }
  }
  return name;
}

function _getImmutableState(context: ContextKey, key: string) {
  if (context[key]) {
    // 变更后的 state
    return context[key];
  }
  const maps = cachedContext.get(context);
  if (maps) {
    const store = maps[key];
    if (store) {
      // initial state
      return cachedInitialState.get(store);
    }
  }
  return undefined;
}

export function getImmutableState(
  context: ContextKey,
  name: string,
  params?: Record<string, string | number>
) {
  const key = createStoreKey(name, params);
  return _getImmutableState(context, key);
}

function _createHandler(instance: any, context: ContextKey, storeKey: string) {
  // 获取 state 数据，直接映射
  // 理论上 state 不会为空
  const getState = () => _getImmutableState(context, storeKey) || {};

  return {
    get(target: any, key: string | symbol, receiver: any) {
      // 原型上的，直接返回
      if (
        key === "__proto__" ||
        key in Object.getOwnPropertyNames(target.__proto__)
      ) {
        return Reflect.get(target.__proto__, key, receiver);
      }
      const state = getState();
      // 仅监听 $XXX 方法，更新 state
      if (
        typeof key === "string" &&
        key.indexOf("$") === 0 &&
        typeof target[key] === "function"
      ) {
        return new Proxy(target[key], {
          apply(target, thisArg, argArray) {
            let returnValue = true;
            const nextState = produce(state, (draft) => {
              returnValue = target.apply(draft, argArray);
            });
            if (nextState !== state) {
              context[storeKey] = nextState;
              // 更新之后，删除 initial state 缓存
              cachedInitialState.delete(instance);
              // TODO: 更新 store 的代理实例，原始实例的内存指向不变
            }
            return returnValue;
          }
        });
      }
      // 其它情况
      return Reflect.get(state, key);
    }
  };
}

// 返回一个 store
function _getStore(
  { name, context, Store, params }: iParams,
  autoCreate?: boolean
) {
  let maps = cachedContext.get(context);
  if (!maps) {
    maps = {};
    cachedContext.set(context, maps);
  }
  const storeKey = createStoreKey(name, params);
  let instance = maps[storeKey];
  if (instance || !autoCreate) {
    return instance;
  }
  // create new store
  const store = new Store();
  const initialState: Json = produce({ ...store }, noop);
  instance = new Proxy(store, _createHandler(instance, context, storeKey));
  cachedInitialState.set(instance, initialState);
  maps[storeKey] = instance;
  return instance;
}

// 返回一个缓存的 store
export function getStore(config: iParams) {
  return _getStore(config);
}

// 返回一个缓存的 store，没有就新建
export function getStoreOrCreate(config: iParams) {
  return _getStore(config, true);
}

export function getState(config: iParams) {
  return getImmutableState(config.context, config.name, config.params);
}

export function getStateOrCreate(config: iParams) {
  const state = getImmutableState(config.context, config.name, config.params);
  if (state) {
    return state;
  }
  // 创建一个并取得初始 state
  const store = getStoreOrCreate(config);
  return cachedInitialState.get(store) as Json;
}
