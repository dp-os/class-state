import type { StoreContext} from './connect';
export interface State {
    /**
     * Just for the TS type to be checked correctly, this attribute does not exist in actual operation
     */
    'https://github.com/dp-os/class-state': true;
    [x: string]: any
}
export interface StateOptions {
    /**
     * When rendering on the server, it is necessary to pass in the state
     */
    state?: Record<string, any>;
}

export class StateContext {
    public readonly state: State;
    private readonly storeContext: Map<string, StoreContext> = new Map<string, StoreContext>();
    public constructor (state: State) {
        this.state = state;
    }
    public get(name: string): StoreContext | null {
        return this.storeContext.get(name) || null;
    }
    public add(name: string, storeContext: StoreContext) {
        this.storeContext.set(name, storeContext);
    }
    public updateState(name: string, nextState: any) {
        this.state[name] = nextState;
    }
    public del(name: string) {
        delete this.state[name]
        this.storeContext.delete(name);
    }
}



const rootMap = new WeakMap<State, any>();

function setStateContext(state: State, context: StateContext) {
    rootMap.set(state, context);
}

export function getStateContext(state: State): StateContext {
    return rootMap.get(state)!;
}


export function createState(options: StateOptions = {}): State {
    const state: any = options.state ? options.state : {};

    setStateContext(state, new StateContext(state))
    return state;
}