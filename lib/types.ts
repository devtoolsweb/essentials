import { IBaseClass } from './base_class'

export interface IConstructor<T extends IBaseClass = IBaseClass> {
  new (...args: any[]): T
}

export type Constructor < T extends IBaseClass = IBaseClass > = new (
  ...args: any[]
) => T

export interface IDisposable {
  dispose(): void
}

export interface IReusable {
  reset(): this
}
