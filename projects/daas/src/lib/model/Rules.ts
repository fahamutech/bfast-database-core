export interface Rules {
    applicationId?: string;
    masterKey?: string;
    token?: string;
    context?: ContextBlock;
    transaction?: TransactionBlock;
    auth?: {
        signUp?: {
            username: string,
            password: string,
            email?: string
        },
        signIn?: {
            username: string,
            password: string,
        },
        reset?: string
    };
    policy?: {
        add?: {
            'create.*'?: string;
            'query.*'?: string;
            'update.*'?: string;
            'delete.*'?: string;
            [key: string]: string
        };
        list?: {};
        remove?: {
            ruleId: string;
        }
    },
    errors?: {
        [key: string]: {
            message: string,
            path: string,
            data: any
        }
    }
}

export interface RuleResponse {
    errors: {
        [key: string]: {
            message: string,
            path: string,
            data: any
        }
    };

    [key: string]: any;
}

export interface ContextBlock {
    return?: string[]; // field to return to user
    uid?: string,
    auth?: boolean,
    applicationId?: string,
    masterKey?: string,
    useMasterKey?: boolean
}

export interface TransactionBlock {
    before?: { [key: string]: any };
    after?: { [key: string]: any };
    commit?: { [key: string]: any };
}
