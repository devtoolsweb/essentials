import { BaseClass, IBaseClass } from './base_class'
import { DataNode, IDataNode } from './data_node'
import { DataNodeLink } from './data_node_link'

export interface IDataNodeBuilder extends IBaseClass {
  buildFromJson(json: string, rootNodeName?: string): IDataNode
  buildFromObject(obj: object, rootNodeName?: string): IDataNode
}

class DataNodeBuilderCtor extends BaseClass implements IDataNodeBuilder {
  private readonly identifiedNodes = new Map<string, IDataNode>()

  buildFromJson (json: string, rootNodeName?: string): IDataNode {
    return this.buildFromObject(JSON.parse(json), rootNodeName)
  }

  buildFromObject (obj: object, rootNodeName?: string): IDataNode {
    const root = new DataNode({ name: rootNodeName || 'data' })
    this.createChildren(root, obj)
    return root
  }

  private createChildren (dn: IDataNode, nodeObjects: object) {
    Object.entries(nodeObjects).forEach(([name, value]) => {
      if (name === 'default' || this.addProperty(dn, name, value)) {
        return
      }
      DataNode.verifyName(name)
      const t = typeof value
      switch (t) {
        case 'object':
          this.createChildren(this.addChildNode(dn, name), value)
          break

        case 'string':
          dn.addChild(
            this.createDate(name, value) ||
              this.createLink(dn, name, value) ||
              this.createRef(name, value) ||
              this.createTimestamp(name, value) ||
              new DataNode({ name, value })
          )
          break

        default:
          this.addValue(this.addChildNode(dn, name), value)
      }
    })
  }

  private addChildNode (dn: IDataNode, name: string, value?: string) {
    const childNode = new DataNode({ name, value })
    dn.addChild(childNode)
    return childNode
  }

  private addProperty (dn: IDataNode, name: string, value: string): boolean {
    const xs = this.identifiedNodes
    if (name === '@id') {
      if (xs.has(value)) {
        throw new Error(`Node already has an id: ${value}`)
      }
      if (value.charAt(0) !== '#') {
        throw new Error(`Node id must begin with '#': ${value}`)
      }
      xs.set(value, dn)
      return true
    } else if (name === '@value') {
      this.addValue(dn, value)
      return true
    }
    return false
  }

  private addValue (dn: IDataNode, value: any) {
    const t = typeof value
    if (t === 'boolean' || t === 'number' || t === 'string') {
      dn.value = value
    } else {
      throw new Error(`Unknown data node value type: ${t}`)
    }
  }

  private createDate (name: string, value: string): IDataNode | null {
    const m = value.match(/^@date:\s*(.*)$/)
    return m ? new DataNode({ name, value: new Date(m[1]) }) : null
  }

  private createLink (
    dn: IDataNode,
    name: string,
    value: string
  ): IDataNode | null {
    const m = value.match(/^@link:\s*(.*)$/)
    if (m) {
      const path = m[1]
      const target = dn.getNodeByPath(path)
      if (!target) {
        throw new Error(`Target node does not exist: '${path}`)
      }
      return new DataNodeLink({ name, target })
    }
    return null
  }

  private createRef (name: string, value: string): IDataNode | null {
    const m = value.match(/^@ref:\s*(.*)$/)
    if (m) {
      const id = m[1]
      const target = this.identifiedNodes.get(m[1])
      if (!target) {
        throw new Error(`Node with id '${id}' does not exist`)
      }
      return new DataNodeLink({ name, target })
    }
    return null
  }

  private createTimestamp (name: string, value: string): IDataNode | null {
    const m = value.match(/^@timestamp:\s*(.*)$/)
    return m ? new DataNode({ name, value: new Date(parseInt(m[1])) }) : null
  }
}

export const DataNodeBuilder: IDataNodeBuilder = new DataNodeBuilderCtor()
