/**
 * NStruct implements nested hierarchy of objects.
 * TODO: use undefined instead of null
 */
import { Constructor, IDisposable } from '@aperos/ts-goodies'
import { IBaseClassOpts, IBaseClass } from './base_class'

export interface INStructChild extends IDisposable {
  /**
   * @returns a hierarchical chain of objects, starting with the root
   * and ending with the current one.
   */
  readonly chain: INStructChild[]
  /**
   * @returns the current index of the object in the collection of child
   * objects of the parent object, or -1 if the object does not
   * have a parent object.
   */
  readonly childIndex: number
  readonly isContainer: boolean
  readonly level: number
  readonly parent: INStructContainer | null
  readonly root: INStructContainer | null
  hasAncestor(s: INStructContainer): boolean
  unlink(): this
  /**
   * Fires when a node changes the parent node.
   */
  updateParent(): void
}

export type NStructVisitorResult = 'Leave' | 'LeaveTree' | 'Omit' | null | void

export type NStructChildVisitor<T extends INStructChild> = (
  c: T,
  index?: number
) => NStructVisitorResult

export interface INStructContainer<T extends INStructChild = INStructChild> extends INStructChild {
  readonly childCount: number
  /**
   * @returns Collection of child objects.
   */
  readonly children: Array<T> | null
  /**
   * @returns First item from the collection of child objects,
   * or null if the collection is empty.
   */
  readonly firstChild: T | null
  readonly hasChildren: boolean
  readonly isLeaf: boolean
  readonly isRoot: boolean
  readonly root: INStructContainer | null
  [Symbol.iterator](): IterableIterator<T>
  /**
   * Adds an object to the collection of child objects.
   * Addition occurs at the end of the collection.
   */
  addChild(child: T): this
  addChildren(...list: T[]): this
  enumChildren(visit: NStructChildVisitor<T>): NStructVisitorResult
  findChild(predicate: (c: T) => boolean): T | null
  /**
   * Returns an object at the specified index in the collection of child objects.
   */
  getChildAt(index: number): T | null
  insertChild(child: T, index?: number): this
  /**
   * Recursively releases NStruct with the entire subtree.
   */
  releaseTree(): void
  /**
   * Removes an existing object from the collection of child objects.
   * It does not release the object after removal.
   */
  removeChild(child: T): this
  /**
   * Removes all immediate descendants of a node.
   * NOTE: This method doesn't recursively remove descendants.
   */
  removeChildren(): this
  /**
   * Performs a complete traversal of the hierarchy of objects,
   * invoking the target function on each object.
   * The traversal is immediately terminated if the function returns "false".
   * @param visit - Target function
   * @param downwards - If true, first visit the current node,
   * then visit the children.
   */
  traverseTree(
    visit: (x: INStructChild) => NStructVisitorResult,
    downwards?: boolean
  ): NStructVisitorResult
}

export interface INStructChildOpts extends IBaseClassOpts {}

export interface INStructChildConstructor<T extends INStructChild = INStructChild> {
  new (...args: any[]): T
}

export interface INStructContainerConstructor<T extends INStructContainer = INStructContainer> {
  new (...args: any[]): T
}

const symChildren = Symbol('NStruct.children')
const symParent = Symbol('NStruct.parent')
const symMarkForDeletion = Symbol('NStruct.markForDeletion')

interface IChild extends INStructChild {
  [symParent]?: INStructContainer
  [symMarkForDeletion]?: boolean
}

interface IParent<T extends INStructChild> extends INStructContainer<T> {
  [symChildren]?: Array<T>
}

export function isNStructContainer(c?: INStructChild | null): c is INStructContainer {
  return !!c && c.isContainer
}

export function NStructChildMixin<TBase extends Constructor<IDisposable>>(
  Base: TBase
): TBase & Constructor<INStructChild> {
  return class MixedNStructChild extends Base implements INStructChild, IChild {
    get chain(): INStructChild[] {
      const a = []
      let p: INStructChild | null = this
      while (p) {
        a.unshift(p)
        p = p.parent
      }
      return a
    }

    get childIndex() {
      let i = 0
      for (let c of this.parent || []) {
        if (c === this) {
          return i
        }
        i++
      }
      return -1
    }

    get isContainer() {
      return false
    }

    get level(): number {
      return this.parent ? this.parent.level + 1 : 0
    }

    get parent(): INStructContainer | null {
      const p = (this as IChild)[symParent]
      return p ? (p as INStructContainer) : null
    }

    get root() {
      return this.parent ? this.parent.root : null
    }

    hasAncestor(s: INStructContainer) {
      let x: INStructContainer | null = this.parent
      while (x) {
        if (x === s) {
          return true
        }
        x = x.parent
      }
      return false
    }

    unlink() {
      if (this.parent) {
        this.parent.removeChild(this)
      }
      return this
    }

    updateParent() {}
  }
}

export function NStructContainerMixin<
  T extends INStructChild = INStructChild,
  TBase extends INStructChildConstructor = INStructChildConstructor
>(
  Base: TBase
): TBase & INStructContainerConstructor<INStructContainer<T>> & INStructChildConstructor {
  return class MixedNStructContainer extends Base implements INStructContainer<T>, IParent<T> {
    get children(): Array<T> | null {
      return (this as IParent<T>)[symChildren] || null
    }

    get childCount() {
      return this.children ? this.children.length : 0
    }

    get firstChild() {
      return this.children ? this.children[0] : null
    }

    get hasChildren() {
      return this.childCount > 0
    }

    get isContainer() {
      return true
    }

    get isLeaf() {
      return !this.isRoot && !this.hasChildren
    }

    get isRoot() {
      return !!this.parent === false
    }

    /*
     * WARNING: Don't remove null from the result type.
     * The container property interface must match the interface
     * of the corresponding item property.
     *
     * TODO: Cache the link to the root element, clear when the parent changes.
     */
    get root(): INStructContainer | null {
      return this.parent ? this.parent.root : this
    }

    *iterator() {
      if (this.children) {
        for (const child of this.children) {
          yield child
        }
      }
    }

    [Symbol.iterator](): IterableIterator<T> {
      return this.iterator()
    }

    addChild(child: T) {
      return this.insertChild(child)
    }

    addChildren(...list: T[]) {
      list.forEach(c => this.addChild(c))
      return this
    }

    dispose() {
      this.releaseTree()
      super.dispose()
    }

    /**
     * WARNING: You cannot add or remove children while enumerating.
     */
    enumChildren(visit: NStructChildVisitor<T>): NStructVisitorResult {
      const xs = this.children
      if (xs) {
        let i = 0
        for (const x of xs) {
          const result = visit(x, i++)
          if (result && result !== 'Omit') {
            return result
          }
        }
      }
    }

    findChild(predicate: (c: T) => boolean) {
      let child = null
      this.enumChildren(
        (c: T): NStructVisitorResult => {
          if (predicate(c)) {
            child = c
            return 'Leave'
          }
        }
      )
      return child
    }

    getChildAt(index: number) {
      const xs = this.children
      if (xs && index >= 0 && index < xs.length) {
        return xs[index]
      }
      return null
    }

    insertChild(child: T, index = Infinity) {
      let p = child.parent
      if (p) {
        if (p === this) {
          throw new Error('Child node is already added')
        } else {
          throw new Error('The child node already has a parent')
        }
      }
      if (isNStructContainer(child)) {
        p = this.parent
        while (p) {
          if (p === child) {
            throw new Error('The child node is the ancestor of the target node')
          }
          p = p.parent
        }
      }
      let xs = this.children
      if (!xs) {
        xs = (this as IParent<T>)[symChildren] = new Array<T>()
      }
      xs.splice(index, 0, child)
      ;(child as IChild)[symParent] = this
      child.updateParent()
      return this
    }

    /**
     * This method is part of the implementation of the IterableIterator interface.
     */
    next(): IteratorResult<T> {
      return { done: true, value: undefined! }
    }

    releaseTree(): void {
      const xs = Array.from(this.children || [])
      while (xs.length > 0) {
        // There is no need to remove children from collection.
        const x: T = xs.pop()!
        ;(x as IChild)[symMarkForDeletion] = true
        x.dispose()
      }
      if (!(this as IChild)[symMarkForDeletion]) {
        this.unlink()
      }
    }

    removeChild(child: T): this {
      if (child.parent !== this) {
        throw new Error('Child node is not owned by object')
      }
      const xs = this.children!
      xs.some((x, i) => x === child && xs.splice(i, 1))
      if (xs.length < 1) {
        delete (this as IParent<T>)[symChildren]
      }
      delete (child as IChild)[symParent]
      child.updateParent()
      return this
    }

    removeChildren() {
      const xs = this.children
      if (xs) {
        for (const x of xs) {
          delete (x as IChild)[symParent]
          x.updateParent()
        }
        delete (this as IParent<T>)[symChildren]
      }
      return this
    }

    traverseTree(
      visit: (x: INStructChild) => NStructVisitorResult,
      downwards: boolean = true
    ): NStructVisitorResult {
      let result: NStructVisitorResult
      if (downwards) {
        result = visit(this)
      }
      if (!result) {
        result = this.enumChildren(c => {
          if (isNStructContainer(c)) {
            result = c.traverseTree(visit, downwards)
            if (result === 'LeaveTree') {
              return result
            }
          } else {
            return visit(c)
          }
        })
      }
      if (!!result && !downwards) {
        result = visit(this)
      }
      return result
    }
  }
}

/**
 * This mixin allows you to substitute the necessary type of children
 * when the base class is already a container, but with a different
 * type of children.
 */
export function NStructBaseContainerWrapper<
  T extends INStructChild,
  TBase extends INStructContainerConstructor<INStructContainer<INStructChild>>
>(Base: TBase): TBase & INStructContainerConstructor<INStructContainer<T>> {
  return Base as any
}

export const StandardNStructChild = (
  base: Constructor<IBaseClass>
): Constructor<IDisposable> & Constructor<INStructChild> & Constructor<IBaseClass> =>
  NStructChildMixin<Constructor<IBaseClass>>(base)
