import { BitFlagged, IBitFlags, IDisposable } from '@aperos/ts-goodies'

const symName = Symbol('BaseClass.name')
const classNameMap = new Map<Function, string>()

export interface IBaseClass extends IDisposable {
  name: string
  readonly className: string
  readonly isEnabled: boolean
  copyFrom(source: IBaseClass): this
  disable(): this
  enable(): this
  toJSON(): object
}

export interface IBaseClassOpts {
  readonly name?: string
}

export interface IBaseClassConstructor {
  new (...args: any[]): IBaseClass
}

export type BaseClassConstructor = new (p?: IBaseClassOpts) => IBaseClass

export type BaseClassFlags = 'HasChanged' | 'IsDisabled'

export function ClassName(name: string) {
  return function(ctor: Function) {
    const xs = classNameMap
    for (const v of xs.values()) {
      if (v === name) {
        throw new Error(`Custom class name already in use: '${name}'`)
      }
    }
    xs.set(ctor, name)
    Object.defineProperty(ctor.prototype, 'className', {
      get: function() {
        return xs.get(this.constructor)
      }
    })
  }
}

export interface BaseClass {
  readonly flags: IBitFlags<BaseClassFlags>
  readonly className: string
}

@BitFlagged
@ClassName('BaseClass')
export class BaseClass implements IBaseClass {
  constructor(p?: IBaseClassOpts) {
    if (p) {
      p.name && ((this as any)[symName] = p.name)
    }
  }

  get hasChanged(): boolean {
    return this.flags.isSet('HasChanged')
  }

  get isEnabled(): boolean {
    return !this.flags.isSet('IsDisabled')
  }

  get name(): string {
    return (this as any)[symName]
  }

  set name(value: string) {
    if (this.name) {
      throw new Error(
        `The name of descendand class of BaseClass cannot be changed`
      )
    }
    ;(this as any)[symName] = value
  }

  clone(): IBaseClass {
    const ctor = this.constructor as IBaseClassConstructor
    const c = new ctor(this)
    ;(c as BaseClass).copyFrom(this)
    return c
  }

  /**
   * In order to be able to make exact copies of the object,
   * the original object must be a clone of the current one.
   */
  copyFrom(_source: IBaseClass) {
    return this
  }

  dispose() {}

  disable(): this {
    this.flags.setFlag('IsDisabled')
    return this
  }

  enable(): this {
    this.flags.unset('IsDisabled')
    return this
  }

  toJSON(): object {
    return {
      ctor: this.constructor.name,
      ...(symName in this ? { name: this.name } : {})
    }
  }

  protected announceChanges(): this {
    this.flags.setFlag('HasChanged')
    return this
  }

  protected approveChanges(): this {
    this.flags.unset('HasChanged')
    return this
  }
}
