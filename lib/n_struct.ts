/**
 * NStruct implements nested hierarchy of objects.
 */
import { IBaseClass, BaseClass, IBaseClassOpts } from './base_class'

export interface INStructChild extends IBaseClass {
  readonly chain: INStructChild[]
  readonly childIndex: number
  readonly level: number
  readonly parent: INStructContainer | null
  readonly root: INStructContainer | null
  hasAncestor(s: INStructContainer): boolean
  isContainer: boolean
  toJSON(): object
  unlink(): this
  updateParent(): void
}

export type NStructVisitorResult = 'Leave' | 'LeaveTree' | 'Omit' | null | void

export type NStructChildVisitor<T extends INStructChild> = (
  c: T,
  index?: number
) => NStructVisitorResult

export interface INStructContainer<T extends INStructChild = INStructChild>
  extends INStructChild {
  readonly childCount: number
  readonly children: Set<T> | null
  readonly firstChild: INStructChild | null
  readonly hasChildren: boolean
  readonly isLeaf: boolean
  readonly isRoot: boolean
  readonly root: INStructContainer | null
  [Symbol.iterator](): IterableIterator<T>
  addChild(child: T): this
  addChildren(...list: T[]): this
  enumChildren(visit: NStructChildVisitor<T>): NStructVisitorResult
  findChild(predicate: (c: T) => boolean): T | null
  getChildAt(index: number): T | null
  releaseTree(): void
  removeChild(child: T): this
  removeChildren(): this
  toJSON(): object
  traverseTree(
    visit: (x: INStructChild) => NStructVisitorResult,
    downwards?: boolean
  ): NStructVisitorResult
}

export interface INStructChildOpts extends IBaseClassOpts {}

export interface INStructChildConstructor<
  T extends INStructChild = INStructChild
> {
  new (...args: any[]): T
}

export interface INStructContainerConstructor<
  T extends INStructContainer = INStructContainer
> {
  new (...args: any[]): T
}

const symChildren = Symbol('NStruct.children')
const symParent = Symbol('NStruct.parent')
const symMarkForDeletion = Symbol('NStruct.markForDeletion')

export function isNStructContainer(
  c?: INStructChild | null
): c is INStructContainer {
  return !!c && c.isContainer
}

export class NStructChild extends BaseClass implements INStructChild {
  /**
   * Returns a hierarchical chain of objects, starting with the root
   * and ending with the current one.
   */
  get chain(): INStructChild[] {
    const a = []
    let p: INStructChild | null = this
    while (p) {
      a.unshift(p)
      p = p.parent
    }
    return a
  }

  /**
   * Returns the current index of the object in the collection of child
   * objects of the parent object, or -1 if the object does not
   * have a parent object.
   */
  get childIndex(): number {
    let i = 0
    for (let c of this.parent || []) {
      if (c === this) {
        return i
      }
      i++
    }
    return -1
  }

  get isContainer(): boolean {
    return false
  }

  get level(): number {
    return this.parent ? this.parent.level + 1 : 0
  }

  get parent(): INStructContainer | null {
    const p = (this as any)[symParent]
    return p ? (p as INStructContainer) : null
  }

  get root(): INStructContainer | null {
    return this.parent ? this.parent.root : null
  }

  hasAncestor(s: INStructContainer): boolean {
    let x: INStructContainer | null = this.parent
    while (x) {
      if (x === s) {
        return true
      }
      x = x.parent
    }
    return false
  }

  toJSON(): object {
    return { ...super.toJSON(), level: this.level }
  }

  unlink(): this {
    if (this.parent) {
      this.parent.removeChild(this)
    }
    return this
  }

  /**
   * Fires when a node changes the parent node.
   */
  updateParent() {}
}

export function NStructContainerMixin<
  T extends INStructChild = INStructChild,
  TBase extends INStructChildConstructor = INStructChildConstructor
>(Base: TBase): TBase & INStructContainerConstructor<INStructContainer<T>> {
  return class NStruct extends Base implements INStructContainer<T> {
    /**
     * Collection of child objects.
     */
    get children(): Set<T> | null {
      return (this as any)[symChildren] || null
    }

    get childCount(): number {
      return this.children ? this.children.size : 0
    }

    /**
     * Returns the first item from the collection of child objects,
     * or null if the collection is empty.
     */
    get firstChild(): T | null {
      return this.children ? this.children.values().next().value : null
    }

    get hasChildren(): boolean {
      return this.childCount > 0
    }

    get isContainer(): boolean {
      return true
    }

    get isLeaf(): boolean {
      return !this.isRoot && !this.hasChildren
    }

    get isRoot(): boolean {
      return !!this.parent === false
    }

    /**
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

    /**
     * Adds an object to the collection of child objects.
     * Addition always occurs at the end of the collection.
     */
    addChild(child: T): this {
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
      ;(child as any)[symParent] = this

      let xs = this.children || new Set<T>()
      if (!this.children) {
        ;(this as any)[symChildren] = xs
      }

      xs.add(child)
      child.updateParent()
      return this
    }

    addChildren(...list: T[]): this {
      list.forEach(c => this.addChild(c))
      return this
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

    finalize() {
      this.releaseTree()
      super.finalize()
    }

    findChild(predicate: (c: T) => boolean): T | null {
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

    /**
     * Returns an object at the specified index in the collection of child objects.
     */
    getChildAt(index: number): T | null {
      const xs = this.children
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

    /**
     * This method is part of the implementation of the IterableIterator interface.
     */
    next(): IteratorResult<T> {
      return { done: true, value: undefined! }
    }

    /**
     * Recursively releases NStruct with the entire subtree.
     */
    releaseTree(): void {
      const xs = Array.from(this.children || [])
      while (xs.length > 0) {
        // There is no need to remove children from collection.
        const x: T = xs.pop()!
        ;(x as any)[symMarkForDeletion] = true
        x.finalize()
      }
      if (this.parent && !(this as any)[symMarkForDeletion]) {
        this.parent.removeChild(this)
      }
    }

    /**
     * Removes an existing object from the collection of child objects.
     * It does not release the object after removal.
     */
    removeChild(child: T): this {
      if (child.parent !== this) {
        throw new Error('Child node is not owned by object')
      }
      const xs = this.children
      if (xs && xs.has(child)) {
        delete (child as any)[symParent]
        xs.delete(child)
        if (xs.size === 0) {
          delete (this as any)[symChildren]
        }
        child.updateParent()
      }
      return this
    }

    /**
     * Removes all immediate descendants of a node.
     * NOTE: This method doesn't recursively remove descendants.
     */
    removeChildren(): this {
      const xs = this.children
      if (xs) {
        xs.clear()
        delete (this as any)[symChildren]
      }
      return this
    }

    toJSON(): object {
      const children = new Array<object>()
      this.enumChildren(c => {
        children.push(c.toJSON())
      })
      return Object.assign(super.toJSON(), { children })
    }

    /**
     * Performs a complete traversal of the hierarchy of objects,
     * invoking the "visit" function on each object.
     * The traversal is immediately terminated if the function returns "false".
     * If 'downwards' is true, first visit the current node,
     * then visit the children.
     */
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
