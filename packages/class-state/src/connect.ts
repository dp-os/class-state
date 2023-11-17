import { produce } from 'limu';
import { State, getStateContext, StateContext } from './create';
import { createFullPath } from './path';

export type StoreConstructor = {
    new(...args: any[]): any;
};

export type StoreParams = Record<string, any>;

let currentStateContext: StateContext | null = null;

export class StoreContext {
    /**
     * Library private properties, not available externally
     */
    public _stateContext: StateContext | null;
    /**
     * Library private properties, not available externally
     */
    public _raw: any;
    /**
     * Library private properties, not available externally
     */
    public _proxy: any;
    /**
     * Path in state
     */
    public readonly fullPath: string;
    /**
     * State of Store
     */
    public state: any;
    public connecting: boolean;
    public constructor(stateContext: StateContext, raw: any, state: Record<string, any>, fullPath: string) {

        this._stateContext = stateContext;
        stateContext.add(fullPath, this);

        this._raw = raw;
        this._proxy = proxyClass(this);

        this.state = state;
        this.fullPath = fullPath;
        this.connecting = stateContext.hasState(fullPath);
    }
    /**
     * Library private method, not available externally
     */
    public _setState(nextState: any) {
        if (this.state === nextState) return;
        const { _stateContext, fullPath } = this;
        if (_stateContext) {
            _stateContext.updateState(fullPath, nextState);
            this.state = _stateContext.state[fullPath];
            this.connecting  = true;
        } else {
            this.state = nextState;
            this.connecting  = false
        }
        this._proxy = proxyClass(this);
    }
    /**
     * Disconnect from state and release memory
     */
    public disconnect = () => {
        const { _stateContext } = this;
        if (_stateContext) {
            _stateContext.del(this.fullPath);
            this._stateContext = null;
        }
    }
}

export function connectState(state: State) {
    const stateContext = getStateContext(state);
    return <T extends StoreConstructor>(Store: T, name: string, ...params: ConstructorParameters<T>): InstanceType<T> & { $: StoreContext } => {
        const fullPath = createFullPath(name, params[0]);
        let storeContext: StoreContext | null = stateContext.get(fullPath);
        if (!storeContext) {
            const store = new Store(...params);
            let storeState;
            if (fullPath in state) {
                storeState = { ...store, ...state[fullPath] }
            } else {
                storeState = { ...store };
            }
            storeContext = new StoreContext(stateContext, store, storeState, fullPath);
        }
        return storeContext._proxy;
    }
}

export function connectCurrent<T extends StoreConstructor>(Store: T, name: string, ...params: ConstructorParameters<T>) {
    if (!currentStateContext) {
        throw new Error('No state context found');
    }
    return connectState(currentStateContext.state)(Store, name, ...params);
}



function proxyClass(storeContext: StoreContext) {
    return new Proxy(storeContext._raw, {
        get(target, p, receiver) {
            if (p === '$') {
                return storeContext;
            }
            const state = storeContext.state;
            const preStateContext = currentStateContext;
            currentStateContext = storeContext._stateContext;
            if (p in state) {
                if (!storeContext.connecting && currentStateContext) {
                    currentStateContext.depend();
                }
                return state[p];
            }
            const result = Reflect.get(target, p, receiver);
            currentStateContext = preStateContext;
            if (typeof result === 'function' && typeof p === 'string' && p.startsWith('$')) {
                return proxyCommit(result, storeContext);
            }

            return result;
        },
        set(target, p, newValue, receiver) {
            if (p in storeContext.state) {
                storeContext.state[p] = newValue;
                return true;
            }
            return Reflect.set(target, p, newValue, receiver);
        }
    })
}

function proxyCommit(commitFunc: Function, connectContext: StoreContext) {
    return function proxyCommit(...args: any) {
        const prevState = connectContext.state;
        let result;
        const nextState = produce(prevState, (draft) => {
            try {
                connectContext.state = draft;
                result = commitFunc.apply(connectContext._proxy, args)
                connectContext.state = prevState;
            } catch (e) {
                connectContext.state = prevState;
                throw e;
            }
        });
        connectContext._setState(nextState);

        return result;
    }
}
