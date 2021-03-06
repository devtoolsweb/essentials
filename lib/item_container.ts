/**
 * WARNING: When declaring an object, ItemizedMixin should follow
 * after NStructContainerMixin in the list of mixins, so that some
 * methods of the NStructContainerMixin can be overridden.
 */
import { BaseClassFlags } from './base_class'
import { Constructor } from 'type-fest'
import { IBaseItemContainer, IItem } from './item'
import { IBitFlags } from '@devtoolsweb/ts-goodies'
import { INStructChild, INStructContainer, INStructContainerConstructor } from './n_struct'

export type ItemContainerFlags = 'AllowMultiselect' | 'RoundRobin' | BaseClassFlags

export interface IItemContainer<T extends IItem = IItem> extends IBaseItemContainer<T> {
    allowMultiselect: boolean
    readonly firstSelectedIndex: number
    readonly itemCount: number
    readonly items: Iterable<T> | null
    roundRobin: boolean
    readonly selectedCount: number
    enumItems(visit: (item: T, index?: number) => boolean): this
    enumSelectedItems(visit: (item: T) => boolean): this
    getItemAt(index: number): T | null
    isItemSelected(item: T): boolean
    selectAll(): this
    selectItem(item: T): this
    selectItemAt(index: number): this
    selectNext(increment?: number): this
    unselectAll(): this
    unselectItem(item: T): this
}

const emptyItems = Object.freeze(new Set<IItem>())

export interface IItemContainerConstructor<T extends IItem = IItem>
    extends INStructContainerConstructor<IItemContainer<T>> {}

export function ItemContainerMixin<
    T extends IItem,
    TBase extends Constructor<INStructContainer<T>>
> (Base: TBase): TBase & IItemContainerConstructor<T> {
    return class MixedItemContainer extends Base implements IItemContainer<T> {

        readonly flags!: IBitFlags<ItemContainerFlags>

        private $inProcessItems!: Set<T>

        private $selectedItems!: Set<T>

        /**
         * Is multiple item selection allowed?
         *
         * @returns {boolean} result
         */
        get allowMultiselect (): boolean {
            return this.flags.isSet('AllowMultiselect')
        }

        set allowMultiselect (value: boolean) {
            if (this.allowMultiselect === value) {
                if (value) {
                    this.flags.setFlag('AllowMultiselect')
                }
                else {
                    this.flags.unset('AllowMultiselect')
                }
                const si = this.selectedItems
                if (!value && si.size > 0) {
                    // Unselect all items except first.
                    const first = this.firstSelectedItem
                    this.unselectAll()
                    if (first) {
                        this.selectItem(first)
                    }
                }
            }
        }

        /**
         * Returns index of the first selected item.
         *
         * @returns {number} Index
         */
        get firstSelectedIndex (): number {
            const si = this.selectedItems
            if (si.size > 0) {
                let index = 0
                for (const item of this.items as T[]) {
                    if (si.has(item)) {
                        return index
                    }
                    index++
                }
            }
            return -1
        }

        get firstSelectedItem (): T | null {
            const si = this.selectedItems
            if (si.size > 0) {
                for (const item of this.items as T[]) {
                    if (si.has(item)) {
                        return item
                    }
                }
            }
            return null
        }

        /**
         * The collection of items may not coincide with the collection of children,
         * so we can't use property childCount here.
         *
         * @returns {number} Item count
         */
        get itemCount (): number {
            return this.items ? this.items.length : 0
        }

        /**
         * Returns an iterable collection of child items.
         *
         * @returns {Array} Collection of child items
         */
        get items (): Array<T> | null {
            return this.children as Array<T>
        }

        /**
         * Is it possible to cycle through element selection?
         *
         * @returns {boolean} Result
         */
        get roundRobin (): boolean {
            return this.flags.isSet('RoundRobin')
        }

        set roundRobin (value: boolean) {
            if (value) {
                this.flags.setFlag('RoundRobin')
            }
            else {
                this.flags.unset('RoundRobin')
            }
        }

        get selectedCount () {
            return this.selectedItems.size
        }

        get selectedItems (): Set<T> {
            return this.$selectedItems || emptyItems
        }

        // The collection of items may not coincide with the collection of children,
        // so we can't use method enumChildren() here.
        enumItems (visit: (item: T, index?: number) => boolean): this {
            if (this.itemCount > 0) {
                let i = 0
                for (const item of this.items as T[]) {
                    if (visit(item, i++) === false) {
                        break
                    }
                }
            }
            return this
        }

        enumSelectedItems (visit: (item: T) => boolean): this {
            for (const item of this.selectedItems) {
                if (visit(item) === false) {
                    break
                }
            }
            return this
        }

        // The collection of items may not coincide with the collection of children,
        // so we can't use method getChildAt() here.
        getItemAt (index: number): T | null {
            const xs = this.items
            if (xs && index >= 0 && index < xs.length) {
                return xs[index]
            }
            return null
        }

        isItemSelected (item: T): boolean {
            return this.selectedItems.has(item)
        }

        removeChild (child: INStructChild): this {
            if (this.isItemSelected(child as T)) {
                this.unselectItem(child as T)
            }
            return super.removeChild(child as T)
        }

        selectAll (): this {
            if (!this.allowMultiselect) {
                throw new Error('Multiple selection is not allowed')
            }
            return this.enumItems((item: T): boolean => {
                this.selectItem(item)
                return true
            })
        }

        selectItem (item: T): this {
            this.handleItem(item, () => {
                if (item.parent !== this) {
                    throw new Error('Item is not in the container')
                }
                if (!this.allowMultiselect) {
                    this.unselectAll()
                }
                const si = this.createSelectedItems()
                if (!si.has(item)) {
                    si.add(item)
                    item.updateSelection(true)
                }
            })
            return this
        }

        selectItemAt (index: number): this {
            const x = this.getItemAt(index)
            if (!x) {
                throw new Error(`Container doesn't contain item with index ${index}`)
            }
            return this.selectItem(x)
        }

        selectNext (increment = 1): this {
            const n = this.itemCount
            if (increment !== 0 && n > 0) {
                const index = this.firstSelectedIndex
                this.unselectAll()
                const nextIndex = this.roundRobin ? (index + n + (increment % n)) % n : index + increment
                if (nextIndex >= 0 && nextIndex < n) {
                    this.selectItemAt(nextIndex)
                }
            }
            return this
        }

        selectPrev (): this {
            return this.selectNext(-1)
        }

        unselectAll (): this {
            for (const item of this.selectedItems) {
                this.unselectItem(item)
            }
            return this
        }

        unselectItem (item: T): this {
            this.handleItem(item, () => {
                const si = this.selectedItems
                if (!si.has(item)) {
                    throw new Error('Item is not in the container')
                }
                si.delete(item)
                item.updateSelection(false)
            })
            return this
        }

        private createSelectedItems () {
            let si = this.$selectedItems
            if (!si) {
                si = this.$selectedItems = new Set<T>()
            }
            return si
        }

        private handleItem (item: IItem, body: () => void) {
            let inProcessItems: Set<IItem> = this.$inProcessItems
            if (!inProcessItems) {
                inProcessItems = this.$inProcessItems = new Set<T>()
            }
            if (!inProcessItems.has(item)) {
                inProcessItems.add(item)
                body()
                inProcessItems.delete(item)
            }
        }

    }
}
