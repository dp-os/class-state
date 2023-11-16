import { reactive, watch, ref, nextTick } from 'vue2';

import { test,assert } from 'vitest';
import { getStoreOrCreate } from './store';
import { createContextState } from './context';

test('vue2 reactive', async () => {
    let isChanged = false;
    const xU = reactive({ name: 'test' });
    watch(() => xU.name, () => {
        isChanged = true;
    });
    // TODO
    xU.name = 'test2';
    await nextTick();
    assert.isTrue(isChanged);
})

test('base', async () => {
    const context = createContextState({
        observable: reactive
    });

    class User {
        public static storeName = 'user';
        name = 'test';
        public $set(name: string) {
            this.name = name;
        }
    }
    const userStore = getStoreOrCreate({ context, Store: User });
    let isChanged = false;
    watch(() => {
        return userStore.name
    }, () => {
        isChanged = true;
    }, {
        flush: 'sync'
    })
    // TODO
    userStore.$set('test2')
    await nextTick();
    assert.isTrue(isChanged);
})