/**
 * WARNING: When declaring an object, ItemizedMixin should follow
 * after NStructMixin in the list of mixins, so that some methods
 * of the NStructMixin can be overridden.
 */
import { IBitFlags } from '@aperos/ts-goodies'
import {
  INStructChild,
  INStructContainer,
  INStructContainerConstructor
} from './n_struct'
import { BaseClassFlags } from './base_class'
import { IBaseItemContainer, IItem } from './item'
import { IConstructor } from './types'

export type ItemContainerFlags =
  | 'AllowMultiselect'
  | 'RoundRobin'
  | BaseClassFlags

export interface IItemContainer extends IBaseItemContainer {
  roundRobin: boolean
  allowMultiselect: boolean
  readonly itemCount: number
  readonly items: Iterable<IItem> | null
  readonly selectedCount: number
  readonly firstSelectedIndex: number
  enumItems(visit: (item: IItem, index?: number) => boolean): this
  enumSelectedItems(visit: (item: IItem) => boolean): this
  getItemAt(index: number): IItem | null
  isItemSelected(item: IItem): boolean
  selectAll(): this
  selectItem(item: IItem): this
  selectItemAt(index: number): this
  selectNext(increment?: number): this
  unselectAll(): this
  unselectItem(item: IItem): this
}

const symInProcessItems = Symbol('ItemContainer.inProcessItems')
const symSelectedItems = Symbol('ItemContainer.selectedItems')

const createSelectedItems = (c: IItemContainer): Set<IItem> => {
  let si = (c as any)[symSelectedItems]
  if (!si) {
    si = (c as any)[symSelectedItems] = new Set<IItem>()
  }
  return si
}

const handleItem = (c: IItemContainer, item: IItem, body: () => void) => {
  let inProcessItems: Set<IItem> = (c as any)[symInProcessItems]
  if (!inProcessItems) {
    inProcessItems = (c as any)[symInProcessItems] = new Set<IItem>()
  }
  if (!inProcessItems.has(item)) {
    inProcessItems.add(item)
    body()
    inProcessItems.delete(item)
  }
}

const emptyItems = Object.freeze(new Set<IItem>())

export function ItemContainerMixin<
  TBase extends IConstructor<INStructContainer>
>(Base: TBase): TBase & INStructContainerConstructor<IItemContainer> {
  return class ItemContainer extends Base implements IItemContainer {
    readonly flags!: IBitFlags<ItemContainerFlags>

    /**
     * Possibility of multiple selection of items.
     */
    get allowMultiselect(): boolean {
      return this.flags.isSet('AllowMultiselect')
    }

    /**
     * Returns an iterable collection of child items.
     */
    get items(): Set<IItem> | null {
      return this.children as Set<IItem>
    }

    /**
     * The collection of items may not coincide with the collection of children,
     * so we can't use property childCount here.
     */
    get itemCount(): number {
      return this.items ? this.items.size : 0
    }

    /**
     * Possibility of cyclic selection of elements.
     */
    get roundRobin(): boolean {
      return this.flags.isSet('RoundRobin')
    }

    get selectedCount() {
      return this.selectedItems.size
    }

    get selectedItems(): Set<IItem> {
      return (this as any)[symSelectedItems] || emptyItems
    }

    /**
     * Returns index of the first selected item.
     */
    get firstSelectedIndex(): number {
      const si = this.selectedItems
      if (si.size > 0) {
        let index = 0
        for (const item of this.items!) {
          if (si.has(item)) {
            return index
          }
          index++
        }
      }
      return -1
    }

    get firstSelectedItem(): IItem | null {
      const si = this.selectedItems
      if (si.size > 0) {
        for (const item of this.items!) {
          if (si.has(item)) {
            return item
          }
        }
      }
      return null
    }

    set allowMultiselect(value: boolean) {
      if (this.allowMultiselect === value) {
        if (value) {
          this.flags.set('AllowMultiselect')
        } else {
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

    set roundRobin(value: boolean) {
      if (value) {
        this.flags.set('RoundRobin')
      } else {
        this.flags.unset('RoundRobin')
      }
    }

    /**
     * The collection of items may not coincide with the collection of children,
     * so we can't use method enumChildren() here.
     */
    enumItems(visit: (item: IItem, index?: number) => boolean): this {
      if (this.itemCount > 0) {
        let i = 0
        for (const item of this.items!) {
          if (visit(item, i++) === false) {
            break
          }
        }
      }
      return this
    }

    enumSelectedItems(visit: (item: IItem) => boolean): this {
      for (const item of this.selectedItems) {
        if (visit(item) === false) {
          break
        }
      }
      return this
    }

    /**
     * The collection of items may not coincide with the collection of children,
     * so we can't use method getChildAt() here.
     */
    getItemAt(index: number): IItem | null {
      const xs = this.items
      if (xs && index >= 0 && index < xs.size) {
        let i = 0
        for (const x of xs) {
          if (i++ === index) {
            return x
          }
        }
      }
      return null
    }

    isItemSelected(item: IItem): boolean {
      return this.selectedItems.has(item)
    }

    removeChild(child: INStructChild): this {
      this.unselectItem(child as IItem)
      return super.removeChild(child)
    }

    selectAll(): this {
      if (!this.allowMultiselect) {
        throw new Error('Multiple selection is not allowed')
      }
      return this.enumItems((item: IItem): boolean => {
        this.selectItem(item)
        return true
      })
    }

    selectItem(item: IItem): this {
      handleItem(this, item, () => {
        const xs = this.items
        if (!xs || !xs.has(item)) {
          throw new Error('Item is not in the container')
        }
        if (!this.allowMultiselect) {
          this.unselectAll()
        }
        const si = createSelectedItems(this)
        if (!si.has(item)) {
          si.add(item)
          item.updateSelection(true)
        }
      })
      return this
    }

    selectItemAt(index: number): this {
      const x = this.getItemAt(index)
      if (!x) {
        throw new Error(`Container doesn't contain item with index ${index}`)
      }
      return this.selectItem(x)
    }

    selectNext(increment: number = 1): this {
      const n = this.itemCount
      if (increment !== 0 && n > 0) {
        const index = this.firstSelectedIndex
        this.unselectAll()
        let nextIndex = this.roundRobin
          ? (index + n + (increment % n)) % n
          : index + increment
        if (index >= 0 && index < n) {
          this.selectItemAt(nextIndex)
        }
      }
      return this
    }

    selectPrev(): this {
      return this.selectNext(-1)
    }

    unselectAll(): this {
      for (const item of this.selectedItems) {
        this.unselectItem(item)
      }
      return this
    }

    unselectItem(item: IItem): this {
      handleItem(this, item, () => {
        const si = this.selectedItems
        if (!si.has(item)) {
          throw new Error('Item is not in the container')
        }
        si.delete(item)
        item.updateSelection(false)
      })
      return this
    }
  }
}
