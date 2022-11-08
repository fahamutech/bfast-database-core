import {after, before} from "mocha";
import {expect, should} from "chai";
import {loadEnv} from "../../utils";
import {handleDeleteRules, handleStorageRules} from "./rules";
import {AuthFactory} from "../../factories/auth";
import {IpfsStorageFactory} from "../../factories/ipfs-storage";
import {extractResultFromServer} from "bfast";
import {databaseFactory} from "../../test";

let options;
const authFactory = new AuthFactory()
const ipfsFactory = new IpfsStorageFactory()

async function clearData() {
    const a = await handleDeleteRules({
        context: {useMasterKey: true},
        delete_Storage: {
            filter: {updatedAt: {$exists: true}}
        }
    }, {errors: {}},databaseFactory(), loadEnv(), null)
    extractResultFromServer(a, 'delete', '_Storage')
}

describe('RulesStorageController', function () {
    beforeEach(() => options = loadEnv())
    before(async () => await clearData())
    after(async () => await clearData())
    describe('handleStorageRule', function () {
        describe('add', function () {
            it('should return url of saved file', async function () {
                const results = await handleStorageRules({
                        applicationId: 'daas',
                        files: {
                            save: {
                                name: 'hello.txt',
                                base64: 'Hello, World',
                            }
                        }
                    }, {errors: {}}, databaseFactory(), authFactory, ipfsFactory, options
                );
                // console.log(results);
                should().exist(results.files);
                should().exist(results.files.save);
                expect(results.files.save).be.a("string");
                expect(results.files.save.toString().startsWith('/storage/bfast/file')).equal(true);
            });
        });
        describe('list', function () {
            before(async function () {
                const results = {errors: {}};
                await handleStorageRules({
                        applicationId: 'daas',
                        files: {
                            save: {
                                name: 'doe.txt',
                                base64: 'Hello, Doe',
                            }
                        }
                    }, results, databaseFactory(), authFactory, ipfsFactory, options
                );
                await handleStorageRules({
                        applicationId: 'daas',
                        files: {
                            save: {
                                name: 'jobe.txt',
                                base64: 'Hello, Jobe',
                            }
                        }
                    }, results, databaseFactory(), authFactory, ipfsFactory, options
                );
            });
            it('should list files', async function () {
                const results = await handleStorageRules({
                        applicationId: 'daas',
                        files: {
                            list: {}
                        }
                    }, {errors: {}}, databaseFactory(), authFactory, ipfsFactory, options
                );
                should().exist(results.files);
                should().exist(results.files.list);
                expect(results.files.list).be.a('array');
                expect(results.files.list).length(3);
                expect(results.files.list[0].name).be.a("string");
            });
            it('should list only 2 files', async function () {
                const results = await handleStorageRules({
                        applicationId: 'daas',
                        files: {
                            list: {
                                size: 2
                            }
                        }
                    }, {errors: {}}, databaseFactory(), authFactory, ipfsFactory, options
                );
                should().exist(results.files);
                should().exist(results.files.list);
                expect(results.files.list).be.a('array');
                expect(results.files.list).length(2);
                expect(results.files.list[0].name).be.a("string");
            });
            it('should list files contain doe keyword', async function () {
                const results = await handleStorageRules({
                        applicationId: 'daas',
                        files: {
                            list: {
                                prefix: 'doe',
                            }
                        }
                    }, {errors: {}}, databaseFactory(), authFactory, ipfsFactory, options
                );
                should().exist(results.files);
                should().exist(results.files.list);
                expect(results.files.list).be.a('array');
                expect(results.files.list).length(1);
                expect(results.files.list[0].name.toString().includes('doetxt')).equal(true);
            });
        });
        describe('delete', function () {
            let name = '';
            before(async function () {
                const results = {errors: {}};
                const v = await handleStorageRules({
                        applicationId: 'daas',
                        files: {
                            save: {
                                name: 'doe1.txt',
                                base64: 'Hello, Doe1',
                            }
                        }
                    }, results, databaseFactory(), authFactory, ipfsFactory, options
                );
                name = v.files.save.toString().replace('/storage/bfast/file/', '');
            });
            it('should delete a file', async function () {
                const results = await handleStorageRules({
                        applicationId: 'daas',
                        files: {
                            delete: {
                                name: name
                            }
                        }
                    }, {errors: {}}, databaseFactory(), authFactory, ipfsFactory, options
                );
                should().exist(results.files);
                should().exist(results.files.delete);
                expect(results.files.delete).length(1);
                expect(results.files.delete[0].id).equal(name);
            });
        });
    });
});
