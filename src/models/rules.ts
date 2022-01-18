import {AuthRule} from "./auth-rule";
import {Policy} from "./policy";
import {Errors} from "./errors";
import {RuleContext} from "./rule-context";
import {Bulk} from "./bulk";

export interface Rules {
  applicationId?: string;
  masterKey?: string;
  token?: string;
  context?: RuleContext;
  transaction?: Bulk;
  auth?: AuthRule;
  policy?: Policy;
  errors?: Errors;
  [rule: string]: any
}