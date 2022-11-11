import {Basic} from "../../models/basic";
import {RuleContext} from "../../models/rule-context";
import {DatabaseAdapter} from "../../adapters/database";
import {DatabaseWriteOptions} from "../../models/database-write-options";
import {BFastOptions} from "../../bfast-option";
import {validateInput} from "../index";
import {StringSchema} from "../../models/string";
import moment from "moment/moment";
import {generateUUID} from "../security/security";
import {checkIsAllowedDomainName, getReturnFields, publishChanges, sanitize4Db, sanitize4User, sanitizeDate} from "./index";

function addCreateMetadata(data: any, context: RuleContext) {
    let userUpdateDate = data.updatedAt;
    if (moment(userUpdateDate).isValid()) {
        userUpdateDate = moment(userUpdateDate).toDate();
    }
    let userCreateDate = data.createdAt;
    if (moment(userCreateDate).isValid()) {
        userCreateDate = moment(userCreateDate).toDate();
    }
    if (context) {
        data.createdBy = context.uid ? context.uid : null;
    }
    data.createdAt = userCreateDate ? userCreateDate : new Date();
    data.updatedAt = userUpdateDate ? userUpdateDate : new Date();
    if (data._id) {
        return data;
    }
    data._id = data && data.id ? data.id : generateUUID();
    delete data.id;
    return data;
}

export async function writeOneDataInStore<T extends Basic>(
    domain: string, data: T, context: RuleContext, databaseAdapter: DatabaseAdapter,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<T> {
    await validateInput(domain, StringSchema, 'invalid domain');
    await validateInput(data, {type: 'object'}, 'invalid data')
    await checkIsAllowedDomainName(domain, writeOptions);
    const returnFields = getReturnFields(data);
    const sanitizedDataWithCreateMetadata = addCreateMetadata(data, context);
    const sanitizedData: any = sanitize4Db(sanitizedDataWithCreateMetadata);
    const savedData: any = await databaseAdapter.createOneData(domain, sanitizeDate(sanitizedData), options);
    const cleanDoc: any = sanitize4User(savedData, returnFields);
    publishChanges(domain, {
        _id: cleanDoc?.id, fullDocument: cleanDoc, documentKey: cleanDoc?.id, operationType: "create"
    }, options);
    return cleanDoc;
}

export async function writeManyDataInStore<T extends Basic>(
    domain: string, data: T[], context: RuleContext, databaseAdapter: DatabaseAdapter,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any[]> {
    await validateInput(domain, StringSchema, 'invalid domain')
    await validateInput(data, {type: 'array', items: {type: 'object'}}, 'invalid data')
    if (data.length === 0) return [];
    await checkIsAllowedDomainName(domain, writeOptions);
    const returnFields = getReturnFields(data[0]);
    const sanitizedData: any[] = data.map(x => {
        x = addCreateMetadata(x, context);
        x = sanitize4Db(x)
        return sanitizeDate(x);
    });
    const savedData = await databaseAdapter.createManyData(domain, sanitizedData, options)
    return savedData.map(d => {
        publishChanges(domain, {
            _id: d._id, fullDocument: d, documentKey: d._id, operationType: "create"
        }, options);
        return sanitize4User(d, returnFields)
    });
}
