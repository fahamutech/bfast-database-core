export type Policy = {
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
};
