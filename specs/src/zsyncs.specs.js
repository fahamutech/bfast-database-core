// const bfast = require("bfast");
// const {expect, should} = require('chai');
// const {config, mongoRepSet} = require("../mock.config");
// const Y = require('yjs')
// const {WebsocketProvider} = require("y-websocket");
// const {v4} = require("uuid");
// const {WebrtcProvider} = require("y-webrtc");
// global.WebSocket = require('ws');
//
// describe('syncs', function () {
//     this.timeout(5000);
//     before(async function () {
//         await mongoRepSet().start();
//     })
//     describe('connectivity', function () {
//         it('should connect a listener', function (done) {
//             let connectedCalled = false;
//             const changes = bfast.functions().event(
//                 '/v2/__syncs__',
//                 () => {
//                     connectedCalled = true;
//                     changes.emit({
//                         auth: {
//                             applicationId: config.applicationId,
//                             topic: `${config.projectId}_test`
//                         },
//                         body: {
//                             domain: 'test'
//                         }
//                     });
//                 },
//                 // ()=>{
//                 // console.log('disconnected');
//                 // }
//             );
//             changes.listener(response => {
//                     if (response?.body?.info) {
//                         expect(connectedCalled).equal(true);
//                         should().exist(response.body.info);
//                         expect(response.body).eql({
//                             info: 'start listening for syncs'
//                         });
//                         done();
//                         changes.close();
//                     }
//                 }
//             );
//         });
//         it('should connect a listener twice', function (done) {
//             let connectedCalled = false;
//             let connectedCalled2 = false;
//             const s1 = bfast.functions().event(
//                 '/v2/__syncs__',
//                 () => {
//                     connectedCalled = true;
//                     s1.emit({
//                         auth: {
//                             applicationId: config.applicationId,
//                             topic: `${config.projectId}_test`
//                         },
//                         body: {
//                             domain: 'test'
//                         }
//                     });
//                 },
//                 // ()=>{
//                 // console.log('disconnected');
//                 // }
//             );
//             s1.listener(response => {
//                     if (response?.body?.info) {
//                         expect(connectedCalled).equal(true);
//                         should().exist(response.body.info);
//                         expect(response.body).eql({
//                             info: 'start listening for syncs'
//                         });
//                         // done();
//                         // changes.close();
//                     }
//                 }
//             );
//
//             const s2 = bfast.functions().event(
//                 '/v2/__syncs__',
//                 () => {
//                     connectedCalled2 = true;
//                     s2.emit({
//                         auth: {
//                             applicationId: config.applicationId,
//                             topic: `${config.projectId}_test`
//                         },
//                         body: {
//                             domain: 'test'
//                         }
//                     });
//                 },
//                 // ()=>{
//                 // console.log('disconnected');
//                 // }
//             );
//             s2.listener(response => {
//                     if (response?.body?.info) {
//                         expect(connectedCalled2).equal(true);
//                         should().exist(response.body.info);
//                         expect(response.body).eql({
//                             info: 'start listening for syncs'
//                         });
//                         s1.close();
//                         s2.close();
//                         done();
//                     }
//                 }
//             );
//         });
//         it('should close a syncs when asked', function (done) {
//             const changes = bfast.functions().event(
//                 '/v2/__syncs__',
//                 () => {
//                     changes.emit({
//                         auth: {
//                             applicationId: config.applicationId,
//                             topic: `${config.projectId}_test`
//                         },
//                         body: {
//                             domain: 'test'
//                         }
//                     });
//                     changes.close();
//                 },
//                 () => {
//                     done();
//                 }
//             );
//         });
//     });
//     describe('exchanges', function () {
//         it('should receive new snapshot doc', function (done) {
//             const domain = Math.random().toString(16).split('.')[1];
//             const room = config.projectId + '_' + domain;
//             const changes = bfast.functions().event(
//                 '/v2/__syncs__',
//                 () => {
//                     console.log('connected *******');
//                     changes.emit({
//                         auth: {
//                             applicationId: config.applicationId,
//                             topic: `${config.projectId}_${domain}`
//                         },
//                         body: {
//                             domain: domain
//                         }
//                     });
//                 }
//             );
//             const yDoc = new Y.Doc();
//             new WebrtcProvider(room, yDoc);
//             new WebsocketProvider(
//                 'wss://demos.yjs.dev',
//                 room,
//                 yDoc,
//                 {
//                     WebSocketPolyfill: require('ws'),
//                 }
//             );
//             const yMap = yDoc.getMap(domain);
//             yMap.observe(arg0 => {
//                 // console.log(arg0.changes, '++++++');
//                 done();
//                 changes.close();
//             });
//             // yMap.clear();
//             changes.listener(response => {
//                 // console.log(response)
//                 if (response?.body?.info) {
//                     const id = v4();
//                     yMap.set(id, {
//                         _id: id,
//                         age: Math.random()
//                     });
//                 }
//                 // should().exist(response);
//                 // should().exist(response.body);
//                 // should().exist(response.body.change);
//                 // expect(typeof response.body.change).equal('string');
//             });
//         });
//     });
// });
