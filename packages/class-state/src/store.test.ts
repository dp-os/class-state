import { assert, test } from 'vitest';
import { getStoreOrCreate } from './store';
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
    const user = getStoreOrCreate(params) as User;

    assert.equal(user.name, '')
    assert.isUndefined(contextState.user);

    user.$setName('myName')
    assert.equal(user.name, 'myName')

});

class User {
    public list: string[] = []
    public $add(name: string) {
        this.list.push(name);
    }
}

function getUser (context: Record<string, any>) {

    const params = {
        context,
        name: 'user',
        Store: User
    }
    const user = getStoreOrCreate(params) as User;

    return user;
}

test('base class', () => {
    const contextState = createContextState();
    const user = getUser(contextState);

    assert.equal(user, getUser(contextState));

    user.$add('name');
    assert.notEqual(user, getUser(contextState));
})

test('Unenumerable value', () => {
    const contextState = createContextState();
    class User {
        public _count = 0
        public count = 0;
        public constructor () {
            Object.defineProperty(this, '_count', {
                enumerable: false
            })
        }
        public $add() {
            this._count++;
            this.count++;
        }
    }
    const params = {
        context: contextState,
        name: 'user',
        Store: User
    }
    const user = getStoreOrCreate(params) as User;

    // TODO: 
    assert.equal(user._count, 0)
    assert.equal(user.count, 0)
    user.$add();
    assert.equal(user._count, 1)
    assert.equal(user.count, 1)

})
