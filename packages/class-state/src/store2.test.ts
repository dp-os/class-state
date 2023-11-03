import { assert, test } from 'vitest';
import { getStoreOrCreate } from './store';
import { createContextState } from './context';


test('base value Type', () => {
    const context = createContextState();

    class User {
        name = ''
        age = 0
        online = false
        public constructor() {
            Object.defineProperty(this, 'online', {
                enumerable: false
            })
        }
        public $setName(name: string) {
            this.name = name;
        }
        public $setAge(age: number) {
            this.age = age;
        }
    }

    const userStore = getStoreOrCreate({
        context,
        name: 'user',
        Store: User,
    })
    assert.equal(userStore.name, '')
    assert.equal(userStore.age, 0)
    assert.equal(userStore.online, false)
    assert.isUndefined(context.user);

    userStore.online = true
    assert.equal(userStore.online, true)

    userStore.$setName('test');
    assert.equal(userStore.name, 'test')
    assert.equal(userStore.age, 0);
    assert.equal(userStore.online, true)

    assert.deepStrictEqual(context.user, {
        name: 'test',
        age: 0,
    })
    userStore.$setAge(100);
    assert.equal(userStore.name, 'test')
    assert.equal(userStore.age, 100);
    assert.equal(userStore.online, true)
    assert.deepStrictEqual(context.user, {
        name: 'test',
        age: 100,
    })
});

test('Immutable object', () => {
    const context = createContextState();

    class User {
        public data = {
            name: '',
            age: 0
        }
        public online = false;
        public $setOnline(online: boolean) {
            this.online = online;
        }
        public $setName(name: string) {
            this.data.name = name;
        }
    }
    const userStore = getStoreOrCreate({
        context,
        name: 'user',
        Store: User,
    });
    let oldData = userStore.data;
    assert.equal(oldData.name, '')
    assert.equal(oldData.age, 0);
    assert.equal(userStore.online, false);

    userStore.$setName('test');
    assert.equal(userStore.data.name, 'test')
    assert.equal(userStore.data.age, 0);
    assert.equal(userStore.online, false);
    assert.notEqual(oldData, userStore.data);

    oldData = userStore.data;
    userStore.$setOnline(true);
    assert.equal(userStore.data.name, 'test')
    assert.equal(userStore.data.age, 0);
    assert.equal(userStore.online, true);
    assert.equal(oldData, userStore.data);

})

test('Is this pointing normal', () => {
    const context = createContextState();

    class User {
        public name = ''
        public age = 0
        public text = '';

        public $setAge(age: number) {
            this.age = age;
            this.$updateText();
        }
        public $setName(name: string) {
            this.name = name;
            this.$updateText();
        }
        public $updateText() {
            this.text = `name: ${this.name}, age: ${this.age}`;
        }
    }
    const userStore = getStoreOrCreate({
        context,
        name: 'user',
        Store: User,
    });

    userStore.$setName('test');
    assert.equal(userStore.text, 'name: test, age: 0');
    assert.equal(userStore.name, 'test');
    assert.equal(userStore.age, 0);
})

test('State modification delay', () => {
    const context = createContextState();

    class User {
        public name = ''
        public age = 0

        public $setAge(age: number) {
            this.age = age;
        }
        public $setName(name: string) {
            this.name = name;
        }
    }
    const userStore = getStoreOrCreate({
        context,
        name: 'user',
        Store: User,
    });
    const setAge = userStore.$setAge.bind(userStore);


    userStore.$setName('test');
    assert.equal(userStore.name, 'test');
    assert.equal(userStore.age, 0);

    userStore.$setAge(100);
    assert.equal(userStore.name, 'test');
    assert.equal(userStore.age, 100);

    // # TODO
    // setAge(200);
    // assert.equal(userStore.name, 'test');
    // assert.equal(userStore.age, 200);
})
test('Commit function return value', () => {
    const context = createContextState();
    class User {
        public age = 0

        public $setAge(age: number) {
            if (age > 18) {
                this.age = age;
                return true
            }
            return false
        }
    }
    const userStore = getStoreOrCreate({
        context,
        name: 'user',
        Store: User,
    });

    assert.isFalse(userStore.$setAge(10))
    assert.equal(userStore.age, 0);
    assert.isTrue(userStore.$setAge(20))
    assert.equal(userStore.age, 20);
})

test('Commit function args', () => {
    const context = createContextState();
    class User {
        public list: string[] = []
        public $set(...names: string[]) {
            this.list = names;
        }

    }
    const userStore = getStoreOrCreate({
        context,
        name: 'user',
        Store: User,
    });
    userStore.$set('test1', 'test2');
    assert.deepEqual(userStore.list, ['test1', 'test2']);

    userStore.$set('test1', 'test2', 'test3');
    assert.deepEqual(userStore.list, ['test1', 'test2', 'test3']);

})


test('Multiple instances', () => {
    const context = createContextState();
    class Blog {
        public text = '';
        public $setText (text: string) {
            this.text = text;
        }
    }
    class User {
        public uid = 0;
        // public blog = new Blog();
        public get blog (): Blog {
            return getStoreOrCreate({
                context,
                name: 'blog',
                Store: Blog,
            })
        }
    }
    // TODO
    const userStore = getStoreOrCreate({
        context,
        name: 'user',
        Store: User,
    });
    userStore.blog.$setText('test');
})