# China Railway Ticket Monitor

12306 余票监控程序

## 使用方法

### 安装 Node.js

前往 [Node.js 官网](https://nodejs.org/zh-cn) 安装

### 安装依赖

```bash
$ npm i
```

### 配置推送

在 `config.json` 中，为以下推送方式（任选其一即可）填写配置项。不需要使用的推送方式建议直接删除其配置项。

#### Wecom 酱推送

使用 [Wecom 酱](https://github.com/easychen/wecomchan)，可以直接将通知推送至微信。

配置方法详见 [企业微信应用消息配置](https://github.com/easychen/wecomchan/blob/main/README.md#%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E5%BA%94%E7%94%A8%E6%B6%88%E6%81%AF%E9%85%8D%E7%BD%AE%E8%AF%B4%E6%98%8E)，将该文档中获取的 ①`agentid`、②`secret`、③`企业ID`三项内容分别填入 `config.json` 即可。

#### HTTP 推送

可以搭配 [OneBot](https://github.com/botuniverse/onebot-11)、[Sever 酱 Turbo](https://sct.ftqq.com/)、[IFTTT](https://ifttt.com/maker_webhooks) 或其他任何可以使用 HTTP API 进行推送的平台进行推送。

直接在 `config.json` 中填写 URL 即可，消息的内容在经过 URL Encode 后会被拼接至 URL 末尾。

支持填写一个（单个字符串）或多个（包含多个字符串的数组）URL。

#### 浏览器通知

门槛最低的一种推送方式，只需要保持浏览器后台运行即可。

最大的问题在于这个功能<s>我还没做</s>。

#### 其他

当然，你也可以自行选用其他的推送方式，编辑 `index.js` 中的 `sendMsg` 函数即可。

### 配置 config.json

在配置前，先将仓库中的 `config.example.json` 重命名为 `config.json`，然后进行修改。

需要注意，`JSON`文件不允许出现注释，如果使用下面的模板，请删除所有 `//` 开头的内容。

```json
{
    // 查询列表
    "watch": [
        // 可添加多个查询
        {
            // 基础信息
            "from": "上海", // 起点站（包含同城站）
            "to": "北京", // 终点站（包含同城站）
            "date": "20241001", // 日期（YYYYMMDD）

            // 车次列表（选填），不填时默认为全部车次
            "trains": [
                {
                    "code": "G2", // 车次号
                    "from": "上海", // 指定起点站（选填）
                    "to": "北京南", // 指定终点站（选填）
                    "seatCategory": ["二等座"], // 限定席别（选填，详见下文）
                    "checkRoundTrip": true // 查询全程车票情况（选填）
                }
            ]
        }
    ],

    "notification": {
        // Wecom 酱配置
        "wecomChan": {
            // 应用 ID
            "agentId": "",
            // 应用 Secret
            "secret": "",
            // 企业 ID
            "companyId": "",
            // 发送目标 Uid
            "toUid": "@all"
        },
        // HTTP 配置
        "http": {
            // 推送地址，可以是一个或多个
            "url": ""
        }
    },

    // 刷新间隔（分钟）
    "interval": 15,
    // 访问延迟（秒）
    "delay": 5
}
```

### 席别设置

可选的席别如下：

-   卧铺：
    -   `高级软卧`
    -   `软卧`（含动卧一等卧）
    -   `硬卧`（含二等卧）
-   坐票：
    -   `商务座`
    -   `特等座`
    -   `优选一等座`
    -   `一等座`
    -   `二等座`
    -   `软座`
    -   `硬座`
    -   `无座`
-   其他：
    -   `其他`（含包厢硬卧等）
    -   `YB`（未知类型）
    -   `SRRB`（未知类型）

### 运行

本项目针对 `Linux` 服务器进行开发，安装 `screen` 后，运行 `./run.sh` 即可启动。

如果使用其他系统，可以在命令行中输入 `npm start` 运行。
