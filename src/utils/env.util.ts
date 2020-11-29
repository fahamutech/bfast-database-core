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
          const value = readFileSync(name, {encoding: 'utf8'});
          return value.trim();
        } catch (_) {
          return name;
        }
      } else {
        return name;
      }
    } else {
      return undefined;
    }
  }
}
