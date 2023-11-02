import { produce, createDraft } from "limu";

export type Json = Record<string, any>;
export type Constructible = new (...args: never[]) => any;
export type iParams<T = any> = {
  // 自定义名称
  name: string;
  // 自定义参数
  params?: Json;
  // 全局 state 上下文
  context: Json;
  // Class Store
  Store: new (config?: Json) => T;
};
type MapToKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : T[K];
};

// 缓存 context
const cachedContext = new WeakMap<Json, Json>();

function _getImmutableState<T>(store: any): MapToKeys<T> {
  return store.__state || store.__initialState;
}

function _isNestValue(value: unknown) {
  return (
    ["[object Object]", "[object Array]"].indexOf(
      Object.prototype.toString.call(value)
    ) > -1
  );
}

function _createHandler(
  path: string,
  doUpdate: (path: string, value: any) => void
) {
  return {
    get(target: any, key: string | symbol, receiver: any): any {
      // get visibility of level and proto without chaining new proxy
      if (
        key === "__proto__" ||
        key in Object.getOwnPropertyNames(target.__proto__)
      ) {
        return Reflect.get(target.__proto__, key, receiver);
      }
      const value = Reflect.get(target, key, receiver);
      if (
        typeof key === "string" &&
        key.indexOf("__") !== 0 &&
        _isNestValue(value)
      ) {
        return new Proxy(value, _createHandler(path + "." + key, doUpdate));
      }
      return value;
    },
    set(target: any, property: string, value: any) {
      // console.debug(`Property ${path}.${property} will change to:`, value);
      Reflect.set(target, property, value);
      if (typeof property === "string" && property.indexOf("__") !== 0) {
        doUpdate(path + "." + property, value);
      }
      return true;
    }
  };
}

// 返回一个 store
function _getStore<T>(
  { name, context, Store, params }: iParams<T extends Constructible ? T : any>,
  autoCreate?: boolean
): T | undefined {
  let maps = cachedContext.get(context);
  if (!maps) {
    maps = {};
    cachedContext.set(context, maps);
  }
  let instance = maps[name];
  if (instance || !autoCreate) {
    return instance;
  }
  // create new store
  instance = new Proxy(
    new Store(),
    _createHandler("", (path: string, value: any) => {
      // console.debug('doUpdate', path, value)
      const currentState = _getImmutableState<T>(instance);
      const nextState = produce(currentState, (draft: any) => {
        const deps = path.split(".");
        const len = deps.length;
        for (let i = 1; i < len - 1; i++) draft = draft[deps[i]];
        console.debug("set", draft, deps[len - 1], value);
        draft[deps[len - 1]] = value;
      });
      context[name] = nextState;
      // 链接到全局 State 的 state，被更改过的，初始为 undefined
      Reflect.set(instance, "__state", nextState);
    })
  );
  // /user?uid=100&age=200
  maps[name] = instance;
  const initialState: Json = { ...instance };
  // @ts-ignore 初始化时默认的 state，未经更改的
  instance.__initialState = createDraft(initialState);
  console.debug("draft", instance.__initialState);
  return instance;
}

// 返回一个缓存的 store
export function getStore<T>(
  params: iParams<T extends Constructible ? T : any>
) {
  return _getStore<T>(params);
}

// 返回一个缓存的 store，没有就新建
export function getStoreOrCreate<T>(
  params: iParams<T extends Constructible ? T : any>
) {
  return _getStore<T>(params, true) as T;
}

export function getState<T>(
  params: iParams<T extends Constructible ? T : any>
) {
  const store = getStore<T>(params);
  return store && _getImmutableState<T>(store);
}

export function getStateOrCreate<T>(
  params: iParams<T extends Constructible ? T : any>
) {
  const store = getStoreOrCreate<T>(params);
  return _getImmutableState<T>(store);
}
