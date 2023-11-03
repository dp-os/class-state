import Vue2, { reactive, watch } from 'vue2';

import { test,assert } from 'vitest';
import { getStoreOrCreate } from './store';
import { createContextState } from './context';

test('base', () => {
    // {}
    // {}
    const context = reactive(createContextState());

    class User {
        name = 'test';
        public $set(name: string) {
            this.name = name;
        }
    }
    const userStore = getStoreOrCreate({
        name: 'user',
        context,
        Store: User
    });
    let isChanged = false;
    watch(() => {
        return userStore.name
    }, () => {
        isChanged = true;
    })
    // TODO
    userStore.$set('test2')
    assert.isTrue(isChanged);
})