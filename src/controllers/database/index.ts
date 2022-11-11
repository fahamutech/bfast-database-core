import {ChangesModel} from '../../models/changes.model';
import {AppEventsFactory} from "../../factories/app-events";
import {BFastOptions, BFastOptionsSchema} from "../../bfast-option";
import {DatabaseWriteOptions} from "../../models/database-write-options";
import moment from 'moment';
import {
    compose, copyJsonMap,
    ifDoElse,
    ifThrow,
    isTRUE,
    justIt,
    propertyOrNull,
    validateInput
} from "../index";
import {DatabaseAdapter} from "../../adapters/database";

const handleDomainValidation = compose(
    _ => true,
    ifThrow(d => !(d !== '_User' && d !== '_Token' && d !== '_Policy'), function (d) {
        throw {message: `${d} is not a valid domain name`};
    })
);

export const checkIsAllowedDomainName = async (domain: string, options: DatabaseWriteOptions) => {
    const check = ifDoElse(
        compose(isTRUE,propertyOrNull('bypassDomainVerification')),
        _=>handleDomainValidation(domain),
        justIt
    );
    check(options);
}

export const sanitizeDate = data => {
    if (data && data.createdAt) {
        if (moment(data.createdAt).isValid()) {
            data.createdAt = moment(data.createdAt).toDate();
        }
    }
    if (data && data.updatedAt) {
        if (moment(data.updatedAt).isValid()) {
            data.updatedAt = moment(data.updatedAt).toDate();
        }
    }
    return data;
}

export const getReturnFields = data => {
    if (data && data.return && Array.isArray(data.return)) {
        let flag = true;
        if (data.return.length > 0) {
            data.return.forEach(value => {
                if (typeof value !== 'string') {
                    flag = false;
                }
            });
        }
        if (flag === true) {
            return data.return;
        } else {
            return [];
        }
    } else {
        return [];
    }
}

export const sanitizeWithOperator4Db = _data => {
    const data = copyJsonMap(_data);
    if (data.filter && data.filter.id) {
        data.filter._id = data.filter.id;
        delete data.filter.id;
    }
    if (data.id) {
        data._id = data.id;
        delete data.id;
    }
    return data;
}

export const sanitize4Db = _data => {
    const  data = copyJsonMap(_data);
    if (data && data.hasOwnProperty('return')) {
        delete data.return;
    }
    if (data && data.hasOwnProperty('id')) {
        data._id = data.id;
        delete data.id;
    }

    if (data && data.hasOwnProperty('_created_at')) {
        // data.createdAt = data._created_at;
        delete data._created_at;
    }

    if (data && data.hasOwnProperty('_updated_at')) {
        // data.updatedAt = data._updated_at;
        delete data._updated_at;
    }

    if (data && data.hasOwnProperty('_created_by')) {
        // data.createdBy = data._created_by;
        delete data._created_by;
    }
    return data;
}

export const sanitize4User = (_data: any, returnFields: string[]) => {
    const data = copyJsonMap(_data);
    if (data && data.hasOwnProperty('_id')) {
        data.id = data._id ? (typeof data._id === 'object' ? data._id : data._id.toString().trim()) : '';
        delete data._id;
    }
    if (data && data.hasOwnProperty('_created_at')) {
        delete data._created_at;
    }
    if (data && data.hasOwnProperty('_updated_at')) {
        delete data._updated_at;
    }
    if (data && data.hasOwnProperty('_created_by')) {
        delete data._created_by;
    }
    if (data && data.hasOwnProperty('_hashed_password')) {
        delete data._hashed_password;
    }
    if (data && typeof data.hasOwnProperty('_rperm')) {
        delete data._rperm;
    }
    if (data && typeof data.hasOwnProperty('_wperm')) {
        delete data._wperm;
    }
    if (data && typeof data.hasOwnProperty('_acl')) {
        delete data._acl;
    }
    let returnedData: any = {};
    if (!Array.isArray(returnFields)) {
        return data;
    }
    if (Array.isArray(returnFields) && returnFields.length === 0) {
        return data;
    }
    if (Array.isArray(returnFields)) {
        returnFields.forEach(value => {
            returnedData[value] = data[value];
        });
        returnedData.id = data.id;
        returnedData.createdAt = data.createdAt;
        returnedData.updatedAt = data.updatedAt;
        delete returnedData._id
        return returnedData;
    }
    return data;
}

export const publishChanges = (domain: string, change: ChangesModel, options: BFastOptions) => {
    const aI = AppEventsFactory.getInstance();
    aI.pub(aI.eventName(options.projectId, domain), change);
}

export async function initDataStore(
    databaseAdapter: DatabaseAdapter, options: BFastOptions
): Promise<any> {
    await validateInput(options, BFastOptionsSchema, 'invalid bfast options')
    return databaseAdapter.init(options);
}


