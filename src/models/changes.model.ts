export interface ChangesModel {
    _id?: string;
    filter?: any;
    operationType?: 'create' | 'update' | 'delete';
    fullDocument?: any;
    documentKey?: string
}
