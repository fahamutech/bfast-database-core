export type Storage<T> = {
    id: string,
    name: string,
    extension: string,
    type: string,
    cid: string,
    size: number,
    data: T
}
