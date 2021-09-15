const {mongoRepSet, config} = require('../../mock.config');
const {before, after} = require('mocha');
const {assert, should, expect} = require('chai');
const {
    RulesController, AuthFactory, IpfsStorageFactory, StorageController, AuthController, DatabaseController,
    SecurityController, DatabaseFactory
} = require("../../../dist");

describe('Storage', function () {

    let _rulesController = new RulesController();
    let mongoMemoryReplSet
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });

    describe('add', function () {
        it('should return url of saved file', async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        save: {
                            name: 'hello.txt',
                            base64: 'Hello, World',
                        }
                    }
                }, results,
                new StorageController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new AuthFactory(),
                new DatabaseFactory(),
                new IpfsStorageFactory(),
                config
            );
            should().exist(results.files);
            should().exist(results.files.save);
            expect(typeof results.files.save).equal("string");
            expect(results.files.save.toString().startsWith('/storage/bfast_test/file')).equal(true);
        });
    });

    describe('list', function () {
        before(async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        save: {
                            name: 'doe.txt',
                            base64: 'Hello, Doe',
                        }
                    }
                }, results,
                new StorageController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new AuthFactory(),
                new DatabaseFactory(),
                new IpfsStorageFactory(),
                config
            );
            await _rulesController.handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        save: {
                            name: 'jobe.txt',
                            base64: 'Hello, Jobe',
                        }
                    }
                }, results,
                new StorageController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new AuthFactory(),
                new DatabaseFactory(),
                new IpfsStorageFactory(),
                config
            );
        });
        it('should list files', async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        list: {}
                    }
                }, results,
                new StorageController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new AuthFactory(),
                new DatabaseFactory(),
                new IpfsStorageFactory(),
                config
            );
            should().exist(results.files);
            should().exist(results.files.list);
            expect(Array.isArray(results.files.list)).equal(true);
            expect(results.files.list.length).equal(3);
            expect(typeof results.files.list[0].name).equal("string");
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
                }, results,
                new StorageController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new AuthFactory(),
                new DatabaseFactory(),
                new IpfsStorageFactory(),
                config
            );
            should().exist(results.files);
            should().exist(results.files.list);
            expect(Array.isArray(results.files.list)).equal(true);
            expect(results.files.list).length(2);
            expect(typeof results.files.list[0].name).equal("string");
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
                }, results,
                new StorageController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new AuthFactory(),
                new DatabaseFactory(),
                new IpfsStorageFactory(),
                config
            );
            assert(results.files !== undefined);
            assert(results.files.list !== undefined);
            assert(Array.isArray(results.files.list));
            assert(results.files.list.length === 1);
            assert(results.files.list[0].name.toString().includes('doe.txt') === true);
        });
    });

    describe('delete', function () {
        let name = '';
        before(async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        save: {
                            name: 'doe1.txt',
                            base64: 'Hello, Doe1',
                        }
                    }
                }, results,
                new StorageController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new AuthFactory(),
                new DatabaseFactory(),
                new IpfsStorageFactory(),
                config
            );
            name = results.files.save.toString().replace('/storage/bfast_test/file/', '');
        });
        it('should delete a file', async function () {
            const results = {errors: {}};
            await _rulesController.handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        delete: {
                            name: name
                        }
                    }
                }, results,
                new StorageController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new AuthFactory(),
                new DatabaseFactory(),
                new IpfsStorageFactory(),
                config
            );
            should().exist(results.files);
            should().exist(results.files.delete);
            expect(results.files.delete).length(1);
            expect(results.files.delete[0]._id).equal('doe1.txt');
        });
    });
});
