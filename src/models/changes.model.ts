export interface ChangesModel {
    _id?: string;
    operationType?: 'create' | 'update' | 'delete';
    fullDocument?: any;
    documentKey?: string
}
