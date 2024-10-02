# China Railway Ticket Monitor

12306 余票监控程序。

**注意**：本程序仅用来监控 12306 系统中的余票，并非用于抢票，也不会添加任何抢票相关的功能。程序作者不保证结果的准确性，**不为**任何使用本程序而产生的纠纷负责。

# 部署

## 使用可执行程序

### 1. 下载

在 [GitHub Release](https://github.com/BobLiu0518/CRTicketMonitor/releases) 页面下载本程序的二进制文件。

二进制文件使用 [Node.js SEA](https://nodejs.org/api/single-executable-applications.html) 打包，目前仅有 Windows x86_64 版本提供。

### 2. 运行

将 `config.json` 放置于可执行程序相同目录下后，直接运行即可。

## 手动部署

### 1. 安装 Node.js

前往 [Node.js 官网](https://nodejs.org/zh-cn) 下载并安装，或使用 [包管理器](https://nodejs.org/zh-cn/download/package-manager) 安装。

### 2. 下载代码

直接 [下载 Zip 文件](https://github.com/BobLiu0518/CRTicketMonitor/archive/refs/heads/main.zip)，或使用 Git：

```bash
$ git clone git@github.com:BobLiu0518/CRTicketMonitor.git
```

### 3. 安装依赖

```bash
$ npm i
```

### 4. 运行

本项目针对 `Linux` 服务器进行开发，安装 `screen` 后，运行 `./run.sh` 即可启动。

如果使用其他系统，可以在命令行中输入 `npm start` 运行。

## 配置 config.json

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

    // 推送配置（详见下文）
    "notifications": [
        {
            // 浏览器推送
            "type": "Browser",
            // 监听地址（选填）
            "host": "127.0.0.1",
            // 监听端口
            "port": 12306
        },
        {
            // Wecom 酱推送
            "type": "WecomChan",
            // 应用 ID
            "agentId": "",
            // 应用 Secret
            "secret": "",
            // 企业 ID
            "companyId": "",
            // 发送目标 Uid
            "toUid": "@all"
        },
        {
            // HTTP 推送
            "type": "HTTP",
            // 推送地址
            "url": ""
        }
    ],

    // 刷新间隔（分钟）
    "interval": 15,
    // 访问延迟（秒）
    "delay": 5
}
```

## 推送配置

在 `config.json` 中，选择以下推送配置项中的一项或多项填写。

同一种类的配置项可以设置多个。

### 浏览器通知

门槛最低的推送方式，只需保持浏览器后台运行即可。

无需额外配置，直接运行即可。如果运行时提示端口 `Permission denied`，需修改 `config.json` 中的端口号后重试。端口号可以选择 1024\~65535 之间的数。~当然，你愿意的话 0\~1023 也可以~

运行后，用浏览器打开提示的网址，允许浏览器进行通知即可。

安全起见，配置项中的监听地址 `host` 建议填写本机（即 `127.0.0.1`）。如果有其他设备连接，则需改为 `0.0.0.0`。

### Wecom 酱推送

使用 [Wecom 酱](https://github.com/easychen/wecomchan)，可以直接将通知推送至微信。

配置方法详见 [企业微信应用消息配置](https://github.com/easychen/wecomchan/blob/main/README.md#%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E5%BA%94%E7%94%A8%E6%B6%88%E6%81%AF%E9%85%8D%E7%BD%AE%E8%AF%B4%E6%98%8E)，将该文档中获取的 ①`agentid`、②`secret`、③`企业ID`三项内容分别填入 `config.json` 即可。

### HTTP 推送

可以搭配 [OneBot](https://github.com/botuniverse/onebot-11)、[Sever 酱 Turbo](https://sct.ftqq.com/)、[IFTTT](https://ifttt.com/maker_webhooks) 或其他任何可以使用 HTTP API 进行推送的平台进行推送。

直接在 `config.json` 中填写 URL 即可，消息的内容在经过 URL Encode 后会被拼接至 URL 末尾。

使用例（其中部分内容使用`××××`代替，请自行填写）：

OneBot：`http://127.0.0.1:5700/send_private_msg?user_id=××××&message=`

Server 酱 Turbo：`https://sctapi.ftqq.com/××××.send?title=CRTicketMontor通知&desp=`

### 其他

当然，你也可以自行选用其他的推送方式，编辑 `notifications.js` 即可。

## 席别设置

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
