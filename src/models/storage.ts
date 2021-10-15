import {Buffer} from "buffer";

export type Storage = {
    id: string,
    name: string,
    extension: string,
    type: string,
    cid: string,
    size: number,
    data?: Buffer | ReadableStream
}
