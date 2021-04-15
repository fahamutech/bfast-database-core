// @ts-ignore
import {readFileSync, statSync} from 'fs';

export class EnvUtil {
    getEnv(name: string): string {
        if (name && name.toString() !== 'undefined' && name.toString() !== 'null') {
            let isFile;
            try {
                const fileStats = statSync(name);
                isFile = fileStats.isFile();
            } catch (_) {
                isFile = false;
            }
            if (name?.startsWith('/') === true && isFile === true) {
                try {
                    let value = readFileSync(name, {encoding: 'utf8'});
                    return EnvUtil.tryStringToObject(value);
                } catch (_) {
                    return EnvUtil.tryStringToObject(name);
                }
            } else {
                return EnvUtil.tryStringToObject(name);
            }
        } else {
            return undefined;
        }
    }

    private static tryStringToObject(value: string): any {
        value = value.trim();
        if (value.startsWith('{') && value.endsWith('}')) {
            try {
                return JSON.parse(value);
            } catch (e) {
                return value;
            }
        }
        return value;
    }
}
