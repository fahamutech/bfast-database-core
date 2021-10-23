const bfast = require("bfast");
const {expect, should} = require('chai');
const {config} = require("../../mock.config");
const {AppEventsFactory} = require("../../../dist/factories/app-events.factory");


describe('Changes', function () {
    this.timeout(5000);
    describe('connectivity', function () {
        it('should connect a listener', function (done) {
            let connectedCalled = false;
            const changes = bfast.database()
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
            const changes = bfast.database()
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
            const changes = bfast.database()
                .table('test')
                .query()
                .changes(
                    () => {
                        bfast.database()
                            .table('test')
                            .save({
                                id: 'ethan',
                                name: 'joshua',
                                createdAt: 'leo',
                                updatedAt: 'leo'
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
                        createdAt: 'leo',
                        updatedAt: 'leo',
                        createdBy: null
                    }
                })
                done();
                changes.close();
            });
        });
        it('should receive all created docs', function (done) {
            const changes = bfast.database()
                .table('test')
                .query()
                .changes(
                    () => {
                        bfast.database()
                            .table('test')
                            .save([
                                {
                                    id: 'ethan2',
                                    name: 'joshua',
                                    createdAt: 'leo',
                                    updatedAt: 'leo'
                                },
                                {
                                    id: 'zai',
                                    name: 'tuni',
                                    createdAt: 'leo',
                                    updatedAt: 'leo'
                                }
                            ]);
                    },
                    () => {
                    }
                );
            let called = 0;
            changes.addListener(response => {
                if (response.body.info) {
                    return;
                }
                should().exist(response);
                should().exist(response.body);
                should().exist(response.body.change);
                expect([
                    {
                        name: 'create',
                        snapshot: {
                            id: 'ethan2',
                            name: 'joshua',
                            createdAt: 'leo',
                            updatedAt: 'leo',
                            createdBy: null
                        }
                    },
                    {
                        name: 'create',
                        snapshot: {
                            id: 'zai',
                            name: 'tuni',
                            createdAt: 'leo',
                            updatedAt: 'leo',
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
    // describe('update', function () {
    //     it('should receive updated doc', function (done) {
    //         const changes = bfast.database()
    //             .table('test')
    //             .query()
    //             .changes(
    //                 () => {
    //                     bfast.database()
    //                         .table('test')
    //                         .query()
    //                         .byId('ethan')
    //                         .updateBuilder()
    //                         .set('age', 20)
    //                         .set('updatedAt', 'leo')
    //                         .update();//.then(console.log);
    //                 },
    //                 () => {
    //                 }
    //             );
    //         changes.addListener(response => {
    //             if (response.body.info) {
    //                 return;
    //             }
    //             should().exist(response);
    //             should().exist(response.body);
    //             should().exist(response.body.change);
    //             expect(response.body.change).eql({
    //                 name: 'create',
    //                 snapshot: {
    //                     id: 'ethan',
    //                     name: 'joshua',
    //                     age: 20,
    //                     createdAt: 'leo',
    //                     updatedAt: 'leo',
    //                     createdBy: null
    //                 }
    //             })
    //             changes.close();
    //             done();
    //         });
    //     });
    //     it('should receive all updated docs', function (done) {
    //         const changes = bfast.database()
    //             .table('test')
    //             .query()
    //             .changes(
    //                 () => {
    //                     bfast.functions()
    //                         .request('/v2')
    //                         .post({
    //                                 applicationId: config.applicationId,
    //                                 updatetest: {
    //                                     filter: {
    //                                         createdAt: 'leo'
    //                                     },
    //                                     update: {
    //                                         $set: {
    //                                             updatedAt: 'kesho'
    //                                         }
    //                                     },
    //                                     return: []
    //                                 }
    //                             }
    //                         );
    //                 },
    //                 () => {
    //                 }
    //             );
    //         let called = 0;
    //         changes.addListener(response => {
    //             if (response.body.info) {
    //                 return;
    //             }
    //             console.log(response.body.change);
    //             should().exist(response);
    //             should().exist(response.body);
    //             should().exist(response.body.change);
    //             expect([
    //                 {
    //                     name: 'update',
    //                     snapshot: {
    //                         id: 'ethan',
    //                         name: 'joshua',
    //                         age: 20,
    //                         createdAt: 'leo',
    //                         updatedAt: 'kesho',
    //                         createdBy: null
    //                     }
    //                 },
    //                 {
    //                     name: 'update',
    //                     snapshot: {
    //                         id: 'zai',
    //                         name: 'tuni',
    //                         createdAt: 'leo',
    //                         updatedAt: 'kesho',
    //                         createdBy: null
    //                     }
    //                 }
    //             ]).to.deep.include(response.body.change);
    //             called += 1;
    //             if (called === 2) {
    //                 changes.close()
    //                 done();
    //             }
    //
    //         });
    //     });
    // });
    describe('delete', function () {
        it('should receive deleted doc with id only', function (done) {
            const changes = bfast.database()
                .table('test')
                .query()
                .changes(
                    () => {
                        bfast.database()
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
        it('should receive all updated docs', function (done) {
            const changes = bfast.database()
                .table('test')
                .query()
                .changes(
                    () => {
                        bfast.functions()
                            .request('/v2')
                            .post({
                                    applicationId: config.applicationId,
                                    deletetest: {
                                        filter: {
                                            createdAt: 'leo'
                                        },
                                        return: []
                                    }
                                }
                            );
                    },
                    () => {
                    }
                );
            // let called = 0;
            changes.addListener(response => {
                if (response.body.info) {
                    return;
                }
                // console.log(response.body.change);
                should().exist(response);
                should().exist(response.body);
                should().exist(response.body.change);
                expect([
                    {
                        name: 'delete',
                        snapshot: {
                            id: 'zai'
                        }
                    }
                ]).to.deep.include(response.body.change);
                done();
                changes.close();
            });
        });
    });
    describe('removeListener', function () {
        let c1, c2, r2;
        before(function () {
            c1 = bfast.database()
                .table('test2')
                .query()
                .changes();
            c2 = bfast.database()
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
        it('should count a total listener', function (done) {
            setTimeout(args => {
                const total = AppEventsFactory.getInstance().connected('_db_changes_test2');
                expect(total).equal(2);
                done();
            }, 500);
        });
        it('should remove specific listener only', function (done) {
            c1.close();
            bfast.database().table('test2').save({name: 'xps', id: 'josh', createdAt: 'leo', updatedAt: 'leo'});
            setTimeout(args => {
                const total = AppEventsFactory.getInstance().connected('_db_changes_test2');
                expect(total).equal(1);
                expect(r2).eql({
                    name: 'create',
                    snapshot: {name: 'xps', id: 'josh', createdAt: 'leo', updatedAt: 'leo', createdBy: null}
                })
                done();
            }, 700);
        });
    });
});
