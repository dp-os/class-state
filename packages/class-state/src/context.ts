export interface ContextState {
  __rootState: true;
  [x: string]: any;
}
export interface ContextStateOptions {
  state?: ContextState;
  observable?: (data: any) => any;
}
export function createContextState(options: ContextStateOptions = {}): ContextState {
  return options.state ? options.state : {
    __rootState: true
  };
}
