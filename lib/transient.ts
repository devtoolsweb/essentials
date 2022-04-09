export interface ITransient<T> {
    readonly expirationTime: Date
    readonly isExpired: boolean
    readonly secondsLeft: number
    get(): T | undefined
    reset(): void
    set(value: T): void
}

export interface ITransientArgs<T> {
    expirationTime?: Date
    seconds?: number
    value?: T
}

export class Transient<T> implements ITransient<T> {

    private currentExpirationTime: Date

    private readonly intervalInSeconds: number

    private value?: T

    constructor (args: ITransientArgs<T>) {
        this.value = args.value
        let et = args.expirationTime
        const s = args.seconds
        const now = Date.now()
        if (!et && s) {
            et = new Date(now + s * 1000)
        }
        if (!et || et.valueOf() <= now) {
            throw new Error('Invalid transient expiration time')
        }
        this.currentExpirationTime = et
        this.intervalInSeconds = (et.valueOf() - now) / 1000
    }

    get expirationTime () {
        return this.currentExpirationTime
    }

    get isExpired () {
        return this.secondsLeft <= 0
    }

    get secondsLeft () {
        return (this.expirationTime.valueOf() - Date.now()) / 1000
    }

    get () {
        if (this.isExpired) {
            this.value = undefined
        }
        return this.value
    }

    reset () {
        this.currentExpirationTime = new Date(Date.now() + this.intervalInSeconds * 1000)
    }

    set (value: T) {
        this.reset()
        this.value = value
    }

}
