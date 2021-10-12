import {BasicUserAttributesModel} from '../model/basic-user-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {BFastOptions} from "../bfast-database.option";
import {SecurityController} from "../controllers/security.controller";
import {GetDataFn, GetNodeFn, GetNodesFn, PurgeNodeValueFn, UpsertDataFn, UpsertNodeFn} from "./database.adapter";

export abstract class AuthAdapter {
    abstract signUp<T extends BasicUserAttributesModel>(
        userModel: T,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        context: ContextBlock,
        securityController: SecurityController,
        options: BFastOptions
    ): Promise<T>;

    abstract signIn<T extends BasicUserAttributesModel>(
        userModel: T,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        context: ContextBlock,
        securityController: SecurityController,
        options: BFastOptions
    ): Promise<T>;

    abstract resetPassword(email: string, context: ContextBlock): Promise<any>;

    abstract updatePassword(
        password: string,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        securityController: SecurityController,
        context: ContextBlock,
        options: BFastOptions
    ): Promise<any>;

    abstract update<T extends BasicUserAttributesModel>(
        userModel: T,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        securityController: SecurityController,
        context: ContextBlock,
        options: BFastOptions
    ): Promise<T>;

    abstract sendVerificationEmail(
        email: string,
        context: ContextBlock,
        options: BFastOptions
    ): Promise<any>;
}
