import moment from 'moment';

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
        let response = await fetch(this.config.url + encodeURIComponent(msg));
        if (!response.ok) {
            throw new Error(
                `${this.info.name} 发送失败：HTTP ${response.status}`
            );
        }
        return true;
    }
}

export default {
    WecomChan: WecomChanNotification,
    HTTP: HTTPNotification,
};
