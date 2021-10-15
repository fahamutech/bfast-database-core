export interface BasicAttributesModel {
    id?: string;
    _id?: string;
    _oid?: string;
    createdAt?: string;
    _created_at?: string;
    updatedAt?: string;
    _updated_at?: string;
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
