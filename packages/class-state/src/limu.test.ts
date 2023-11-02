import { produce, createDraft } from "limu";
import { test, assert } from 'vitest';


test('base', () => {

    const state = {
        x: 1,
        y: 2,
        obj: {
            x: 1,
            y: 2
        }
    }
    // $
    const nextState = produce(state, draft => {
        // draft.obj.x = 100
    });
    assert.equal(state, nextState);
    assert.equal(state.obj, nextState.obj);


    // // context.user.text
    // const state = { text: '' }
    // // class 实例
    // const action = {
    //     // get context.user.text
    //     // set context.user.text
    //     // text = ''
    //     $add() {
    //         this.text = '1'
    //     }
    // }
    // const callAction = (func: Function) => {
    //     function update(draft) {
    //         const insThis = new Proxy(draft, {
    //             get(target, key) {
    //                 return draft[key] ?? action[key];
    //             },
    //             set(target, p, newValue, receiver) {
    //                 if (p in draft) {
    //                     draft[p] = newValue;
    //                 }
    //             },
    //         })
    //         func.call(insThis);
    //     }
    //     const nextState = produce(state, update)
    //     if (nextState!== state) {
    //         // state = nextState;
    //          initState -> contextState
    //          proxy
    //          1. state
    //          2. $func
    //          3. new -> set(keys)
    //     }
    //     // context.user = nextState
    // }
    // callAction(action.$add);
})
// a, b

// {
//     a = 1
//     b = 'abc'
// }

// $setB(value: string) {
//     if (this.a === 1) {
//         this.b = value
//     }
// }
// const user = new User()
// user.name = contextState
// user.name = contextState