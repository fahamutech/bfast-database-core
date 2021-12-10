export type RuleContext = {
    return?: string[]; // field to return to user
    uid?: string;
    auth?: boolean;
    applicationId?: string;
    masterKey?: string;
    useMasterKey?: boolean;
    storage?: {
        preserveName?: boolean
    }
};