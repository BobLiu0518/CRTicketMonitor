import fs from 'fs';
import ChinaRailway from './cr.js';
import { time, sleep } from './utils.js';
import { sendToWecom } from './serverChan.js';

let config = JSON.parse(fs.readFileSync('config.json', 'UTF-8') ?? '{}');
let { stationCode, stationName } = ChinaRailway.getStationData();

function sendMsg(msg) {
    return;
    sendToWecom({
        text: '[CRTicketMonitor]\n' + msg,
        wecomAgentId: config.serverChan.agentId,
        wecomSecret: config.serverChan.secret,
        wecomCId: config.serverChan.companyId,
    });
}

function searchTickets(search) {
    console.log(
        time(),
        '[Info]',
        '搜索',
        search.date,
        search.from + '→' + search.to,
        '车票：'
    );
    let data = ChinaRailway.checkTickets(
        search.date,
        stationCode[search.from],
        stationCode[search.to]
    );
    data.data.result.forEach((row) => {
        let trainInfo = ChinaRailway.parseTrainInfo(row);
        if (!search.trains) {
            determineRemainTickets(trainInfo);
        } else {
            search.trains.forEach((train) => {
                if (
                    train.code == trainInfo.station_train_code &&
                    (train.from === undefined ||
                        train.from ==
                            stationName[trainInfo.from_station_telecode]) &&
                    (train.to === undefined ||
                        train.to == stationName[trainInfo.to_station_telecode])
                ) {
                    determineRemainTickets(
                        trainInfo,
                        train.checkRoundTrip ?? false
                    );
                }
            });
        }
    });
}

function determineRemainTickets(trainInfo, checkRoundTrip = false) {
    let trainDescription =
        trainInfo.station_train_code +
        ' ' +
        stationName[trainInfo.from_station_telecode] +
        '→' +
        stationName[trainInfo.to_station_telecode];
    let { remain, msg } = checkRemainTickets(trainInfo, checkRoundTrip);
    console.log(time(), '[Info]', trainDescription, msg);
    if (remain) {
        sendMsg(trainDescription, msg);
    }
    if (checkRoundTrip) {
        sleep(5 * 1000);
    }
}

function checkRemainTickets(trainInfo, checkRoundTrip) {
    let remainTypes = [];
    Object.keys(trainInfo.tickets).forEach((type) => {
        if (trainInfo.tickets[type] != '' && trainInfo.tickets[type] != '无') {
            remainTypes.push(type + ' ' + trainInfo.tickets[type]);
        }
    });
    if (remainTypes.length) {
        return {
            remain: true,
            msg: remainTypes.join(' / '),
        };
    }
    if (!checkRoundTrip) {
        return {
            remain: false,
            msg: '区间无票',
        };
    }
    let roundTripData = ChinaRailway.checkTickets(
        trainInfo.start_train_date,
        trainInfo.start_station_telecode,
        trainInfo.end_station_telecode
    );
    for (let row of roundTripData.data.result) {
        let roundTripInfo = ChinaRailway.parseTrainInfo(row);
        if (
            trainInfo.station_train_code == roundTripInfo.station_train_code &&
            trainInfo.start_station_telecode ==
                roundTripInfo.from_station_telecode &&
            trainInfo.end_station_telecode == roundTripInfo.to_station_telecode
        ) {
            let { remain } = checkRemainTickets(roundTripInfo, false);
            return {
                remain: false,
                msg: '区间无票，全程' + (remain ? '有票' : '无票'),
            };
        }
    }
    return {
        remain: false,
        msg: '区间无票，全程未知',
    };
}

function update() {
    console.log(time(), '[Info]', '获取余票数量…');
    try {
        config.watch.forEach((search) => {
            searchTickets(search);
            sleep(5 * 1000);
        });
    } catch (e) {
        console.error(time(), '[Error]', e);
        sendMsg('错误：' + e.message);
    }
    console.log();
}

sendMsg('已启动');
update();
setInterval(update, config.interval * 60 * 1000);
