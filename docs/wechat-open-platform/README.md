# LightFlux 微信开放平台申请清单

更新时间：2026-08-09

LightFlux 同时支持 Web 和 iOS/Android，因此建议申请两个应用：

1. 一个“网站应用”，用于 Web 微信扫码登录。
2. 一个“移动应用”，用于 iOS 和 Android 原生微信登录。同一个 App 的
   iOS、Android 版本应共用一个移动应用 AppID。

如果近期只准备发布 Web，可以先申请网站应用，移动应用后续再补。

## 1. 申请前准备

先注册并登录 [微信开放平台](https://open.weixin.qq.com/)，在“账号中心”
完成开发者资质认证。创建应用前建议准备：

- LightFlux 的正式中英文名称、简介和清晰图标。
- 一个可公开访问的 HTTPS 官网，页面应包含应用名称、功能介绍、真实界面
  截图、联系方式、版权所有者、隐私政策和用户协议。
- 如果网站需要备案，准备与开放平台认证主体一致的备案和主体信息。
- 3-5 张包含手机状态栏的 App 运行截图或完整交互流程图。
- 应用类目及相关资质。类目必须与实际 Todo/效率工具功能一致。
- 一个已部署的 HTTPS 认证 API 域名，例如 `auth.example.com`。

官网、应用名称、图标、主体和流程截图应保持一致。不要在正式应用名称中加入
“测试”“Demo”“微信”等字样。

## 2. 申请网站应用

1. 打开微信开放平台，进入“管理中心 -> 网站应用”。
2. 选择“创建网站应用”。
3. 填写网站名称、简介、图标、官网地址和主体信息。
4. 按平台要求填写授权回调域。这里填写正式认证 API 所在域名，不要填写
   `localhost`。
5. 提交审核。审核通过后记录网站应用的 AppID，并在后台生成或查看
   AppSecret。
6. 确认网站应用已经获得微信登录能力，登录 scope 为 `snsapi_login`。

LightFlux 服务端使用的完整回调地址应类似：

```text
https://auth.example.com/api/auth/wechat/web/callback
```

该地址的域名必须与开放平台审核和配置的授权回调域一致。

## 3. 申请移动应用

1. 进入“管理中心 -> 移动应用 -> 创建移动应用”。
2. 填写应用名称、简介、官网、图标、类目、上架状态和运行流程图。
3. 至少填写一个平台的开发信息；计划双端发布时一次填写 iOS 和 Android。
4. 提交审核。官方操作指南给出的通常审核时间为 1-7 个工作日，复杂应用可能
   更久。
5. 应用审核通过后，再申请并确认“微信登录”能力已经审核通过。

应用尚未上架也可以提审，但官方当前对“已认证主体的未上架应用”限制微信登录
用户次数为 100 次/天。正式发布后应补充各端应用商店地址并重新提交审核。

### iOS 开发信息

申请前先确定，后续不要随意修改：

- 正式 Bundle ID，例如 `com.example.lightflux`。
- 测试版 Bundle ID，如无独立测试包可暂不填写。
- Universal Link，例如 `https://app.example.com/lightflux/`。

Universal Link 必须使用 HTTPS。Apple 的 `apple-app-site-association` 配置应
覆盖带通配符的路径，例如 `/lightflux/*`，并在 iOS Associated Domains 中加入：

```text
applinks:app.example.com
```

### Android 开发信息

申请前先确定：

- Android package，例如 `com.example.lightflux`。
- 正式发布签名对应的应用签名值。

应用提交开放平台审核、生成安装包和发布应用商店时必须使用一致的 package 和
发布签名。不要用临时 debug keystore 的签名提交正式配置。

## 4. 审核通过后的本地配置

不要把任何 AppSecret 提交到 Git，也不要通过聊天发送 AppSecret。直接写入本地
`server/.env`：

```bash
PUBLIC_BASE_URL=https://auth.example.com
APP_WEB_URL=https://app.example.com
CORS_ORIGIN=https://app.example.com
SESSION_SECRET=<至少 32 位随机字符串>

WECHAT_WEB_APP_ID=<网站应用 AppID>
WECHAT_WEB_APP_SECRET=<网站应用 AppSecret>
WECHAT_WEB_REDIRECT_URI=https://auth.example.com/api/auth/wechat/web/callback

WECHAT_MOBILE_APP_ID=<移动应用 AppID>
WECHAT_MOBILE_APP_SECRET=<移动应用 AppSecret>
```

客户端 `lightflux/.env`：

```bash
EXPO_PUBLIC_AUTH_API_URL=https://auth.example.com
```

移动端还需要在 `lightflux/app.json` 中补齐：

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.example.lightflux",
      "associatedDomains": ["applinks:app.example.com"]
    },
    "android": {
      "package": "com.example.lightflux"
    }
  }
}
```

## 5. 审核完成后需要确认的信息

完成申请后，只需要确认以下非敏感信息：

- 网站应用 AppID。
- 网站授权回调域。
- 移动应用 AppID。
- Android package 和发布签名是否已登记。
- iOS Bundle ID 和 Universal Link。
- Web 前端域名与认证 API 域名。

AppSecret 只需确认已经写入本地 `server/.env`，不要发送具体值。

收到这些信息后，项目还需要接入 iOS/Android 微信 OpenSDK、Expo development
build 和移动端 token 安全存储。原生微信 SDK 无法在 Expo Go 中完成真机验证。

## 6. 官方资料

- [微信开放平台](https://open.weixin.qq.com/)
- [网站应用开发](https://open.weixin.qq.com/frame?lang=zh_CN&t=home/web_tmpl)
- [网站应用微信登录开发指南](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login)
- [移动应用创建操作指南](https://developers.weixin.qq.com/doc/oplatform/Mobile_App/guideline/create.html)
- [移动应用审核规范](https://developers.weixin.qq.com/doc/oplatform/Mobile_App/operation.html)
- [移动应用微信登录开发指南](https://developers.weixin.qq.com/doc/oplatform/Mobile_App/WeChat_Login/Development_Guide.html)
- [iOS 接入指南](https://developers.weixin.qq.com/doc/oplatform/Mobile_App/Access_Guide/iOS.html)
- [Android 接入指南](https://developers.weixin.qq.com/doc/oplatform/Mobile_App/Access_Guide/Android.html)
