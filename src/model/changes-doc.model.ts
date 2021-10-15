export interface ChangesDocModel {
    name: 'create' | 'update' | 'delete',
    // resumeToken: string,
    snapshot: {[k:string]: any}
}
