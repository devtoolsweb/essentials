import { Transient } from '../lib'

const delay = async (msec: number) => {
  return new Promise<void>(resolve => {
    setTimeout(() => resolve(), msec)
  })
}

test('create transient', async () => {
  const t = new Transient({ seconds: 0.2 })
  await delay(100)
  expect(t.secondsLeft <= 0.1)
})
