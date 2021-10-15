export interface ChangesModel {
    _id?: string;
    operationType?: 'create' | 'update' | 'delete';
    fullDocument?: any;
    documentKey?: { _id?: string }
}
