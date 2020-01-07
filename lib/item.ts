import { INStructChildConstructor } from './n_struct'
import { INStructContainer, INStructChild } from './n_struct'

export interface IBaseItemContainer extends INStructContainer {
  isItemSelected(item: IItem): boolean
  selectItem(item: IItem): this
  unselectItem(item: IItem): this
}

export interface IItem extends INStructChild {
  isSelected: boolean
  itemContainer: IBaseItemContainer | null
  updateSelection(isSelected?: boolean): void
}

export function ItemMixin<TBase extends INStructChildConstructor>(
  Base: TBase
): TBase & INStructChildConstructor<IItem> {
  return class Item extends Base implements IItem {
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
