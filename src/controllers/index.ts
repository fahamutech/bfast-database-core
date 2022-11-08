import {validate} from "jsonschema";
import {createHash} from "crypto";

const objectConstructor = ({}).constructor;

export async function validateInput(data: any, schema: any, message: string) {
    // @ts-ignore
    const a = validate(data, schema, {required: true});
    if (a.valid === false) {
        throw {message, reason: a.errors.map(e => `${e.message}`).join(', ')}
    }
    return true
}

export function validateInstance(instance, schema, instanceName = 'instance') {
    const instanceV = validate(instance, schema, {required: true});
    const reason = instanceV.errors
        .map(x => x.property + ' ' + x.message).join(',').replaceAll('instance', instanceName);
    if (instanceV.valid === false) {
        throw {message: reason, reason};
    }
    return instance;
}

export function extractResultFromRule(data, rule, domain) {
    const getErrors = propertyOr('errors', () => null);
    const getRuleErrors = propertyOr(`${rule}.${domain}`, () => null);
    const hasRuleErrors = compose((x) => x !== null && x !== undefined, getRuleErrors, getErrors);
    const throwFn = ifDoElse(
        (x) => hasRuleErrors(x),
        function (x) {
            throw getRuleErrors(x.errors)
        },
        function (x) {
            throw {message: 'Fail to process result', errors: getErrors(x)}
        }
    );
    const getData = propertyOr(`${rule}${domain}`, throwFn);
    return getData(data);
}

export const sha256OfObject = (data) => createHash('sha256').update(JSON.stringify(data)).digest('hex');

export const sha1OfObject = (data) => createHash('sha1').update(JSON.stringify(data)).digest('hex')

export const compose = (...fns) => (...args) => fns.reduceRight((res, fn) => [fn.call(null, ...res)], args)[0];

export function composeAsync(...fns) {
    const _reversed = fns.reverse();
    return async function a(...args) {
        let _args = args;
        for (const fn of _reversed) {
            _args = [await fn.call(null, ..._args)];
        }
        return _args[0];
    }
}

export const copyJson = (x) => JSON.parse(JSON.stringify(x));

export const propertyOr = (property, orFn) => data =>
    typeof data === 'object' && data !== null && data !== undefined && data.hasOwnProperty(property)
        ? data[property]
        : orFn(data);

export const propertyOrNull = property => propertyOr(property, _ => null);

export const doMap = fn => x => x.map(fn);

export const appendIt = (property, it) => ifDoElse(
    x => x && x.constructor === objectConstructor,
    x => Object.assign(x, {[property]: it}),
    _ => Object.assign({}, {[property]: it})
);

export const appendItFn = (property, itFn) => ifDoElse(
    x => x && x.constructor === objectConstructor,
    x => Object.assign(x, {[property]: itFn(x)}),
    _ => Object.assign({}, {[property]: itFn(_)})
);

export const removeIt = property => ifDoElse(
    x => x && x.constructor === objectConstructor,
    x => {
        delete x[property];
        return x;
    },
    _ => _
);

export const pushItFn = (property, itFn) => ifDoElse(
    x => x && x.constructor === objectConstructor,
    x => {
        Array.isArray(x[property]) ? x[property].push(itFn(x)) : x[property] = [itFn(x)];
        return x;
    },
    _ => ({[property]: [itFn(_)]})
);

export const ifDoElse = (fn, fn1, fn2) => (arg) => fn(arg) === true ? fn1(arg) : fn2(arg);

export const ifThrow = (fn, tFn) => ifDoElse(fn, x => {
    throw tFn(x);
}, x => x);

export const isFALSE = x => x === false;

export const justNOT = x => !x;

export const isTRUE = x => x === true;

export const justObject = ifDoElse(x => x && x.constructor === objectConstructor, x => x, _ => ({}));

export const justZero = _ => 0;

export const responseWithError = (response, code = 400) => (error) => {
    const getMessage = propertyOr('message', (x) => x ? x.toString() : null);
    console.log(error);
    response.status(code).json({message: getMessage(error)});
}

export const responseWithOkJson = (response, code = 200) => (value) => {
    response.status(code).json(value);
}

export const itOrEmptyList = list => Array.isArray(list) ? list : [];

export const doReturnIt = (doFn, itFn) => x => compose(_ => itFn(x), doFn)(x);

export const justIt = x => x;

// export const debugTrace = x => {
//     console.log(x);
//     return x;
// }

export const copyJsonMap = compose(x => ({...x}), justObject);
