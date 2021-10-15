export interface Cursor<T> {
    hasNext: () => Promise<boolean>;
    next: () => Promise<T>;
    toArray: () => Promise<T[]>;
    limit: (value: number) => Cursor<T>;
    skip: (value: number) => Cursor<T>;
    sort: (field: string, dir: any) => Cursor<T>;
}
