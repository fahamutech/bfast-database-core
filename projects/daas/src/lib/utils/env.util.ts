import {readFile, stat} from 'fs';
import {promisify} from 'util';

export class EnvUtil {
  async getEnv(name: string): Promise<string> {
    if (name && name.toString() !== 'undefined' && name.toString() !== 'null') {
      let isFile;
      try {
        const fileStats = await promisify(stat)(name);
        isFile = fileStats.isFile();
      } catch (_) {
        isFile = false;
      }
      if (name?.startsWith('/') === true && isFile === true) {
        try {
          const value = await promisify(readFile)(name, {encoding: 'utf8'});
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
