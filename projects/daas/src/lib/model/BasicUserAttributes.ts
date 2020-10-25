import {BasicAttributesModel} from "./BasicAttributesModel";

export interface BasicUserAttributes extends BasicAttributesModel {
    username?: string;
    email?: string;
    password?: string;
    token?: string;
}
