export interface ChangesModel {
    _id?: string;
    operationType?: 'create' | 'update' | 'delete';
    fullDocument?: { [key: string]: any };
    documentKey?: { _id?: string }
}
