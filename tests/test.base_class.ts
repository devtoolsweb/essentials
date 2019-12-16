import { BaseClass, ClassName } from '../lib'

@ClassName('T')
class TestClass extends BaseClass {}

test('@ClassName() decorator', () => {
  const c = new TestClass()
  expect(c.className).toBe('T')
})
