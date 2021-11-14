export interface BasicAttributesModel {
    id?: string;
    _id?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    password?: string;
    return?: string[];
    $currentDate?: { updatedAt: true };
    [key: string]: any;
}
