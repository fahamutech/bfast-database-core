export interface ChangesModel {
    _id?: string;
    operationType?: 'insert' | 'update' | 'delete' | 'replace';
    fullDocument?: { [key: string]: any };
    documentKey?: { _id?: string }
}
