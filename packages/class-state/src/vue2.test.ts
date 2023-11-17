import Vue, { reactive, watch, nextTick } from 'vue2';
import { test, assert } from 'vitest'
import { connectState, connectCurrent } from './connect';
import { createState } from './create'

test.only('base', async () => {
    const state = createState({
        proxy: Vue.observable,
        set: Vue.set,
        del: Vue.delete
    })
    const connectStore = connectState(state)
    class User {
        public name = ''
        public $setName(name: string) {
            this.name = name
        }
    }
    const user = connectStore(User, 'user');
    let updateValue;
    watch(() => {
        return user.name;
    }, (name) => {
        updateValue = name
    })
    user.$setName('test');
    await nextTick();
    assert.equal(updateValue, 'test')
})