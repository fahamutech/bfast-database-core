const bfast = require("bfast");
const {expect, should} = require('chai');
const {config, mongoRepSet} = require("../mock.config");
const Y = require('yjs')
const {WebsocketProvider} = require("y-websocket");
const {v4} = require("uuid");
const {WebrtcProvider} = require("y-webrtc");
global.WebSocket = require('ws');

describe('syncs', function () {
    this.timeout(5000);
    before(async function () {
        await mongoRepSet().start();
    })
    describe('connectivity', function () {
        it('should connect a listener', function (done) {
            let connectedCalled = false;
            const changes = bfast.functions().event(
                '/v2/__syncs__',
                () => {
                    connectedCalled = true;
                    changes.emit({
                        auth: {
                            applicationId: config.applicationId,
                            topic: `${config.projectId}_test`
                        },
                        body: {
                            domain: 'test'
                        }
                    });
                },
                // ()=>{
                // console.log('disconnected');
                // }
            );
            changes.listener(response => {
                    if (response?.body?.info) {
                        expect(connectedCalled).equal(true);
                        should().exist(response.body.info);
                        expect(response.body).eql({
                            info: 'start listening for syncs'
                        });
                        done();
                        changes.close();
                    }
                }
            );
        });
        it('should close a syncs when asked', function (done) {
            const changes = bfast.functions().event(
                '/v2/__syncs__',
                () => {
                    changes.emit({
                        auth: {
                            applicationId: config.applicationId,
                            topic: `${config.projectId}_test`
                        },
                        body: {
                            domain: 'test'
                        }
                    });
                    changes.close();
                },
                () => {
                    done();
                }
            );
        });
    });
    describe('exchanges', function () {
        it('should receive new snapshot doc', function (done) {
            const domain = Math.random().toString(16).split('.')[1];
            const room = config.projectId + '_' + domain;
            const changes = bfast.functions().event(
                '/v2/__syncs__',
                () => {
                    console.log('connected *******');
                    changes.emit({
                        auth: {
                            applicationId: config.applicationId,
                            topic: `${config.projectId}_${domain}`
                        },
                        body: {
                            domain: domain
                        }
                    });
                }
            );
            const yDoc = new Y.Doc();
            new WebrtcProvider(room, yDoc, {
                // signaling: [
                //     'wss://stun.l.google.com',
                //     'wss://stun1.l.google.com',
                //     'wss://stun2.l.google.com',
                //     'wss://stun3.l.google.com',
                //     'wss://stun4.l.google.com',
                // ]
            });
            new WebsocketProvider(
                'wss://demos.yjs.dev',
                room,
                yDoc,
                {
                    WebSocketPolyfill: require('ws'),
                }
            );
            // const yMap = yDoc.getMap(domain);
            // yMap.observe(arg0 => {
            //     console.log(arg0.changes, '++++++');
            // });
            // yMap.clear();
            changes.listener(response => {
                if (response?.body?.info) {
                    // const id = v4();
                    // yMap.set(id, {
                    //     _id: id,
                    //     age: Math.random()
                    // });
                    // const v = Math.random();
                    // yMap.set('a', {
                    //     _id: 'a',
                    //     age: v
                    // });
                    // yMap.set('a', {
                    //     _id: 'a',
                    //     age: v
                    // });
                    // yMap.delete('a');
                    // console.log(yMap.toJSON(), '********');
                    done();
                    changes.close();
                    // return;
                }
                // should().exist(response);
                // should().exist(response.body);
                // should().exist(response.body.change);
                // expect(typeof response.body.change).equal('string');
            });
        });
    });

    // describe('removeListener', function () {
    //     let c1, c2, r2;
    //     before(function () {
    //         c1 = bfast.database()
    //             .table('test2')
    //             .query()
    //             .changes();
    //         c2 = bfast.database()
    //             .table('test2')
    //             .query()
    //             .changes();
    //         c2.addListener((r) => {
    //             // console.log(r);
    //             if (r.body.info) {
    //                 return;
    //             }
    //             r2 = r.body.change;
    //         });
    //     })
    //     it('should count a total listener', function (done) {
    //         setTimeout(args => {
    //             const total = AppEventsFactory.getInstance().connected('_db_changes_test2');
    //             expect(total).equal(2);
    //             done();
    //         }, 500);
    //     });
    //     it('should remove specific listener only', function (done) {
    //         c1.close();
    //         bfast.database().table('test2').save({name: 'xps', id: 'josh', createdAt: 'leo', updatedAt: 'leo'});
    //         setTimeout(args => {
    //             const total = AppEventsFactory.getInstance().connected('_db_changes_test2');
    //             expect(total).equal(1);
    //             expect(r2).eql({
    //                 name: 'create',
    //                 snapshot: {name: 'xps', id: 'josh', createdAt: 'leo', updatedAt: 'leo', createdBy: null}
    //             })
    //             done();
    //         }, 700);
    //     });
    // });
});
