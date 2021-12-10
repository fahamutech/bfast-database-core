import {Errors} from "./errors";

export type RuleResponse = {
    errors: Errors;
    [key: string]: any;
};
