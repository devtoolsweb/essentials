import { IBitFlags } from '@aperos/ts-goodies'
import {
  BaseClassFlags,
  INStructChild,
  INStructContainer,
  NStructChild,
  NStructContainerMixin,
  isNStructContainer
} from '../lib'

let lastValue = 1

interface ITestClass extends INStructContainer {
  readonly value: number
}

type TestClassFlags = 'Test' | BaseClassFlags

interface TestClass {
  readonly flags: IBitFlags<TestClassFlags>
}

class TestClass extends NStructContainerMixin(NStructChild)
  implements ITestClass {
  readonly value = lastValue++

  toJSON(): object {
    this.flags.set('Test')
    return Object.assign(super.toJSON(), { value: this.value })
  }
}

function makeTree(
  depth = 0,
  minNodes = 3,
  parent: INStructContainer | null = null,
  maxNodes = 9
): TestClass {
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
  let lastValue = 0
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

test('finalize', () => {
  const parent = new TestClass()
  const a = makeTree(3, 5)
  const b = makeTree(3, 5)
  const c = makeTree(3, 5)
  parent
    .addChild(a)
    .addChild(b)
    .addChild(c)
  expect(parent.childCount).toBe(3)
  b.finalize()
  expect(parent.childCount).toBe(2)
  a.finalize()
  expect(parent.childCount).toBe(1)
})

test('find child', () => {
  const n = 100
  const parent = makeTree(1, n)
  const fc = parent.firstChild as TestClass
  expect(
    parent.findChild(
      (x: INStructChild) => (x as TestClass).value === fc.value + n + 1
    )
  ).toBeNull()
  expect(
    parent.findChild(
      (x: INStructChild) => (x as TestClass).value === fc.value + n / 2
    )
  ).not.toBeNull()
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
  const fc = parent.firstChild!
  parent.removeChild(fc)
  expect(parent.childCount).toBe(n - 1)
  expect(() => parent.removeChild(fc)).toThrow(Error)
})

test('root', () => {
  const parent = makeTree(3, 3)
  expect(parent.isRoot).toBeTruthy()

  const fc = parent!.firstChild
  if (isNStructContainer(fc)) {
    expect(fc.isRoot).toBeFalsy()
    expect(
      fc.firstChild && fc.firstChild.isContainer ? fc.firstChild.root : null
    ).toBe(parent)
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
