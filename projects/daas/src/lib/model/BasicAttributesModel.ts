import {ObjectId} from "mongodb";

export interface BasicAttributesModel {
    id?: string;
    objectId?: string;
    _id?: string | ObjectId;
    _oid?: string | ObjectId;
    createdAt?: Date;
    _created_at?: Date;
    updatedAt?: Date;
    _updated_at?: Date;
    createdBy?: string;
    _created_by?: string;
    _rperm?: any;
    _wperm?: any;
    _acl?: any;
    _hashed_password?: string;
    password?: string;
    return?: string[];
    $currentDate?: { _updated_at: true };

    [key: string]: any;
}
