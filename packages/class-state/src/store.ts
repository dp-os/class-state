import { produce } from "limu";

export type Json = Record<string, any>;
export type iParams = {
  // 自定义名称
  name: string;
  // 自定义参数
  params?: Record<string, string | number>;
  // 全局 state 上下文 name -> state
  context: Json;
  // Class Store
  Store: new () => any;
};
// name -> store proxy
type ContextValue = Record<string, any>;

// 缓存 context
const cachedContext = new WeakMap<Json, ContextValue>();
// 初始化时默认的 state，未经更改的 store -> state
const cachedInitialState = new WeakMap<any, Json>();

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

function _getImmutableState(context: Json, key: string) {
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
  context: Json,
  name: string,
  params?: Record<string, string | number>
) {
  const key = createStoreKey(name, params);
  return _getImmutableState(context, key);
}

function _createCtx(draft: Json, store: any) {
  return new Proxy(draft, {
    get(target, key) {
      return Reflect.get(key in target ? target : store, key);
    },
    set(target, key, value) {
      const property = Object.getOwnPropertyDescriptor(store, key);
      return Reflect.set(
        property && property.enumerable ? target : store,
        key,
        value
      );
    }
  });
}

function _createHandler(context: Json, storeKey: string, store: any) {
  // 更新全局 state
  const setState = (nextState: Json) => {
    context[storeKey] = nextState;
    const maps = cachedContext.get(context) as ContextValue;
    // 更新之后，删除 initial state 缓存
    cachedInitialState.delete(maps[storeKey]);
    // 更新 store 的代理实例，原始实例的内存指向不变
    maps[storeKey] = new Proxy(store, _createHandler(context, storeKey, store));
  };

  return {
    get(target: any, key: string | symbol, receiver: any) {
      // 原型上的，直接返回
      if (
        key === "__proto__" ||
        key in Object.getOwnPropertyNames(target.__proto__)
      ) {
        return Reflect.get(target.__proto__, key, receiver);
      }
      // 获取 state 数据，直接映射，理论上此时 state 不会为空
      const state = _getImmutableState(context, storeKey) || {};
      // 仅监听 $XXX 方法，更新 state
      if (
        typeof key === "string" &&
        key.indexOf("$") === 0 &&
        typeof target[key] === "function"
      ) {
        return new Proxy(target[key], {
          apply(target, _, argArray) {
            let returnValue = undefined;
            const nextState = produce(state, (draft) => {
              returnValue = target.apply(_createCtx(draft, store), argArray);
            });
            if (nextState !== state) setState(nextState);
            return returnValue;
          }
        });
      }
      // 其它情况
      return Reflect.get(state, key);
    }
  };
}

// 返回一个 store 的 proxy 对象，state 变更，proxy 也会更新
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
  let proxy = maps[storeKey];
  if (proxy || !autoCreate) {
    return proxy;
  }
  // create new store
  const store = new Store();
  const initialState: Json = produce({ ...store }, () => {});
  // create proxy
  proxy = new Proxy(store, _createHandler(context, storeKey, store));
  cachedInitialState.set(proxy, initialState);
  maps[storeKey] = proxy;

  return proxy;
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
