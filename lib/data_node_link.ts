import {
  DataNode,
  DataNodeCreator,
  DataNodeValue,
  DataNodeVisitor,
  IDataNode
} from './data_node'
import { IBaseClassOpts } from './base_class'

export interface IDataNodeLink extends IDataNode {
  readonly target: IDataNode
}

export interface IDataNodeLinkOpts extends IBaseClassOpts {
  readonly target: IDataNode
  readonly targetPath?: string
}

export class DataNodeLink extends DataNode implements IDataNodeLink {
  constructor (p: IDataNodeLinkOpts) {
    let t: IDataNode | null = p.target
    const path = p.targetPath
    if (path) {
      t = t.getNodeByPath(path)
      if (!t) {
        throw new Error(`Target node has no child in path '${path}'`)
      }
    }
    super({ ...p, name: p.name || t.name })
    this.$value = t
  }

  get isLink (): boolean {
    return true
  }

  get realPath (): string {
    return this.target.fullPath
  }

  get target (): IDataNode {
    return this.$value as IDataNode
  }

  get value (): DataNodeValue {
    return this.target.value
  }

  set value (v: DataNodeValue) {
    this.target.value = v
  }

  addChild (child: IDataNode): this {
    this.target.addChild(child)
    return this
  }

  addSuccessorNode (path: string, node: IDataNode): this {
    this.target.addSuccessorNode(path, node)
    return this
  }

  findChildNode (name: string): IDataNode | null {
    return this.target.findChildNode(name)
  }

  getBoolean (): boolean {
    return this.target.getBoolean()
  }

  getDate (): Date {
    return this.target.getDate()
  }

  getFloat (): number {
    return this.target.getFloat()
  }

  getInt (): number {
    return this.target.getInt()
  }

  getNodeByPath (path: string): IDataNode | null {
    return this.target.getNodeByPath(path)
  }

  getString (): string {
    return this.target.getString()
  }

  makePath (path: string, createNode?: DataNodeCreator): IDataNode | null {
    return this.target.makePath(path, createNode)
  }

  removeChild (child: IDataNode): this {
    this.target.removeChild(child)
    return this
  }

  walkPath (path: string, visit: DataNodeVisitor): IDataNode | null {
    return this.target.walkPath(path, visit)
  }
}
