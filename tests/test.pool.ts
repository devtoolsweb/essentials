import { IPool, IReusable, Pool } from '../lib'

let counter = 0

interface ITestObject extends IReusable {}

class TestObject {
  readonly index = ++counter

  reset (): this {
    return this
  }
}

const createPool = (): IPool<ITestObject> => {
  const pool = new Pool<ITestObject>({ createItem: () => new TestObject() })
  for (let i = 0; i < 10; i++) {
    pool.getItem()
  }
  return pool
}

test('getItem', () => {
  const pool = createPool()
  expect(pool.freeCount).toBe(0)
  expect(pool.size).toBe(10)
  expect(pool.usedCount).toBe(10)
})

test('releaseItem', () => {
  const pool = createPool()
  const vectors = Array.from(pool.items)
  for (let i = 0; i < vectors.length; i += 3) {
    pool.releaseItem(vectors[i])
  }
  expect(pool.freeCount).toBe(4)
  expect(pool.size).toBe(10)
  expect(pool.usedCount).toBe(6)
  for (let i = 0; i < 20; i++) {
    pool.getItem()
  }
  pool.releaseItem(vectors[1])
  expect(pool.freeCount).toBe(1)
  expect(pool.size).toBe(26)
  expect(pool.usedCount).toBe(25)
})
