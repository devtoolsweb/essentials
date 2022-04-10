import { delay } from './utils'
import { Transient } from '../lib'

test('create transient', async () => {
    const t = new Transient({ seconds: 0.2 })
    await delay(100)
    expect(t.secondsLeft <= 0.1)
})

test('isExpired()', async () => {
    const t = new Transient<number>({ seconds: 0.2 })
    await delay(100)
    expect(t.isExpired).toBeFalsy()
    await delay(200)
    expect(t.isExpired).toBeTruthy()
})

test('get()', async () => {
    const testValue = 123
    const t = new Transient<number>({
        seconds: 0.2,
        value: testValue
    })
    await delay(100)
    expect(t.get()).toBe(testValue)
    await delay(200)
    expect(t.get()).toBeUndefined()
})

test('reset()', async () => {
    const testValue = 123
    const t = new Transient<number>({
        seconds: 0.2,
        value: testValue
    })
    await delay(100)
    t.reset()
    expect(t.get()).toBe(testValue)
    expect(t.isExpired).toBeFalsy()
    expect(t.secondsLeft).toBeGreaterThan(0.1)
})

test('set()', async () => {
    const a = 123
    const b = 555
    const t = new Transient<number>({
        seconds: 0.2,
        value: a
    })
    await delay(100)
    t.set(b)
    expect(t.get()).toBe(b)
    expect(t.isExpired).toBeFalsy()
    expect(t.secondsLeft).toBeGreaterThan(0.1)
    await delay(200)
    expect(t.get()).toBeUndefined()
    expect(t.isExpired).toBeTruthy()
    expect(t.secondsLeft).toBeLessThan(0)
})
