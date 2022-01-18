import {BFastOptions} from "../bfast-option";
import {CID, create, IPFSHTTPClient} from "ipfs-http-client";
import {Buffer} from "buffer";
import {devLog} from "../utils/debug";
import {File as web3File, Web3Storage,} from 'web3.storage';
import itToStream from 'it-to-stream';
import {v4} from 'uuid';


interface IpfsOption {
    json?: boolean;
    start?: number;
    end?: number;
    stream?: boolean
}

export class IpfsFactory {
    private static ipfs: IPFSHTTPClient;
    private static instance: IpfsFactory;

    private constructor() {
    }

    static async getInstance(options: BFastOptions) {
        if (!IpfsFactory.instance) {
            IpfsFactory.instance = new IpfsFactory();
            IpfsFactory.ipfs = await create({
                /*need improvement as it will work only in bfast cloud envs*/
                host: options.useLocalIpfs === true ? 'localhost' : 'https://cf-ipfs.com'
            });
            return IpfsFactory.instance;
        }
        return IpfsFactory.instance;
    }

    async generateCidFromData(
        data: { [k: string]: any },
        buffer: Buffer,
        domain: string,
        options: BFastOptions
    ): Promise<{ cid: string, size: number }> {
        if (options.useLocalIpfs) {
            devLog('use local ipfs');
            return this.generateCidFromLocalIpfsNode(buffer);
        } else {
            devLog('use web3 ipfs');
            return this.generateCidFromWeb3IpfsNode(
                buffer,
                domain,
                data,
                options
            );
        }
    }

    async generateDataFromCid<T>(
        cid: string,
        ipfsOptions: IpfsOption,
        options: BFastOptions
    ): Promise<T> {
        if ((await this.checkIfWeHaveCidInWeb3(cid, options)) === false) {
            return null;
        }
        devLog('____start fetch cid content with ipfs_______');
        const results = await IpfsFactory.ipfs.cat(cid, {
            offset: (ipfsOptions && ipfsOptions.json === false && ipfsOptions.start) ? ipfsOptions.start : undefined,
            length: (ipfsOptions && ipfsOptions.json === false && ipfsOptions.end) ? ipfsOptions.end : undefined,
            timeout: 1000 * 60 * 5,
        });
        IpfsFactory.ipfs.pin.add(CID.parse(cid)).catch(console.log);
        devLog('____cid content found with ipfs______');
        if (ipfsOptions?.json === true) {
            let data = '';
            for await (const chunk of results) {
                data += chunk.toString();
            }
            return JSON.parse(data);
        }
        if (ipfsOptions?.json === false) {
            if (ipfsOptions?.stream === true) {
                return itToStream.readable(results) as T;
            } else {
                let buffer = Buffer.alloc(0);
                for await (const chunk of results) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                return buffer as unknown as T;
            }
        }
    }

    async generateCidFromLocalIpfsNode(buffer: Buffer) {
        const r = await IpfsFactory.ipfs.add(buffer, {
            wrapWithDirectory: false
        });
        devLog('done save file to local ipfs with cid', r.cid.toString());
        return {
            cid: r.cid.toString(),
            size: r.size
        }
    }

    async generateCidFromWeb3IpfsNode(
        buffer: Buffer,
        domain: string,
        data: { [k: string]: any },
        options: BFastOptions
    ) {
        const web3Storage = new Web3Storage({
            token: options.web3Token
        });
        const file = new web3File([buffer], `${domain}_${data._id}`);
        const r = await web3Storage.put(
            [file],
            {
                wrapWithDirectory: false,
                name: `${domain}_${v4()}`,
            }
        );
        return {
            cid: r,
            size: 0
        }
    }

    async checkIfWeHaveCidInWeb3(
        cid: string,
        options: BFastOptions
    ) {
        if (/* when testing or decide to use offline ipfs node */options.useLocalIpfs === true) {
            return true;
        } else {
            const web3Storage = new Web3Storage({
                token: options.web3Token
            });
            const data = await web3Storage.get(cid);
            return !!(data.ok && await data.files);
        }
    }

}
