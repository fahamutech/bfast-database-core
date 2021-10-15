import {FactoryIdentifier} from "../models/factory-identifier";

class FactoryHouse {
    private factories = {};
    private static instance: FactoryHouse;

    private constructor() {
        console.log('::::::factory initiated:::::');
    }

    static getInstance(): FactoryHouse {
        if (this.instance) {
            return this.instance;
        }
        return new FactoryHouse();
    }

    get<T>(identifier: FactoryIdentifier): T | undefined {
        return this.factories[identifier];
    }

    set<T>(identifier: FactoryIdentifier, fn: T): void {
        if (fn === null) {
            throw {message: 'function to provide must not be null'}
        }
        this.factories[identifier] = fn;
    }

    remove(identifier: FactoryIdentifier): boolean {
        if (this.factories.hasOwnProperty(identifier)) {
            delete this.factories[identifier];
            return true;
        }
        return false;
    }
}

export const Factory = FactoryHouse.getInstance();
