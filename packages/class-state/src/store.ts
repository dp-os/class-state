import { produce } from 'limu';
import { type ContextState } from './context'

export type Json = Record<string, any>;
export type ClassStateConstructor = {
  storeName: string;
  new(): any;
};
export type Params<T extends ClassStateConstructor> = {
  // 自定义参数
  params?: Record<string, string | number>;
  // 全局 state 上下文 name -> state
  context: ContextState;
  // Class Store
  Store: T;
};
// name -> store proxy
type ContextValue = Record<string, any>;

// 缓存 context
const cachedContext = new WeakMap<ContextState, ContextValue>();
// 初始化时默认的 state，未经更改的 store -> state
const cachedInitialState = new WeakMap<any, Json>();
// 临时的 context 环境，使用场景：get 访问器调用
let tempContext: ContextState | null = null;
// 可接受的枚举属性类型
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
const StringifySafeTypes = [
  'Array',
  'Boolean',
  'Null',
  'Number',
  'String'
];

export function createStoreKey(
  name: string,
  params?: Record<string, string | number>
) {
  if (params) {
    const q = Object.keys(params)
      .sort()
      .map((key) => `${key}=${encodeURIComponent(params[key])}`);
    if (q) {
      name += '?' + q;
    }
  }
  return name;
}

function _getImmutableState(context: ContextState, key: string): Json | undefined {
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
  context: ContextState,
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

function _createHandler(context: ContextState, storeKey: string, store: any) {
  // 获取 state 数据，直接映射，理论上此时 state 不会为空
  const getState = () => _getImmutableState(context, storeKey) || {};
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
    get(target: any, key: string | symbol) {
      // 仅监听 $XXX 方法，更新 state
      if (
        typeof key === 'string' &&
        key.indexOf('$') === 0 &&
        typeof target[key] === 'function'
      ) {
        return new Proxy(target[key], {
          apply(target, _, argArray) {
            // 确保 get 访问情况下 context 存在
            tempContext = context;
            let returnValue = undefined;
            // 确保是最新的 state 数据
            const state = getState();
            const nextState = produce(state, (draft: Json) => {
              returnValue = target.apply(_createCtx(draft, store), argArray);
            });
            if (nextState !== state) setState(nextState);
            return returnValue;
          }
        });
      }
      // 仅取值
      const state = getState();
      if (key in state) {
        // 可枚举属性
        tempContext = null;
        return Reflect.get(state, key);
      }
      // 不可枚举属性，从实例上取
      tempContext = context;
      return Reflect.get(target, key);
    }
  };
}

function _isPureObject(val: unknown) {
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

function _getInitialState(store: any) {
  const state: Json = Object.create(null);
  for (const key of Object.keys(store)) {
    const value = store[key];
    const type = Object.prototype.toString.call(value).slice(8, -1);
    if (
      StringifySafeTypes.includes(type) ||
      (type === 'Object' && _isPureObject(value))
    ) {
      state[key] = value;
    } else {
      const prototype = !value ? type : value.constructor.name;
      throw new Error(
        `Unsupported property type ${prototype}: ${store.constructor.name}.${key}`
      );
    }
  }
  return state;
}

// 返回一个 store 的 proxy 对象，state 变更，proxy 也会更新
function _getStore<T extends ClassStateConstructor>(
  { context, Store, params }: Params<T>,
  autoCreate?: boolean
): InstanceType<T> | undefined {
  let maps = cachedContext.get(context);
  if (!maps) {
    maps = {};
    cachedContext.set(context, maps);
  }
  const storeKey = createStoreKey(Store.storeName, params);
  let proxy = maps[storeKey];
  if (proxy || !autoCreate) {
    return proxy;
  }
  // create new store
  const store = new Store();
  const initialState = _getInitialState(store);
  // create proxy
  proxy = new Proxy(store, _createHandler(context, storeKey, store));
  cachedInitialState.set(proxy, initialState);
  maps[storeKey] = proxy;

  return proxy;
}

// 返回一个缓存的 store
export function getStore<T extends ClassStateConstructor>(config: Params<T>) {
  return _getStore(config);
}

// 返回一个缓存的 store，没有就新建
export function getStoreOrCreate<T extends ClassStateConstructor>(
  config: Params<T>
) {
  return _getStore(config, true) as InstanceType<T>;
}

// 返回一个不指定 context 的 store，没有就新建
// 使用场景：get 访问器调用
export function getStoreAuto<T extends ClassStateConstructor>(
  config: Pick<Params<T>, 'params' | 'Store'>
) {
  if (!tempContext) {
    return undefined;
  }
  return _getStore({ ...config, context: tempContext }, true) as InstanceType<T>;
}
