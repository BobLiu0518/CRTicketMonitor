import fs from 'fs';
import open from 'open';
import moment from 'moment';
import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { log, time } from './utils.js';

class NotificationBase {
    static info = {
        name: 'CRTM Notification',
        description: '',
    };

    constructor(config, info) {
        this.info = info;
        this.config = config;
    }

    async send(msg) {
        console.log(msg);
    }
}

class WecomChanNotification extends NotificationBase {
    accessToken = {
        token: null,
        expire: null,
    };

    constructor(config) {
        super(config, {
            name: 'Wecom 酱推送',
            description: `${config.companyId}-${config.agentId}`,
        });
        if (
            !config.agentId ||
            !config.secret ||
            !config.companyId ||
            !config.toUid
        ) {
            throw new Error(`${this.info.name} 配置不完整`);
        }
        this.getToken();
    }

    getTimestamp() {
        return parseInt(moment().format('X'));
    }

    async getToken() {
        const getTokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.config.companyId}&corpsecret=${this.config.secret}`;
        const getTokenRes = await fetch(getTokenUrl);
        const accessToken = await getTokenRes.json();
        if (accessToken.access_token?.length <= 0) {
            throw new Error(`${this.info.name} 获取 accessToken 失败`);
        }
        this.accessToken.token = accessToken.access_token;
        this.accessToken.expire =
            this.getTimestamp() + accessToken.expires_in - 60;
    }

    async send(msg) {
        msg = msg.title + '\n' + msg.time + '\n' + msg.content;

        if (
            !this.accessToken.token ||
            this.getTimestamp() > this.accessToken.expire
        ) {
            await this.getToken();
        }
        const sendMsgUrl = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${this.accessToken.token}`;
        const sendMsgRes = await fetch(sendMsgUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                touser: this.config.toUid,
                agentid: this.config.agentId,
                msgtype: 'text',
                text: { content: msg },
                duplicate_check_interval: 600,
            }),
        });
        if (!sendMsgRes.ok) {
            throw new Error(
                `${this.info.name} 发送失败：HTTP ${response.status}`
            );
        }
        let data = await sendMsgRes.json();
        if (data.errmsg != 'ok') {
            throw new Error(
                `${this.info.name} 发送失败：[${data.errcode}] ${data.errmsg}`
            );
        }
        return true;
    }
}

class HTTPNotification extends NotificationBase {
    constructor(config) {
        super(config, {
            name: 'HTTP 推送',
            description: config.url.match(/^https?:\/\/(.+?)\/.*$/)[1],
        });
        if (!config.url) {
            throw new Error(`${this.info.name} 配置不完整`);
        }
    }

    async send(msg) {
        msg = msg.title + '\n' + msg.time + '\n' + msg.content;
        let response = await fetch(this.config.url + encodeURIComponent(msg));
        if (!response.ok) {
            throw new Error(
                `${this.info.name} 发送失败：HTTP ${response.status}`
            );
        }
        return true;
    }
}

class BrowserNotification extends NotificationBase {
    wsServer = null;
    httpServer = null;
    history = [];

    constructor(config) {
        super(config, {
            name: '浏览器推送',
            description: `127.0.0.1:${config.port}`,
        });
        if (!config.port) {
            throw new Error(`${this.info.name} 配置不完整`);
        }
        if (!config.host) {
            config.host = '127.0.0.1';
        }

        this.httpServer = createServer((req, res) => {
            if (req.url.match(/^\/(\?port=\d+)?$/)) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(fs.readFileSync('browser/index.html'));
            } else if (req.url == '/cr.svg') {
                res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
                res.end(fs.readFileSync('browser/cr.svg'));
            } else {
                res.writeHead(404).end('404 Not Found');
            }
        });
        this.httpServer.on('error', (err) => {
            log.error('HTTP 服务器错误：', err);
        });

        this.wsServer = new WebSocketServer({ server: this.httpServer });
        this.wsServer.on('connection', (ws) => {
            log.info(`${this.info.name} (${this.info.description}) 成功连接`);
            ws.on('error', (e) => {
                log.error(`${this.info.name} WebSocket 错误：${e}`);
            });
            ws.on('close', () => {
                log[this.wsServer.clients.size ? 'info' : 'warn'](
                    `${this.info.name} (${this.info.description}) 连接已断开`
                );
            });
            ws.send(
                JSON.stringify({
                    type: 'history',
                    content: this.history,
                })
            );
            ws.send(
                JSON.stringify({
                    type: 'notice',
                    content: {
                        title: '[CRTicketMonitor]',
                        time: time(),
                        content: '浏览器推送连接成功',
                    },
                })
            );
        });
        this.wsServer.on('error', (err) => {
            log.error('WebSocket 服务器错误：', err);
        });

        this.httpServer.listen(config.port, config.host);

        setTimeout(() => {
            let url = `http://127.0.0.1:${config.port}/`;
            log.info(`${this.info.name}：请用浏览器打开 ${url}`);
            open(url);
        }, 500);
    }

    async send(msg) {
        for (let ws of this.wsServer.clients) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                    JSON.stringify({
                        type: 'notice',
                        content: msg,
                    })
                );
            }
        }
        this.history.push(msg);
    }
}

export default {
    WecomChan: WecomChanNotification,
    HTTP: HTTPNotification,
    Browser: BrowserNotification,
};
