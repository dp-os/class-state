import { test, assert } from 'vitest'
import { connectState, connectCurrent } from './connect';
import { createState } from './create'

test('Base', () => {
    const state = createState();
    const STORE_NAME = 'user';
    const connectStore = connectState(state);
    class User {
        public name = ''
        public age = 18;
        public text = ''
        public online = false;
        public constructor() {
            Object.defineProperty(this, 'online', {
                enumerable: false
            })
        }
        public $setName(name: string) {
            this.name = name
        }
        public $setAge(age: number) {
            this.age = age
        }
        public $buildText() {
            this.text = `${this.name} is ${this.age} years old.`
        }
        public $toggleOnline() {
            this.online = !this.online
        }
    }
    const user = connectStore(User, STORE_NAME);

    assert.equal(user.name, '');
    assert.isUndefined(state.user);

    user.$setName('jack')
    assert.strictEqual(user.name, 'jack');
    assert.strictEqual(state.user.name, user.name);

    user.$setAge(20)
    assert.strictEqual(user.age, 20);
    assert.strictEqual(state.user.age, user.age);

    user.$buildText()
    assert.strictEqual(user.text, 'jack is 20 years old.');
    assert.strictEqual(state.user.text, user.text);

    assert.isUndefined(state.user.online);
    assert.strictEqual(user.online, false)
    user.$toggleOnline()
    assert.strictEqual(user.online, true)
});

test('Object type', () => {
    const state = createState();
    const STORE_NAME = 'user';
    const connectStore = connectState(state);
    class User {
        public data = {
            name: '',
            age: 18
        }
        public get text() {
            return `${this.data.name} is ${this.data.age} years old.`
        }
        public $setName(name: string) {
            this.data.name = name
        }
        public $setAge(age: number) {
            this.data.age = age
        }
    }
    const user = connectStore(User, STORE_NAME);

    const preData = user.data;
    user.$setName('jack')
    assert.strictEqual(user.data.name, 'jack');
    assert.strictEqual(user.data.age, 18);
    assert.notStrictEqual(user.data, preData);

    assert.strictEqual(user.text, 'jack is 18 years old.');

});

test('Commit function this bind', () => {
    const state = createState();

    const STORE_NAME = 'user';
    const connectStore = connectState(state);
    class User {
        public name = ''
        public $setName(name: string) {
            this.name = name
        }
    }
    const user = connectStore(User, STORE_NAME);
    const setName = user.$setName;
    setName('jack');

    assert.strictEqual(user.name, 'jack');
})

test('Commit function return value and args', () => {
    const state = createState();

    const STORE_NAME = 'user';
    const connectStore = connectState(state);
    class User {
        public list: string[] = []
        public $add(...list: string[]) {
            this.list.push(...list)
            return true
        }
    }

    const user = connectStore(User, STORE_NAME);
    assert.isTrue(user.$add('jack', 'tom'))
    assert.deepEqual(user.list, ['jack', 'tom'])

})

test('Instance reference', () => {
    const state = createState();

    const STORE_NAME = 'user';
    const connectStore = connectState(state);
    class User {
        public name = ''
        public $setName(name: string) {
            this.name = name
        }
    }
    const user = connectStore(User, STORE_NAME);
    assert.strictEqual(user, connectStore(User, STORE_NAME));

    user.$setName('jack')

    assert.notStrictEqual(user, connectStore(User, STORE_NAME));
})

test('Disconnect', () => {
    const state = createState();
    const STORE_NAME = 'user';
    const connectStore = connectState(state);
    class User {
        public name = ''
        public $setName(name: string) {
            this.name = name
        }
    }
    const user = connectStore(User, STORE_NAME);

    assert.isUndefined(state.user)

    user.$setName('jack')
    assert.strictEqual(state.user, user.$.state)

    user.$.disconnect();
    assert.isUndefined(state.user)
    assert.isNull(user.$._stateContext);
})
test('Preset state', () => {
    const STORE_NAME = 'user';
    const state = createState({
        state: {
            [STORE_NAME]: {
                name: 'jack'
            }
        }
    });
    const connectStore = connectState(state);
    class User {
        public name = ''
        public age = 18;
    }
    const user = connectStore(User, STORE_NAME);

    assert.strictEqual(user.name, 'jack')
    assert.strictEqual(user.age, 18);
    assert.notStrictEqual(user.$.state, state.user);
    assert.deepEqual(state.user, { name: 'jack' })
})

test('State modification delay', () => {
    const STORE_NAME = 'user';
    const state = createState();
    const connectStore = connectState(state);

    class User {
        public static storeName = 'user';
        public name = ''
        public age = 0

        public $setAge(age: number) {
            this.age = age;
        }
        public $setName(name: string) {
            this.name = name;
        }
    }
    const user = connectStore(User, STORE_NAME);
    const setAge = user.$setAge.bind(user);


    user.$setName('test');
    assert.equal(user.name, 'test');
    assert.equal(user.age, 0);

    user.$setAge(100);
    assert.equal(user.name, 'test');
    assert.equal(user.age, 100);

    setAge(200);
    assert.equal(user.name, 'test');
    assert.equal(user.age, 200);
})


test('Multiple instances', () => {
    const state = createState();
    const connectStore = connectState(state);

    class User {
        public name = ''
        public get blog() {
            return connectCurrent(Blog, 'blog');
        }
        public get log() {
            return `'${this.name}' published '${this.blog.text}'`
        }
        public $setName(name: string) {
            this.name = name;
        }
    }

    class Blog {
        public text = '';
        public $setText(text: string) {
            this.text = text;
        }
    }

    const user = connectStore(User, 'user');

    user.$setName('jack');
    user.blog.$setText('hello world.');

    assert.strictEqual(user.name, 'jack');
    assert.equal(user.log, `'jack' published 'hello world.'`);

})

test('Params', () => {
    const state = createState();
    const connectStore = connectState(state);

    class User {
        public name = ''
        public uid: number;
        public constructor(uid: number) {
            this.uid = uid;
        }
        public $setName(name: string) {
            this.name = name;
        }
    }
    const user100 = connectStore(User, 'user', 100);
    user100.$setName('jack');
    assert.strictEqual(user100.uid, 100);

    const user200 = connectStore(User, 'user', 200);
    user200.$setName('tom');
    assert.strictEqual(user100.uid, 100);
    assert.notStrictEqual(user100, user200);

    assert.strictEqual(state['user?100'], user100.$.state);
    assert.strictEqual(state['user?200'], user200.$.state);

    assert.deepEqual(state['user?100'], { uid: 100, name: 'jack' })
    assert.deepEqual(state['user?200'], { uid: 200, name: 'tom' })
})