import {RuleResponse} from "../models/rule-response";
import {AuthAdapter} from "../adapters/auth.adapter";
import {BFastOptions} from "../bfast-option";
import {signIn, signUp} from "./auth.controller";
import {RuleContext} from "../models/rule-context";

function sanitizeRuleResponse(ruleResponse: RuleResponse) {
    if (!ruleResponse.auth) {
        ruleResponse.auth = {};
    }
    return ruleResponse;
}

async function authSignUp(
    data, ruleResponse: RuleResponse, authAdapter: AuthAdapter, context: RuleContext, options: BFastOptions
) {
    const signUpResponse = await signUp(data, authAdapter, context, options);
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.auth.signUp = signUpResponse;
}

async function authSignIn(
    data, ruleResponse: RuleResponse, authAdapter: AuthAdapter, context: RuleContext, options: BFastOptions
) {
    const signInResponse = await signIn(data, authAdapter, context, options);
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.auth.signIn = signInResponse;
}

export async function authRule(
    action: string, data: any, ruleResponse: RuleResponse, authAdapter: AuthAdapter,
    context: RuleContext, options: BFastOptions
) {
    if (action === 'signUp') {
        await authSignUp(data, ruleResponse, authAdapter, context, options);
    } else if (action === 'signIn') {
        await authSignIn(data, ruleResponse, authAdapter, context, options);
    } else if (action === 'reset') {
        throw {message: 'Reset not supported yet'};
    }
}