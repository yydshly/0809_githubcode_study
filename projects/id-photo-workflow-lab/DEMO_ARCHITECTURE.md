# Demo 架构与运行边界

## 组件

```text
web/index.html + app.js
        │
        ▼
127.0.0.1:4191 Node adapter
        │  allowlist + size + timeout
        ▼
127.0.0.1:8080 本地原创 Hivision bridge
        │
        ▼
ignored fixed Hivision clone / MODNet / OpenCV
```

## 为什么使用适配层

- 浏览器只访问同源本地服务；
- 隐藏 Hivision 的原始部署细节；
- 只开放三个必要路由；
- 统一连接、超时、上游拒绝和未知错误；
- 将来可替换上游而不重写前端状态机。

## 两种模式

### 真实模式

`npm.cmd start` 同时启动 bridge 和 Node Demo。所有图片结果必须来自固定 Hivision library；runtime 未就绪时启动失败，不提供假成功。

### 交互夹具模式

`npm.cmd run start:fixture`。Node 在内存中生成项目原创几何 PNG，用于验证上传、状态、底色、排版、下载和响应式 UI。页面显著显示“未运行模型”，夹具不能进入质量结论。

## 安全与数据

- 两个服务都强制监听 loopback；不运行上游默认 `0.0.0.0` 示例服务；
- Node adapter 不写文件、不记录图片/base64；
- 请求超过 12 MiB 立即拒绝；
- 非 multipart、未知路由和未知方法立即拒绝；
- 上游健康检查 3 秒超时，推理请求 120 秒超时；
- Face++ 只有显式配置两项凭据后才开放，并在 UI 说明图片会远程发送；
- Demo 不提供公网部署配置。

## 状态机

```text
checking
→ disconnected | fixture-ready | real-cpu-ready | edge-cloud-configured
→ source-ready
→ running-idphoto
→ transparent-ready
→ background-ready (optional)
→ layout-ready (optional)
→ error (recoverable)
```

切换输入会撤销旧结果和下载链接。运行期间禁用会改变请求身份的控件。
