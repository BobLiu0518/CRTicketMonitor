import { log, time, asset } from './utils.ts';
import type {
    Message,
    NotificationInfo,
    WecomChanNotificationConfig,
    HTTPNotificationConfig,
    BrowserNotificationConfig,
    WecomAccessToken,
    WebSocketMessage,
} from './types.ts';

export class NotificationBase {
    static info: NotificationInfo = {
        name: 'CRTM Notification',
        description: '',
    };

    info: NotificationInfo;
    config: unknown;

    constructor(config: unknown, info: NotificationInfo) {
        this.info = info;
        this.config = config;
    }

    send(msg: Message): Promise<boolean> {
        console.log(msg);
        return Promise.resolve(true);
    }

    die(): void {}
}

class WecomChanNotification extends NotificationBase {
    accessToken: WecomAccessToken = {
        token: null,
        expire: null,
    };

    override config: WecomChanNotificationConfig;

    constructor(config: WecomChanNotificationConfig) {
        super(config, {
            name: 'Wecom 酱推送',
            description: `${config.companyId}-${config.agentId}`,
        });
        this.config = config;
        if (!config.agentId || !config.secret || !config.companyId || !config.toUid) {
            throw new Error(`${this.info.name} 配置不完整`);
        }
        this.getToken();
    }

    getTimestamp(): number {
        return Math.floor(Date.now() / 1000);
    }

    async getToken(): Promise<void> {
        const getTokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.config.companyId}&corpsecret=${this.config.secret}`;
        const getTokenRes = await fetch(getTokenUrl);
        const accessToken = await getTokenRes.json();
        if (accessToken.access_token?.length <= 0) {
            throw new Error(`${this.info.name} 获取 accessToken 失败`);
        }
        this.accessToken.token = accessToken.access_token;
        this.accessToken.expire = this.getTimestamp() + accessToken.expires_in - 60;
    }

    override async send(msg: Message): Promise<boolean> {
        const msgText = msg.title + '\n' + msg.time + '\n' + msg.content;

        if (!this.accessToken.token || (this.accessToken.expire && this.getTimestamp() > this.accessToken.expire)) {
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
                text: { content: msgText },
                duplicate_check_interval: 600,
            }),
        });
        if (!sendMsgRes.ok) {
            throw new Error(`${this.info.name} 发送失败：HTTP ${sendMsgRes.status}`);
        }
        const data = await sendMsgRes.json();
        if (data.errmsg != 'ok') {
            throw new Error(`${this.info.name} 发送失败：[${data.errcode}] ${data.errmsg}`);
        }
        return true;
    }
}

class HTTPNotification extends NotificationBase {
    override config: HTTPNotificationConfig;

    constructor(config: HTTPNotificationConfig) {
        super(config, {
            name: 'HTTP 推送',
            description: config.url.match(/^https?:\/\/(.+?)\/.*$/)?.[1] ?? 'Unknown',
        });
        this.config = config;
        if (!config.url) {
            throw new Error(`${this.info.name} 配置不完整`);
        }
    }

    override async send(msg: Message): Promise<boolean> {
        const msgText = msg.title + '\n' + msg.time + '\n' + msg.content;
        const response = await fetch(this.config.url + encodeURIComponent(msgText));
        if (!response.ok) {
            throw new Error(`${this.info.name} 发送失败：HTTP ${response.status}`);
        }
        return true;
    }
}

class BrowserNotification extends NotificationBase {
    wsServer: Deno.HttpServer<Deno.NetAddr> | null = null;
    httpServer: Deno.HttpServer<Deno.NetAddr> | null = null;
    history: Message[] = [];
    sockets: Set<WebSocket> = new Set();
    override config: BrowserNotificationConfig;

    constructor(config: BrowserNotificationConfig) {
        super(config, {
            name: '浏览器推送',
            description: `127.0.0.1:${config.port}`,
        });
        this.config = config;
        if (!config.port) {
            throw new Error(`${this.info.name} 配置不完整`);
        }
        if (!config.host) {
            config.host = '127.0.0.1';
        }

        this.httpServer = Deno.serve(
            {
                port: config.port,
                hostname: config.host,
                onListen: async ({ port, hostname }) => {
                    const url = `http://${hostname}:${port}/`;
                    try {
                        const { default: open } = await import('open');
                        open(url);
                        log.info(`${this.info.name}：已尝试自动打开 ${url}`);
                    } catch (_err) {
                        log.info(`${this.info.name}：请用浏览器打开 ${url}`);
                    }
                },
            },
            async (req) => {
                const url = new URL(req.url);

                if (req.headers.get('upgrade') === 'websocket') {
                    const { socket, response } = Deno.upgradeWebSocket(req);

                    socket.onopen = () => {
                        log.info(`${this.info.name} (${this.info.description}) 成功连接`);
                        socket.send(
                            JSON.stringify({
                                type: 'history',
                                content: this.history,
                            } as WebSocketMessage)
                        );
                        socket.send(
                            JSON.stringify({
                                type: 'notice',
                                content: {
                                    title: '[CRTicketMonitor]',
                                    time: time(),
                                    content: '浏览器推送连接成功',
                                },
                            } as WebSocketMessage)
                        );
                    };

                    socket.onerror = (e) => {
                        log.error(`${this.info.name} WebSocket 错误：${e}`);
                    };

                    socket.onclose = () => {
                        log.info(`${this.info.name} (${this.info.description}) 连接已断开`);
                    };

                    if (!this.sockets) this.sockets = new Set();
                    this.sockets.add(socket);

                    socket.onclose = () => {
                        this.sockets.delete(socket);
                    };

                    return response;
                }

                if (url.pathname.match(/^\/(\?port=\d+)?$/)) {
                    return new Response(await asset('browser/index.html'), {
                        headers: { 'Content-Type': 'text/html' },
                    });
                } else if (url.pathname === '/cr.svg') {
                    return new Response(await asset('browser/cr.svg'), {
                        headers: { 'Content-Type': 'image/svg+xml' },
                    });
                } else {
                    return new Response('404 Not Found', { status: 404 });
                }
            }
        );

        this.sockets = new Set();
    }

    override send(msg: Message): Promise<boolean> {
        for (const socket of this.sockets ?? []) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(
                    JSON.stringify({
                        type: 'notice',
                        content: msg,
                    } as WebSocketMessage)
                );
            }
        }
        this.history.push(msg);
        return Promise.resolve(true);
    }

    override die(): void {
        for (const socket of this.sockets ?? []) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(
                    JSON.stringify({
                        type: 'die',
                    } as WebSocketMessage)
                );
                socket.close();
            }
        }
        if (this.httpServer) {
            this.httpServer.shutdown();
        }
    }
}

export default {
    WecomChan: WecomChanNotification,
    HTTP: HTTPNotification,
    Browser: BrowserNotification,
};
