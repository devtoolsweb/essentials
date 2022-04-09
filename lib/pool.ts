import { IReusable } from './types'

export interface IPool<T extends IReusable> {
    readonly freeCount: number
    readonly items: IterableIterator<T>
    readonly size: number
    readonly usedCount: number
    getItem(): T
    releaseItem(item: T): this
    releaseItems(...items: T[]): this
}

export type PoolItemBuilder<T extends IReusable> = () => T

export interface IPoolOpts<T extends IReusable> {
    createItem: PoolItemBuilder<T>
}

export class Pool<T extends IReusable> implements IPool<T> {

    protected readonly createItem: PoolItemBuilder<T>

    protected readonly free = new Array<T>()

    protected readonly used = new Set<T>()

    constructor (p: IPoolOpts<T>) {
        this.createItem = p.createItem
    }

    get freeCount (): number {
        return this.free.length
    }

    get items (): IterableIterator<T> {
        return this.used.values()
    }

    get size (): number {
        return this.freeCount + this.usedCount
    }

    get usedCount (): number {
        return this.used.size
    }

    getItem (): T {
        const { free, used } = this
        const item = free.length > 0 ? (free.pop() as T).reset() : this.createItem()
        used.add(item)
        return item
    }

    releaseItem (item: T): this {
        if (!this.used.delete(item)) {
            throw new Error('Item is not included in used pool items')
        }
        this.free.push(item)
        return this
    }

    releaseItems (...items: T[]): this {
        items.forEach(item => this.releaseItem(item))
        return this
    }

    toString (): string {
        return `Pool { freeCount: ${this.free.length}, usedCount: ${
            this.used.size
        } }`
    }

}
