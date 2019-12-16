import {
  ItemContainerMixin,
  ItemMixin,
  NStructChild,
  NStructMixin
} from '../lib'

class Test extends ItemContainerMixin(ItemMixin(NStructMixin(NStructChild))) {}

const createItemized = (n: number = 10): Test => {
  const parent = new Test()
  for (let i = 0; i < n; i++) {
    const c = new Test()
    parent.addChild(c)
  }
  return parent
}

test('select item', () => {
  const n = 10
  const obj = createItemized(n)
  expect(obj.itemCount).toBe(n)

  let j = 7
  obj.selectItemAt(j)
  expect(obj.firstSelectedIndex).toBe(j)

  obj.unselectItem(obj.getItemAt(j)!)
  expect(obj.firstSelectedIndex).toBe(-1)

  // obj.selectNext()
  // t.is(obj.selectedIndex, 0)

  // j = 3
  // for (let k = 0; k < j; k++) {
  //   obj.selectNext()
  // }
  // t.is(obj.selectedIndex, j)

  expect(() => obj.selectAll()).toThrow(Error)
})

test('select next', () => {
  const n = 15
  const obj = createItemized(n)
  expect(obj.itemCount).toBe(n)

  let j = 7
  obj.selectItemAt(j)
  expect(obj.firstSelectedIndex).toBe(j)

  obj.selectNext()
  expect(obj.firstSelectedIndex).toBe(j + 1)

  obj.roundRobin = true
  obj.selectNext(100)
  expect(obj.firstSelectedIndex).toBe((j + n + (101 % n)) % n)
})
