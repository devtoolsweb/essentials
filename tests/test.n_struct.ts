import { BaseClass, BaseClassFlags, INStructChild, INStructContainer, isNStructContainer, NStructContainerMixin, StandardNStructChild } from '../lib'
import { IBitFlags } from '@devtoolsweb/ts-goodies'

let lastValue = 1

interface ITestClass extends INStructContainer {
    readonly value: number
}

type TestClassFlags = 'Test' | BaseClassFlags

interface TestClass {
    readonly flags: IBitFlags<TestClassFlags>
}

class TestClass extends NStructContainerMixin(StandardNStructChild(BaseClass))
    implements ITestClass {

    readonly value = lastValue++

    toJSON (): object {
        this.flags.setFlag('Test')
        return Object.assign(super.toJSON(), { value: this.value })
    }

}

const makeList = (n = 10) => {
    const list = new TestClass()
    for (let i = 0; i < n; i++) {
        list.addChild(new TestClass())
    }
    return list
}

const makeTree = (
    depth = 0,
    minNodes = 3,
    parent: INStructContainer | null = null,
    maxNodes = 9
) => {
    const tree = new TestClass()
    if (parent) {
        parent.addChild(tree)
    }
    if (depth > 0) {
        let n = Math.max(minNodes, Math.round(Math.random() * (maxNodes - 1) + 1))
        while (n-- > 0) {
            makeTree(depth - 1, minNodes, tree, maxNodes)
        }
    }
    return tree
}

test('computeNewChildIndex', () => {
    const parent = new TestClass()
    for (let i = 0; i < 100; i++) {
        const cc = parent.childCount
        const index = Math.trunc(2 * cc * Math.random()) - cc
        const ci = parent.computeNewChildIndex(index)
        const c = new TestClass()
        parent.insertChild(c, index)
        expect(c.childIndex).toBe(ci)
    }
})

test('create', () => {
    const obj = new TestClass()
    expect(obj.childCount).toBe(0)
    expect(obj.firstChild).toBe(null)
})

test('add child', () => {
    const parent = new TestClass()
    const child = new TestClass()
    parent.addChild(child)
    expect(parent.childCount).toBe(1)
    expect(child.parent).toBe(parent)
    expect(() => parent.addChild(child)).toThrow(Error)
    expect(() => child.addChild(parent)).toThrow(Error)
})

test('enum children', () => {
    const n = 100
    const parent = makeTree(1, n)
    let s = 0
    const lastValue = 0
    parent.enumChildren(c => {
        const obj = c as TestClass
        if (lastValue > 0) {
            expect(obj.value).toBe(lastValue + 1)
        }
        s += obj.value
    })
    const fc = parent.firstChild as TestClass
    expect(s).toBe(((2 * fc.value + n - 1) * n) / 2)
})

test('dispose', () => {
    const parent = new TestClass()
    const a = makeTree(3, 5)
    const b = makeTree(3, 5)
    const c = makeTree(3, 5)
    parent
        .addChild(a)
        .addChild(b)
        .addChild(c)
    expect(parent.childCount).toBe(3)
    b.dispose()
    expect(parent.childCount).toBe(2)
    a.dispose()
    expect(parent.childCount).toBe(1)
})

test('find child', () => {
    const n = 100
    const parent = makeTree(1, n)
    const fc = parent.firstChild as TestClass
    expect(parent.findChild((x: INStructChild) => (x as TestClass).value === fc.value + n + 1)).toBeNull()
    expect(parent.findChild((x: INStructChild) => (x as TestClass).value === fc.value + n / 2)).not.toBeNull()
})

test('insert child', () => {
    const parent = new TestClass()
    const n = 100
    for (let i = 0; i < n; i++) {
        const index = Math.trunc(parent.childCount * Math.random())
        const c = new TestClass()
        parent.insertChild(c, index)
        expect(c.childIndex).toBe(index)
    }
    for (let i = 0; i < n; i++) {
        const cc = parent.childCount
        const index = Math.trunc(cc * Math.random())
        const c = new TestClass()
        parent.insertChild(c, -(index + 1))
        expect(c.childIndex).toBe(cc - index - 1)
    }
})

test('iterate', () => {
    let n = 100
    const parent = makeTree(1, n)
    for (const _ of parent) {
        n--
    }
    expect(n).toBe(0)
})

test('remove child', () => {
    const n = 10
    const parent = makeTree(1, n)
    expect(parent.childCount).toBe(n)
    const fc = parent.firstChild as INStructChild
    parent.removeChild(fc)
    expect(parent.childCount).toBe(n - 1)
    expect(() => parent.removeChild(fc)).toThrow(Error)
})

test('root', () => {
    const parent = makeTree(3, 3)
    expect(parent.isRoot).toBeTruthy()

    const fc = (parent as INStructContainer).firstChild
    if (isNStructContainer(fc)) {
        expect(fc.isRoot).toBeFalsy()
        expect(fc.firstChild && fc.firstChild.isContainer ? fc.firstChild.root : null).toBe(parent)
    }
})

test('traverse tree', () => {
    const tree = makeTree(3, 2, null, 4)

    let c: INStructContainer = tree
    let n = 0
    while (isNStructContainer(c.firstChild)) {
        c = c.firstChild
        n++
    }

    let d = 0
    tree.traverseTree(c => {
        const t = c as TestClass
        if (t.level > 1) {
            return 'Leave'
        }
        d++
        return null
    })
    expect(d).toBe(tree.childCount + 1)

    d = 0
    tree.traverseTree(c => {
        const t = c as TestClass
        if (t.level > 2) {
            return 'LeaveTree'
        }
        d++
        return null
    })
    expect(d).toBe(n)
})

test('truncate', () => {
    let list = makeList(10)
    list.truncate(0)
    expect(list.childCount).toBe(0)

    list = makeList(10)
    list.truncate(10)
    expect(list.childCount).toBe(10)

    list = makeList(10)
    list.truncate(5)
    expect(list.childCount).toBe(5)

    list = makeList(10)
    list.truncate(-3)
    expect(list.childCount).toBe(7)

    list = makeList(10)
    list.truncate(-10)
    expect(list.childCount).toBe(0)
})
