export interface ContextState {
  __rootState: true;
  [x: string]: any;
}
export interface ContextStateOptions {
  state?: ContextState;
  observable?: (data: any) => any;
}
export function createContextState(options: ContextStateOptions = {}): ContextState {
  const { state, observable } = options;
  const currentState = state || {
    __rootState: true
  };
  return observable ? observable(currentState) : currentState;
}
