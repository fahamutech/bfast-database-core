import {validate} from "jsonschema";

export async function validateInput(data: any, schema: any, message: string) {
    // @ts-ignore
    const a = validate(data, schema, {required: true});
    if (a.valid===false){
        throw {message, reason: a.errors.map(e=>`${e.message}`).join(', ')}
    }
    return true
}