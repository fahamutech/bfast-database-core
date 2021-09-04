import {debuglog} from 'util'
const log = debuglog('dev');
const logP = debuglog('prod');

export function devLog(message, ...args){
    log(message, args);
}

export function prodLog(message: string, ...args){
    logP(message, args);
}
