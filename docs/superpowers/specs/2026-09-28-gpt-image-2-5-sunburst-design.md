# gpt-image-2.5-sunburst 接入设计

## 目标

新增 `gpt-image-2.5-sunburst` 图像模型，使其生成、编辑、尺寸、参考图、输出格式、审核和计费行为与现有 `gpt-image-2` 一致，并提供三条可切换线路和线路相关质量档位。

## 范围

- 现代 React 界面和经典版界面都展示新模型、三条线路、三档尺寸和质量选择。
- `/api/generate` 与 `/api/edit` 都识别新模型，并透传 `quality`。
- 静态图片模型/线路配置新增模型和三条线路；MySQL 模式通过现有静态种子机制补充新 ID，不覆盖服务器已有配置。
- 现有 `gpt-image-2` 行为保持不变。

## 配置

模型 ID、请求模型和模型族均为 `gpt-image-2.5-sunburst`，尺寸为 `1k`、`2k`、`4k`，默认 `2k`，支持自定义比例。

新增线路：

| 线路 | 上游 | 模式 | Key 环境变量 | 1K | 2K | 4K | 质量 |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| line1 | `https://vip.aittco.com` | OpenAI 异步 | `IMAGE_ROUTE_VIP_KEYS` | 2.5 | 3 | 3.5 | auto / low / medium / high |
| line2 | `https://rolldek.com` | OpenAI 同步后台任务 | `IMAGE_ROLL_IMAGE2.5_BIG` | 3.5 | 4 | 4.5 | auto / low / medium / high / xhigh / max |
| line3 | `https://rolldek.com` | OpenAI 同步后台任务 | `IMAGE_ROLL_IMAGE2.5_MAX` | 5 | 5.5 | 6 | auto / low / medium / high / xhigh / max |

线路一使用现有异步路径 `/v1/images/generations?async=true`、任务路径 `/v1/images/tasks/{taskId}` 和编辑路径 `/v1/images/edits?async=true`。线路二和线路三使用同步路径 `/v1/images/generations` 与 `/v1/images/edits`，并复用现有同步线路后台任务机制。

## 数据流

1. 前端根据模型族读取三条线路，并按当前尺寸计算单张点数。
2. 前端发送现有 GPT 图片字段，额外质量档位只改变 `quality` 字段的值。
3. 服务端根据 `routeId` 解析线路和环境变量 Key；根据尺寸覆盖选择上游模型和点数。
4. 服务端把生成请求转发为 JSON，把编辑请求转发为 multipart；成功结果沿用现有 URL/base64 解析、存储、轮询和扣费流程。

## 质量选择

质量档位作为 GPT 图片质量类型扩展为 `auto | low | medium | high | xhigh | max`。现代界面只在 sunburst 的 line2/line3 显示后两项；经典版在切换线路时同步更新质量菜单。若切回 line1 且当前值为 `xhigh` 或 `max`，自动降级为 `auto`。

## 错误处理

- 未知质量值由前端回退到 `auto`；服务端保持现有透传行为，避免破坏上游兼容性。
- 无效线路、无 Key、余额不足、上游错误和任务超时继续使用现有错误与退款流程。
- 新线路不得允许用户传入的旧 API Key 覆盖服务器环境变量 Key。

## 验证

- 配置测试验证模型、三条线路、环境变量名、三档价格和质量档位。
- 前端配置测试验证 line1 与 line2/line3 的质量选项，以及切线时的质量回退。
- 运行 Vitest、TypeScript/生产构建，并用本地请求拦截验证生成和编辑请求均带有 sunburst 模型与质量字段。
