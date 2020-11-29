const {getRulesController, mongoRepSet} = require('../../mock.config');
const {before, after} = require('mocha');
const assert = require('assert');

describe('RulesController::Storage Unit Test', function () {
    let _rulesController;
    let mongoMemoryReplSet
    before(async function () {
        this.timeout(10000000000000000);
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
    });
    after(async function () {
        this.timeout(10000000000000000);
        await mongoMemoryReplSet.stop();
    });

    describe('RulesController::Storage::Save', function () {
        it('should return url of saved file', async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                applicationId: 'daas',
                files: {
                    save: {
                        filename: 'hello.txt',
                        base64: 'Hello, World',
                    }
                }
            }, results);
            assert(results.files !== undefined);
            assert(results.files.save !== undefined);
            assert(typeof results.files.save === "string");
            assert(results.files.save.toString().startsWith('/storage/daas/file'))
        });
    });

    describe('RulesController::Storage::Query', function () {
        before(async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                applicationId: 'daas',
                files: {
                    save: {
                        filename: 'doe.txt',
                        base64: 'Hello, Doe',
                    }
                }
            }, results);
            await _rulesController.handleStorageRule({
                applicationId: 'daas',
                files: {
                    save: {
                        filename: 'jobe.txt',
                        base64: 'Hello, Jobe',
                    }
                }
            }, results);
        });
        it('should list files', async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                applicationId: 'daas',
                files: {
                    list: {}
                }
            }, results);
            assert(results.files !== undefined);
            assert(results.files.list !== undefined);
            assert(Array.isArray(results.files.list));
            assert(results.files.list.length === 3);
            assert(typeof results.files.list[0].filename === "string");
        });
        it('should list only 2 files', async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                applicationId: 'daas',
                files: {
                    list: {
                        size: 2
                    }
                }
            }, results);
            assert(results.files !== undefined);
            assert(results.files.list !== undefined);
            assert(Array.isArray(results.files.list));
            assert(results.files.list.length === 2);
            assert(typeof results.files.list[0].filename === "string");
        });
        it('should list files contain doe keyword', async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                applicationId: 'daas',
                files: {
                    list: {
                        prefix: 'doe',
                    }
                }
            }, results);
            assert(results.files !== undefined);
            assert(results.files.list !== undefined);
            assert(Array.isArray(results.files.list));
            assert(results.files.list.length === 1);
            assert(results.files.list[0].filename.toString().includes('doe.txt') === true);
        });
    });

    describe('RulesController::Storage::Delete', function () {
        let filename = '';
        before(async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                applicationId: 'daas',
                files: {
                    save: {
                        filename: 'doe1.txt',
                        base64: 'Hello, Doe1',
                    }
                }
            }, results);
            filename = results.files.save.toString().replace('/storage/daas/file/', '');
        });
        it('should delete a  file', async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                applicationId: 'daas',
                files: {
                    delete: {
                        filename: filename
                    }
                }
            }, results);
            assert(results.files !== undefined);
            assert(results.files.delete !== undefined);
            assert(typeof results.files.delete === "string");
            assert(results.files.delete === filename);
        });
    });
});
