export const delay = async (msec: number) => {
    return new Promise<void>(resolve => {
        setTimeout(() => resolve(), msec)
    })
}
