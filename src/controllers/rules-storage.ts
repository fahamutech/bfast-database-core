import {ruleHasPermission} from "./policy";
import {deleteFileInStore, listFilesFromStore, saveFileInStore} from "./storage";
import {RuleResponse} from "../models/rule-response";
import {RuleContext} from "../models/rule-context";
import {BFastOptions} from "../bfast-option";
import {FilesAdapter} from "../adapters/files";
import {DatabaseAdapter} from "../adapters/database";

async function checkFilePermission(
    action: string, context: RuleContext, databaseAdapter: DatabaseAdapter, options: BFastOptions
) {
    const allowed = await ruleHasPermission(`files.${action}`, context, databaseAdapter, options);
    if (allowed !== true) throw {message: 'You have insufficient permission to this resource'}
}

async function saveFile(
    action: string, data: any, ruleResponse: RuleResponse, context: RuleContext,
    filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): Promise<RuleResponse> {
    await checkFilePermission(action, context, databaseAdapter, options)
    if (!ruleResponse.files) ruleResponse.files = {};
    ruleResponse.files.save = await saveFileInStore(data, context, filesAdapter, options);
    return ruleResponse
}

async function deleteFile(
    action: string, data: any, ruleResponse: RuleResponse, context: RuleContext,
    filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): Promise<RuleResponse> {
    await checkFilePermission(action, context, databaseAdapter, options)
    if (!ruleResponse.files) ruleResponse.files = {};
    ruleResponse.files.delete = await deleteFileInStore(data, context, filesAdapter, options);
    return ruleResponse;
}

async function listFiles(
    action: string, data: any, ruleResponse: RuleResponse, context: RuleContext,
    filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): Promise<RuleResponse> {
    await checkFilePermission(action, context, databaseAdapter, options)
    if (!ruleResponse.files) ruleResponse.files = {};
    const listData = {
        prefix: data && data.prefix ? data.prefix : '',
        size: data && data.size ? data.size : 20,
        after: data && data.after ? data.after : null,
        skip: data && data.skip ? data.skip : 0
    }
    ruleResponse.files.list = await listFilesFromStore(listData, filesAdapter, options);
    return ruleResponse
}

export async function handleStorageRule(
    file: any, ruleResponse: RuleResponse, fileAdapter: FilesAdapter,
    databaseAdapter: DatabaseAdapter, context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    for (const action of Object.keys(file)) {
        const data = file[action];
        if (action === 'save') ruleResponse =
            await saveFile(action, data, ruleResponse, context, fileAdapter, databaseAdapter, options);
        if (action === 'delete') ruleResponse =
            await deleteFile(action, data, ruleResponse, context, fileAdapter, databaseAdapter, options);
        if (action === 'list') ruleResponse =
            await listFiles(action, data, ruleResponse, context, fileAdapter, databaseAdapter, options);
    }
    return ruleResponse;
}