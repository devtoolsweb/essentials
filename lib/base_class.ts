import { BitFlagged, IBitFlags, IDisposable } from '@devtoolsweb/ts-goodies'
import { Constructor } from 'type-fest'

const classNameMap = new Map<Constructor<object>, string>()

export interface IBaseClass extends IDisposable {
    readonly className: string
    readonly isEnabled: boolean
    readonly isUpdating: boolean
    name: string
    copyFrom(source: IBaseClass): this
    disable(): this
    enable(): this
    performUpdates(update: () => void): this
    toJSON(): object
}

export interface IBaseClassOpts {
    readonly name?: string
}

export interface IBaseClassConstructor extends Constructor<IBaseClass> {}

export type BaseClassConstructor = new (p?: IBaseClassOpts) => IBaseClass

export type BaseClassFlags = 'HasChanged' | 'IsDisabled' | 'IsDisposing' | 'IsUpdating'

export function ClassName (name: string) {
    return function (ctor: Constructor<object>) {
        const xs = classNameMap
        for (const v of xs.values()) {
            if (v === name) {
                throw new Error(`Custom class name already in use: '${name}'`)
            }
        }
        xs.set(ctor, name)
        Object.defineProperty(ctor, 'className', { value: name })
        Object.defineProperty(ctor.prototype, 'className', { get () {
            return xs.get(this.constructor)
        } })
    }
}

export interface BaseClass {
    readonly className: string
    readonly flags: IBitFlags<BaseClassFlags>
}

@BitFlagged
@ClassName('BaseClass')
export class BaseClass implements IBaseClass {

    private $name!: string

    constructor (p?: IBaseClassOpts) {
        if (p) {
            p.name && (this.$name = p.name)
        }
    }

    get hasChanged (): boolean {
        return this.flags.isSet('HasChanged')
    }

    get isEnabled (): boolean {
        return !this.flags.isSet('IsDisabled')
    }

    get isUpdating () {
        return this.flags.isSet('IsUpdating')
    }

    get name (): string {
        return this.$name
    }

    set name (value: string) {
        if (this.name) {
            throw new Error('The name of descendand class of BaseClass cannot be changed')
        }
        this.$name = value
    }

    clone (): IBaseClass {
        const ctor = this.constructor as IBaseClassConstructor
        const c = new ctor(this)
    ;(c as BaseClass).copyFrom(this)
        return c
    }

    /**
     * In order to be able to make exact copies of the object,
     * the original object must be a clone of the current one.
     *
     * @param {IBaseClass} _source Source class
     * @returns {IBaseClass} this
     */
    copyFrom (_source: IBaseClass) {
        return this
    }

    disable (): this {
        this.flags.setFlag('IsDisabled')
        return this
    }

    dispose () {
        this.flags.setFlag('IsDisposing')
    }

    enable (): this {
        this.flags.unset('IsDisabled')
        return this
    }

    performUpdates (update: () => void) {
        const { flags: f, isUpdating: u } = this
        if (!u) {
            f.setFlag('IsUpdating')
            update()
            f.unset('IsUpdating')
        }
        return this
    }

    toJSON (): object {
        return {
            ctor: this.constructor.name,
            ...(this.name ? { name: this.name } : {})
        }
    }

    protected announceChanges (): this {
        this.flags.setFlag('HasChanged')
        return this
    }

    protected approveChanges (): this {
        this.flags.unset('HasChanged')
        return this
    }

}
