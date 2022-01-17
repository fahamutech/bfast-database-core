import {database, extractResultFromServer, init} from "bfast";
import {expect, should} from "chai";
import {config, databaseFactory} from "../test";
import {handleDeleteRules} from "../controllers/rules";
import {loadEnv} from "../utils/env";

const date = new Date().toISOString()

async function clearData() {
    const a = await handleDeleteRules({
        deletetest: {
            filter: {
                updatedAt: {$exists: true}
            }
        }
    }, {errors: {}}, databaseFactory(), loadEnv(), null)
    extractResultFromServer(a, 'delete', 'test')
}

describe('ChangesSocket', function () {
    before(async () =>{
        await clearData()
        // init({
        //     applicationId: config.applicationId,
        //     projectId: config.projectId,
        //     appPassword: config.masterKey,
        //     databaseURL: `http://localhost:${config.port}`,
        //     functionsURL: `http://localhost:${config.port}`
        // })
    })
    after(async () => await clearData())
    describe('connectivity', function () {
        it('should connect a listener', function (done) {
            let connectedCalled = false;
            const changes = database()
                .table('test')
                .query()
                .changes(
                    () => {
                        connectedCalled = true;
                    }
                );
            changes.addListener(response => {
                    expect(connectedCalled).equal(true);
                    should().exist(response.body.info);
                    expect(response.body).eql({
                        info: 'start listening for changes'
                    });
                    done();
                    changes.close();
                }
            );
        });
        it('should close a listener when asked', function (done) {
            const changes = database()
                .table('test')
                .query()
                .changes(
                    () => {
                        changes.close();
                    },
                    () => {
                        done();
                    }
                );
        });
    });
    describe('create', function () {
        it('should receive created doc', function (done) {
            const changes = database()
                .table('test')
                .query()
                .changes(
                    () => {
                        database()
                            .table('test')
                            .save({
                                id: 'ethan',
                                name: 'joshua',
                                createdAt: date,
                                updatedAt: date
                            });
                    },
                    () => {
                    }
                );
            changes.addListener(response => {
                if (response.body.info) {
                    return;
                }
                should().exist(response);
                should().exist(response.body);
                should().exist(response.body.change);
                expect(response.body.change).eql({
                    name: 'create',
                    snapshot: {
                        id: 'ethan',
                        name: 'joshua',
                        createdAt: date,
                        updatedAt: date,
                        createdBy: null
                    }
                })
                done();
                changes.close();
            });
        });
        it('should receive all created docs', function (done) {
            const changes = database()
                .table('test')
                .query()
                .changes(
                    () => {
                        database()
                            .table('test')
                            .save([
                                {
                                    id: 'ethan2',
                                    name: 'joshua',
                                    createdAt: date,
                                    updatedAt: date
                                },
                                {
                                    id: 'zai',
                                    name: 'tuni',
                                    createdAt: date,
                                    updatedAt: date
                                }
                            ]);
                    },
                    () => {
                    }
                );
            let called = 0;
            changes.addListener(response => {
                if (response.body.info) return
                should().exist(response);
                should().exist(response.body);
                should().exist(response.body.change);
                expect([
                    {
                        name: 'create',
                        snapshot: {
                            id: 'ethan2',
                            name: 'joshua',
                            createdAt: date,
                            updatedAt: date,
                            createdBy: null
                        }
                    },
                    {
                        name: 'create',
                        snapshot: {
                            id: 'zai',
                            name: 'tuni',
                            createdAt: date,
                            updatedAt: date,
                            createdBy: null
                        }
                    }
                ]).to.deep.include(response.body.change);
                called += 1;
                if (called === 2) {
                    done();
                    changes.close()
                }

            });
        });
    });
    describe('delete', function () {
        it('should receive deleted doc with id only', function (done) {
            const changes = database()
                .table('test')
                .query()
                .changes(
                    () => {
                        database()
                            .table('test')
                            .query()
                            .byId('ethan')
                            .delete();//.then(console.log);
                    },
                    () => {
                    }
                );
            changes.addListener(response => {
                if (response.body.info) {
                    return;
                }
                should().exist(response);
                should().exist(response.body);
                should().exist(response.body.change);
                expect(response.body.change).eql({
                    name: 'delete',
                    snapshot: {
                        id: 'ethan'
                    }
                })
                changes.close();
                done();
            });
        });
    });
    describe('removeListener', function () {
        let c1, c2, r2;
        before(function () {
            c1 = database()
                .table('test2')
                .query()
                .changes();
            c2 = database()
                .table('test2')
                .query()
                .changes();
            c2.addListener((r) => {
                // console.log(r);
                if (r.body.info) {
                    return;
                }
                r2 = r.body.change;
            });
        })
        // it('should count a total listener', function (done) {
        //     setTimeout(args => {
        //         const total = AppEventsFactory.getInstance().connected('_db_changes_test2' + config.projectId);
        //         expect(total).equal(2);
        //         done();
        //     }, 1000);
        // });
        // it('should removeDataInStore specific listener only', function (done) {
        //     c1.close();
        //     database().table('test2').save({name: 'xps', id: 'josh', createdAt: date, updatedAt: date});
        //     setTimeout(args => {
        //         const total = AppEventsFactory.getInstance().connected('_db_changes_test2' + config.projectId);
        //         expect(total).equal(1);
        //         expect(r2).eql({
        //             name: 'create',
        //             snapshot: {name: 'xps', id: 'josh', createdAt: date, updatedAt: date, createdBy: null}
        //         })
        //         done();
        //     }, 700);
        // });
    });
});