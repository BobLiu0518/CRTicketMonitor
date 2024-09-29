import fs from 'fs';
import moment from 'moment';
import request from 'sync-request';
import sendToWeCom from './serverChan.js';

let config = JSON.parse(fs.readFileSync('config.json', 'UTF-8') ?? '{}');
let cookie = fs.readFileSync('cookie.dat', 'UTF-8') ?? '';
let ua = fs.readFileSync('ua.dat', 'UTF-8') ?? '';

function sendMsg(msg) {
    sendToWeCom({
        text: msg,
        wecomAgentId: config.serverChan.agentId,
        wecomSecret: config.serverChan.secret,
        wecomCId: config.serverChan.companyId,
    });
}

function update() {
    let time = () => {
        return moment().format('YYYY/MM/DD HH:mm:ss');
    };
    console.log(time(), '[Info]', '获取余票数量…');
    try {
        config.watch.forEach((search) => {
            let res = request('GET', search.api, {
                headers: {
                    Cookie: cookie,
                    'User-Agent': ua,
                },
            });
            let data = JSON.parse(res.getBody('UTF-8'));
            if (!data || !data.status) {
                throw res;
            }
            data.data.result.forEach((row) => {
                search.trains.forEach((train) => {
                    if (row.indexOf(train) != -1) {
                        console.log(time(), '[Info]', '找到车次', train);
                        if (row.split('|')[30] != '无') {
                            console.log(time(), '[Info]', '!!! 二等座有票 !!!');
                            sendMsg(train + ' !!! 二等座有票 !!!');
                        } else {
                            console.log(time(), '[Info]', '二等座无票');
                        }
                    }
                });
            });
        });
    } catch (e) {
        console.error(time(), '[Error]', e);
        sendMsg(e);
    }
    console.log();
}

sendMsg('CRTicketMonitor 已启动！');
update();
setInterval(update, 15 * 60 * 1000);
