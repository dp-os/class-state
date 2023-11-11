import { assert, test } from 'vitest';
import { getStoreOrCreate, getStoreAuto } from './store';
import { createContextState } from './context';


test('base value Type', () => {
    const context = createContextState();

    class User {
        public static storeName = 'user';
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
        public static storeName = 'user';
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
        public static storeName = 'user';
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
    const userStore = getStoreOrCreate({
        context,
        Store: User,
    });
    const setAge = userStore.$setAge.bind(userStore);


    userStore.$setName('test');
    assert.equal(userStore.name, 'test');
    assert.equal(userStore.age, 0);

    userStore.$setAge(100);
    assert.equal(userStore.name, 'test');
    assert.equal(userStore.age, 100);

    setAge(200);
    assert.equal(userStore.name, 'test');
    assert.equal(userStore.age, 200);
})
test('Commit function return value', () => {
    const context = createContextState();
    class User {
        public static storeName = 'user';
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
        public static storeName = 'user';
        public list: string[] = []
        public $set(...names: string[]) {
            this.list = names;
        }

    }
    const userStore = getStoreOrCreate({
        context,
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
        public static storeName = 'blog';
        public text = '';
        public $setText(text: string) {
            this.text = text;
        }
    }
    class User {
        public static storeName = 'user';
        public uid = 0;
        public get blog() {
            return getStoreAuto({
                Store: Blog,
            })
        }
        public $send(uid: number, text: string) {
            this.uid = uid;
            this.blog?.$setText(text);
        }
    }
    const userStore = getStoreOrCreate({
        context,
        Store: User,
    });

    userStore.$send(1, 'test');
    assert.equal(userStore.uid, 1);
    assert.isNotNull(userStore.blog);
    assert.equal(userStore.blog?.text, 'test')

})

test('Correct value type', () => {
    const context = createContextState();
    class User {
        public static storeName = 'user';
        public name = '';
        public age = 100
        public online = true
        public text: string | null = null
        public list: string[] = []
        public obj = {}
    }


    assert.doesNotThrow(() => {
        getStoreOrCreate({
            context,
            Store: User,
        });
    })

});

test('Wrong value type', () => {
    const context = createContextState();
    const values = [
        undefined,
        new Date(),
        new Map(),
        new Set(),
    ];
    values.forEach((value, index) => {
        const type = Object.prototype.toString.call(value).slice(8, -1)
        class User {
            public static storeName = 'user' + index;
            public value = value;
        }

        assert.Throw(() => {
            getStoreOrCreate({
                context,
                Store: User,
            });
        }, `Unsupported property type ${type}: User.value`)
    })

});


test('Wrong class type', () => {
    const context = createContextState();
    class Blog { }
    class User {
        public static storeName = 'user';
        public blog = new Blog();
    }

    assert.Throw(() => {
        getStoreOrCreate({
            context,
            Store: User,
        });
    }, 'Unsupported property type Blog: User.blog')

});