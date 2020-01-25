import { IBitFlags } from '@aperos/ts-goodies'
import {
  EventEmitterConstructor,
  EventEmitterMixin,
  IBaseEvents,
  ITypedEvent,
  ITypedEventEmitter,
  ITypedEventOpts,
  TypedEvent
} from '@aperos/event-emitter'
import { Constructor } from './types'
import { BaseClassFlags, IBaseClassOpts, IBaseClass } from './base_class'
import { INStructChild, INStructContainer, NStructChild, NStructContainerMixin } from './n_struct'

export type DataNodeCreator = (name: string, pathParts?: string[]) => IDataNode | null

export type DataNodeVisitor = (node: IDataNode | null, pathParts?: string[]) => IDataNode | null

export type DataNodeValue = Date | boolean | null | number | string

export interface IDataNodeEvents extends IBaseEvents {
  readonly change: (event: IDataNodeEvent) => void
  readonly addChild: (event: IDataNodeEvent) => void
  readonly removeChild: (event: IDataNodeEvent) => void
}

export interface IDataNode
  extends ITypedEventEmitter<IDataNodeEvents>,
    IBaseClass,
    INStructChild,
    INStructContainer<IDataNode> {
  value: DataNodeValue
  readonly fullPath: string
  readonly isEventTrap: boolean
  readonly isLink: boolean
  readonly parent: IDataNode | null
  readonly realPath: string
  addChild(child: IDataNode): this
  addSuccessorNode(path: string, node: IDataNode): this
  findChildNode(name: string): IDataNode | null
  getBoolean(): boolean
  getDate(): Date
  getFloat(): number
  getInt(): number
  getNodeByPath(path: string): IDataNode | null
  getString(): string
  makePath(path: string, createNode?: DataNodeCreator): IDataNode | null
  removeChild(child: IDataNode): this
  setValue(value: DataNodeValue): this
  walkPath(path: string, visit: DataNodeVisitor): IDataNode | null
}

export interface IDataNodeOpts extends IBaseClassOpts {
  readonly isEventTrap?: boolean
  readonly value?: DataNodeValue
}

export interface IDataNodeEvent extends ITypedEvent<IDataNodeEvents> {
  readonly node: IDataNode
  readonly child?: IDataNode
}

export interface IDataNodeEventOpts extends ITypedEventOpts<IDataNodeEvents> {
  origin: IDataNode
  child?: IDataNode
}

export class DataNodeEvent extends TypedEvent<IDataNodeEvents> implements IDataNodeEvent {
  readonly child?: IDataNode

  constructor(p: IDataNodeEventOpts) {
    super(p)
    p.child && (this.child = p.child)
  }

  get node(): IDataNode {
    return this.origin as IDataNode
  }
}

export class BaseNStructDataNode extends NStructContainerMixin<
  IDataNode,
  Constructor<NStructChild>
>(NStructChild) {}

export interface DataNode {
  readonly root: IDataNode
}

export type DataNodeFlags = 'IsEventTrap' | BaseClassFlags

export interface DataNode {
  readonly flags: IBitFlags<DataNodeFlags>
  readonly parent: IDataNode | null
}

export class DataNode
  extends EventEmitterMixin<IDataNodeEvents, EventEmitterConstructor<BaseNStructDataNode>>(
    BaseNStructDataNode
  )
  implements IDataNode {
  static readonly pathSeparator = '/'

  private static nodeNameRegexp = /^\w[\s\w\-\.#():+_]*$/

  protected $value: DataNodeValue | IDataNode

  constructor(p: IDataNodeOpts) {
    super({ ...p, name: DataNode.verifyName(p.name)! })
    this.$value = p.value === undefined ? null : p.value
    if (p.isEventTrap) {
      this.flags.set('IsEventTrap')
    }
  }

  get fullPath(): string {
    const s = DataNode.pathSeparator
    const p = this.chain.map((x: INStructChild) => (x as IDataNode).name).join(s)
    return `${s}${p}`
  }

  get isEventTrap() {
    return this.flags.isSet('IsEventTrap')
  }

  get isLink(): boolean {
    return false
  }

  get realPath(): string {
    return this.fullPath
  }

  get value(): DataNodeValue {
    return this.$value as DataNodeValue
  }

  set value(value: DataNodeValue) {
    this.$value = value
    this.emitEvent(new DataNodeEvent({ origin: this, type: 'change' }))
  }

  addChild(child: IDataNode): this {
    super.addChild(child)
    return this.emitEvent(new DataNodeEvent({ child, origin: this, type: 'addChild' }))
  }

  addSuccessorNode(path: string, node: IDataNode): this {
    if (path.trimLeft().charAt(0) === DataNode.pathSeparator) {
      throw new Error(`Path for successor of data node must be relative: "${path}"`)
    }
    this.makePath(path)!.addChild(node)
    return this
  }

  findChildNode(name: string): IDataNode | null {
    const node = this.findChild((x: INStructChild) => (x as IDataNode).name === name)
    return node ? (node as IDataNode) : null
  }

  getBoolean(): boolean {
    let v = this.$value
    const t = typeof v
    if (t === 'boolean') {
      return v as boolean
    } else if (t === 'string') {
      if (v === 'false') {
        return false
      } else if (v === 'true') {
        return true
      } else {
        v = this.getInt()
      }
    }
    return Boolean(v)
  }

  getDate(): Date {
    if (this.$value instanceof Date) {
      return this.$value
    } else {
      const d = new Date(this.getInt())
      if (isNaN(d.getTime())) {
        throw new Error(`The data node '${this.fullPath}' does not contain a value of type Date`)
      }
      return d
    }
  }

  getFloat(): number {
    let v = this.$value
    if (typeof v === 'number') {
      return v
    } else if (v === null) {
      throw new Error('Cannot convert null to number')
    } else if (v instanceof Date) {
      return v.getTime()
    } else {
      const n = parseFloat(v as string)
      if (isNaN(n)) {
        throw new Error(`The data node '${this.fullPath}' does not contain a value of type Number`)
      }
      return n
    }
  }

  getInt(): number {
    return Math.trunc(this.getFloat())
  }

  getString(): string {
    const d = this.$value
    if (d === null) {
      throw new Error('Cannot convert null to string')
    } else {
      return d.toString()
    }
  }

  getNodeByPath(path: string): IDataNode | null {
    try {
      return this.walkPath(path, x => x)
    } catch (e) {
      return null
    }
  }

  /**
   * Creates all data tree nodes according to the specified path.
   * The path may contain relative components.
   */
  makePath(path: string, createNode?: DataNodeCreator): IDataNode | null {
    return this.walkPath(
      path,
      (node: IDataNode | null, pathParts?: string[]): IDataNode => {
        if (node) {
          return node
        }
        const pp = pathParts!
        const name = pp[pp.length - 1]
        if (createNode) {
          const newNode = createNode(name, pathParts)
          if (!newNode) {
            throw new Error(`Data node builder returns null: ${pp.join(DataNode.pathSeparator)}`)
          }
          return newNode
        } else {
          const p: IDataNodeOpts = { name }
          return new (this.constructor as typeof DataNode)(p) as IDataNode
        }
      }
    )
  }

  removeChild(child: IDataNode): this {
    this.emitEvent(new DataNodeEvent({ child, origin: this, type: 'removeChild' }))
    return super.removeChild(child)
  }

  setValue(value: DataNodeValue) {
    this.value = value
    return this
  }

  toString(): string {
    const parts: string[] = []
    ;(function dump(node: IDataNode, indent: number = 0) {
      const path = `${node.fullPath}${node.isLink ? ` ~ @${node.realPath}` : ''}`
      parts.push(
        `${' '.repeat(indent)}${path}${node.isLeaf && !node.isLink ? ` = [${node.value}]` : ''}`
      )
      node.enumChildren(c => dump(c as IDataNode, indent + 2))
    })(this)
    return parts.join('\n')
  }

  triggerChanges(_?: string[]): this {
    throw new Error('Not implemented')
  }

  /**
   * Walks through the nodes of the data tree in the specified path.
   * The path may contain relative components, such as relative components
   * in the file system path.
   */
  walkPath(path: string, visit: DataNodeVisitor): IDataNode | null {
    if (path.charAt(0) === ' ' || path.charAt(path.length - 1) === ' ') {
      throw new Error(`Path to data node must not be enclosed in spaces: "${path}"`)
    }
    let node: IDataNode | null = this
    if (path.length > 0) {
      const p = path.split(DataNode.pathSeparator)
      const fp: string[] = this.chain.map(x => (x as IDataNode).name)
      for (let i = 0; i < p.length; i++) {
        const name = p[i]
        if (name === '') {
          if (i > 0) {
            throw new Error(`Data element path cannot end with "/": "${path}"`)
          }
          fp.length = 0
          node = visit(this.root as IDataNode, fp)
        } else if (name === '.') {
          node = visit(node, fp)
        } else if (name === '..') {
          if (!node.parent) {
            throw new Error(`Invalid data node path: "${path}"`)
          }
          fp.pop()
          node = visit(node.parent, fp)
        } else {
          DataNode.verifyName(name)
          fp.push(name)
          let child = node!.findChildNode(name)
          const newChild = visit(child, fp)
          if (!child && newChild) {
            node!.addChild(newChild)
          }
          node = newChild
        }
        if (!node) {
          break
        }
      }
    }
    return node
  }

  protected emitEvent(event: IDataNodeEvent): this {
    let p = this.parent
    while (p) {
      const dn = p as IDataNode
      if (dn.isEventTrap) {
        dn.emit(event.type, event)
      }
      p = p.parent
    }
    super.emit(event.type, event)
    return this
  }

  static verifyName(name?: string): string {
    if (!name || !DataNode.nodeNameRegexp.test(name)) {
      throw new Error(`Invalid name for data node: "${name}"`)
    }
    return name
  }
}
