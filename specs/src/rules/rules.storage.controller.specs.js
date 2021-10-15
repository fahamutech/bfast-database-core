const {mongoRepSet, config} = require('../../mock.config');
const {before, after} = require('mocha');
const {assert, should, expect} = require('chai');
const {handleStorageRule, AuthFactory, IpfsStorageFactory} = require("../../../dist/cjs");

describe('Storage', function () {

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
            await handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        save: {
                            name: 'hello.txt',
                            base64: 'Hello, World',
                        }
                    }
                }, results,
                new AuthFactory(),
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
            await handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        save: {
                            name: 'doe.txt',
                            base64: 'Hello, Doe',
                        }
                    }
                }, results,
                new AuthFactory(),
                new IpfsStorageFactory(),
                config
            );
            await handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        save: {
                            name: 'jobe.txt',
                            base64: 'Hello, Jobe',
                        }
                    }
                }, results,
                new AuthFactory(),
                new IpfsStorageFactory(),
                config
            );
        });
        it('should list files', async function () {
            const results = {errors: {}};
            await handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        list: {}
                    }
                }, results,
                new AuthFactory(),
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
            await handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        list: {
                            size: 2
                        }
                    }
                }, results,
                new AuthFactory(),
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
            await handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        list: {
                            prefix: 'doe',
                        }
                    }
                }, results,
                new AuthFactory(),
                new IpfsStorageFactory(),
                config
            );
            should().exist(results.files);
            should().exist(results.files.list);
            expect(Array.isArray(results.files.list)).equal(true);
            expect(results.files.list.length).equal(1);
            expect(results.files.list[0].name.toString().includes('doetxt')).equal(true);
        });
    });

    describe('delete', function () {
        let name = '';
        before(async function () {
            const results = {errors: {}};
            const v = await handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        save: {
                            name: 'doe1.txt',
                            base64: 'Hello, Doe1',
                        }
                    }
                }, results,
                new AuthFactory(),
                new IpfsStorageFactory(),
                config
            );
            name = v.files.save.toString().replace('/storage/bfast_test/file/', '');
        });
        it('should delete a file', async function () {
            const results = {errors: {}};
            await handleStorageRule({
                    applicationId: 'daas',
                    files: {
                        delete: {
                            name: name
                        }
                    }
                }, results,
                new AuthFactory(),
                new IpfsStorageFactory(),
                config
            );
            should().exist(results.files);
            should().exist(results.files.delete);
            expect(results.files.delete).length(1);
            expect(results.files.delete[0].id).equal(name);
        });
    });
});
