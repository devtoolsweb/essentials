import { INStructChildConstructor } from './n_struct'
import { INStructContainer, INStructChild } from './n_struct'

export interface IBaseItemContainer<T extends IItem = IItem> extends INStructContainer<T> {
  isItemSelected(item: T): boolean
  selectItem(item: T): this
  unselectItem(item: T): this
}

export interface IItem extends INStructChild {
  isSelected: boolean
  itemContainer: IBaseItemContainer | null
  updateSelection(isSelected?: boolean): void
}

export function ItemMixin<TBase extends INStructChildConstructor>(
  Base: TBase
): TBase & INStructChildConstructor<IItem> {
  return class MixedItem extends Base implements IItem {
    get itemContainer(): IBaseItemContainer | null {
      return this.parent ? (this.parent as IBaseItemContainer) : null
    }

    get isSelected(): boolean {
      const p = this.itemContainer
      return p ? p.isItemSelected(this) : false
    }

    set isSelected(value: boolean) {
      const p = this.itemContainer
      if (p && value !== this.isSelected) {
        if (value) {
          p.selectItem(this)
        } else {
          p.unselectItem(this)
        }
      }
    }

    /**
     * Called from container when item selection changes.
     */
    updateSelection(_: boolean = false): void {}
  }
}
