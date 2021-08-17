const bfastnode = require("bfastnode");
const {expect, should} = require('chai');

const {bfast} = bfastnode;

describe('Changes', function () {
    describe('create', function () {
        this.timeout(5000);
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
                if (response.body.info){
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
            });
        });
    });
});
