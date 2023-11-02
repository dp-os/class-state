import { assert, test } from 'vitest';
import { getStoreOrCreate, getStateOrCreate } from './store';
import { createContextState } from './context';


test('base value Type', () => {
    const contextState = createContextState();

    class User {
        public name = ''
        public $setName(name: string) {
            this.name = name
        }
    }
    const params = {
        context: contextState,
        name: 'user',
        Store: User
    }
    const user = getStoreOrCreate<User>(params);

    assert.equal(user.name, '')
    assert.isUndefined(contextState.user);

    user.$setName('myName')
    assert.equal(user.name, 'myName')
    assert.equal(contextState.user, getStateOrCreate(params))

})


// test('base array', () => {
//     const contextState = createContextState();

//     const testState  = {
//         user: {
//             list: []
//         }
//     }
//     // {...new User()}
//     // $ 打头的方法约定变更 -> 每一次变化的时候 state 要生成一个新的对象 nextState
//     // produce(new Proxy(testState.user), () => {
//     // 
//     // })
//     class User {
//         public list: string[] = []
//         public $add(name: string) {
//             this.list.push(name);
//             // const nextState = produce(state,  () => {
//                 // user.$add()
//             // }) 
//             // context[name].
//             // const cur = new Proxy(baseState);
//             // const nextState = produce(cur, (draft) => {
//             //      this.$add.call(cur, ...args);
//             //   });
//         }
//     }
//     const params = {
//         context: contextState,
//         name: 'user',
//         Store: User
//     }
//     const user = getStoreOrCreate<User>(params);

//     const prev = user.list;
//     assert.equal(user.list.length, 0)
//     assert.isUndefined(contextState.user);

//     user.$add('name')
//     assert.notEqual(prev, user.list);
//     assert.equal(prev.length, 0);
//     console.log('>>>>>>', user.list, user.list.length)
//     assert.equal(user.list.length, 1);

//     assert.equal(contextState.user, getStateOrCreate(params))
// })

// /**
//  * app.vue
//  *      - user1.list('user -> contextState.user.list')
//  *      - user2.list('user -> contextState.user.list')
//  *      - user3.list('user -> contextState.user.list')
//  *          - > commit list.push('1')
//  *          - user1.list -> ['1']
//  *          - user2.list -> ['1']
//  *          - user3.list -> ['1']
//  */