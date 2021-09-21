// import {join} from "path";
// import {ChildProcess, fork} from "child_process";
//
// process.env.YPERSISTENCE = join(__dirname, '/../../syncs_data');
//
// export async function startYJsWebsocketServer(): Promise<ChildProcess> {
//     const wServer = join(__dirname, '/../../node_modules/y-websocket/bin/server.js')
//     return fork(`${wServer}`).on('message', message => {
//         console.log(message);
//     });
// }
