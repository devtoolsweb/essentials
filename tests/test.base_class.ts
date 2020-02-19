import { BaseClass, ClassName } from '../lib'

@ClassName('TestClassName')
class TestClass extends BaseClass {}

class DerivedClass extends TestClass {}

test('@ClassName() decorator', () => {
  const c = new TestClass()
  const d = new DerivedClass()
  expect(c.className).toBe('TestClassName')
  expect(d.className).toBeUndefined()
})

test('performUpdates', () => {
  const c = new TestClass()
  expect(c.isUpdating).toBeFalsy()
  c.performUpdates(() => {
    expect(c.isUpdating).toBeTruthy()
  })
  expect(c.isUpdating).toBeFalsy()
})
