const {getRulesController, mongoRepSet} = require('../mock.config');
const {before, after} = require('mocha');
const {assert, should, expect} = require('chai');

describe('Storage', function () {
    this.timeout(10000000000000000);
    let _rulesController;
    let mongoMemoryReplSet
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
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
                        filename: 'hello.txt',
                        base64: 'Hello, World',
                    }
                }
            }, results);
            should().exist(results.files);
            should().exist(results.files.save);
            expect(typeof results.files.save).equal("string");
            expect(results.files.save.toString().startsWith('/storage/daas/file')).equal(true);
        });
    });

    describe('list', function () {
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
            should().exist(results.files);
            should().exist(results.files.list);
            expect(Array.isArray(results.files.list)).equal(true);
            expect(results.files.list.length).equal(3);
            expect(typeof results.files.list[0].filename).equal("string");
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
            should().exist(results.files);
            should().exist(results.files.list);
            expect(Array.isArray(results.files.list)).equal(true);
            expect(results.files.list).length(2);
            expect(typeof results.files.list[0].filename).equal("string");
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

    describe('delete', function () {
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
            // console.log(results.files.delete)
            should().exist(results.files);
            should().exist(results.files.delete);
            expect(results.files.delete).length(1);
            expect(results.files.delete[0]._id).equal('doe1.txt');
            // expect(typeof results.files.delete).eql( [{
            //     _id: 'doe1.txt'
            // }]);
        });
    });
});
