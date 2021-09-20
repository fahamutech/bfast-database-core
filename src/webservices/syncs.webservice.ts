import {join} from "path";
import {exec, fork} from "child_process";

process.env.YPERSISTENCE = join(__dirname, '/../../syncs_data');

export async function startYJsWebsocketServer() {
    const wServer = join(__dirname, '/../../node_modules/y-websocket/bin/server.js')
    fork(`${wServer}`).on('message', message => {
        console.log(message);
    });
    return 'done'
}
