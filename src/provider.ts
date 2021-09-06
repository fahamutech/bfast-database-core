export class Provider {
    static readonly services = {};
    static readonly names = {
        REST_WEB_SERVICE: 'RestWebservice',
        REALTIME_WEB_SERVICE: 'RealtimeWebservice',
        STORAGE_WEB_SERVICE: 'StorageWebservice',
        IPFS_STORAGE_FACTORY: 'IpfsStorageFactory',
        DATABASE_FACTORY: 'DatabaseFactory',
        REST_CONTROLLER: 'RestController',
        RULES_CONTROLLER: 'RulesController',
        STORAGE_CONTROLLER: 'StorageController',
        AUTH_CONTROLLER: 'AuthController',
        SECURITY_CONTROLLER: 'SecurityController',
        LOG_CONTROLLER: 'LogController',
        DATABASE_CONTROLLER: 'DatabaseController',
        REALTIME_CONTROLLER: 'RealtimeWebservice'
    };

    private constructor() {
    }

    static service(name: string, cb: (container: Provider) => any): Provider {
        Object.defineProperty(this, name, {
            get: () => {
                if (!Provider.services.hasOwnProperty(name)) {
                    Provider.services[name] = cb(this);
                }
                return Provider.services[name];
            },
            configurable: true,
            enumerable: true
        });
        return this;
    }

    static get<T = any>(name: string): T {
        return Provider[name];
    }
}
