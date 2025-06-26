发起对话
调用此接口发起一次对话，支持添加上下文和流式响应。​
会话、对话和消息的概念说明，可参考 ​ 基础概念。​
接口说明 ​
发起对话接口用于向指定智能体发起一次对话，支持在对话时添加对话的上下文消息，以便智能体基于历史消息做出合理的回复。开发者可以按需选择响应方式，即流式或非流式响应，响应方式决定了开发者获取智能体回复的方式。关于获取智能体回复的详细说明可参考 ​ 通过对话接口获取智能体回复。​
流式响应：智能体在生成回复的同时，将回复消息以数据流的形式逐条发送给客户端。处理结束后，服务端会返回一条完整的智能体回复。详细说明可参考 ​ 流式响应。​
非流式响应：无论对话是否处理完毕，立即发送响应消息。开发者可以通过接口 ​ 查看对话详情确认本次对话处理结束后，再调用 ​ 查看对话消息详情接口查看模型回复等完整响应内容。详细说明可参考 ​ 非流式响应。​
创建会话 API 和发起对话 API 的区别如下：​
创建会话：​
主要用于初始化一个新的会话环境。​
一个会话是 Bot 和用户之间的一段问答交互，可以包含多条消息。​
创建会话时，可以选择携带初始的消息内容。​
发起对话：​
用于在已经存在的会话中发起一次对话。​
支持添加上下文和流式响应。​
可以基于历史消息进行上下文关联，提供更符合语境的回复。​
基础信息 ​
​
请求方式 ​
POST​
请求地址 ​
​
https://api.coze.cn/v3/chat​
​
权限 ​
chat​
确保调用该接口使用的个人令牌开通了 chat 权限，详细信息参考 ​ 鉴权方式概述。​
接口说明 ​
调用此接口发起一次对话，支持添加上下文和流式响应。​
​
Header​
​
参数 ​
取值 ​
说明 ​
Authorization​
Bearer $Access_Token​
用于验证客户端身份的访问令牌。你可以在扣子平台中生成访问令牌，详细信息，参考 ​ 准备工作。​
Content-Type​
application/json​
解释请求正文的方式。​
​
​
​
Query​
​
参数 ​
类型 ​
是否必选 ​
说明 ​
conversation_id​
String​
可选 ​
标识对话发生在哪一次会话中。​
会话是智能体和用户之间的一段问答交互。一个会话包含一条或多条消息。对话是会话中对智能体的一次调用，智能体会将对话中产生的消息添加到会话中。​
可以使用已创建的会话，会话中已存在的消息将作为上下文传递给模型。创建会话的方式可参考 ​ 创建会话。​
对于一问一答等不需要区分 conversation 的场合可不传该参数，系统会自动生成一个会话。 ​
一个会话中，只能有一个进行中的对话，否则调用此接口时会报错 4016。​
​
​
Body​
​
参数 ​
类型 ​
是否必选 ​
说明 ​
bot_id​
String​
必选 ​
要进行会话聊天的智能体 ID。​
进入智能体的 开发页面，开发页面 URL 中 bot 参数后的数字就是智能体 ID。例如https://www.coze.cn/space/341****/bot/73428668*****，智能体ID 为 73428668**\***。​
确保当前使用的访问密钥已被授予智能体所属空间的 chat 权限。​
​
user_id​
String​
必选 ​
标识当前与智能体对话的用户，由使用方自行定义、生成与维护。user_id 用于标识对话中的不同用户，不同的 user_id，其对话的上下文消息、数据库等对话记忆数据互相隔离。如果不需要用户数据隔离，可将此参数固定为一个任意字符串，例如 123，abc 等。​
出于数据隐私及信息安全等方面的考虑，不建议使用业务系统中定义的用户 ID。​
​
additional_messages​
​
​
Array of object​
​
可选 ​
​
对话的附加信息。你可以通过此字段传入历史消息和本次对话中用户的问题。数组长度限制为 100，即最多传入 100 条消息。​
若未设置 additional_messages，智能体收到的消息只有会话中已有的消息内容，其中最后一条作为本次对话的用户输入，其他内容均为本次对话的上下文。​
若设置了 additional_messages，智能体收到的消息包括会话中已有的消息和 additional_messages 中添加的消息，其中 additional_messages 最后一条消息会作为本次对话的用户输入，其他内容均为本次对话的上下文。​
消息结构可参考 ​EnterMessage Object，具体示例可参考 ​ 携带上下文。​
会话或 additional_messages 中最后一条消息应为 role=user 的记录，以免影响模型效果。​
如果本次对话未指定会话或指定的会话中无消息时，必须通过此参数传入智能体用户的问题。​
​
stream​
​
Boolean​
​
可选 ​
​
是否启用流式返回。​
true：采用流式响应。 “流式响应”将模型的实时响应提供给客户端，类似打字机效果。你可以实时获取服务端返回的对话、消息事件，并在客户端中同步处理、实时展示，也可以直接在 completed 事件中获取智能体最终的回复。​
false：（默认）采用非流式响应。 “非流式响应”是指响应中仅包含本次对话的状态等元数据。此时应同时开启 auto_save_history，在本次对话处理结束后再查看模型回复等完整响应内容。可以参考以下业务流程：​
调用发起对话接口，并设置 stream = false，auto_save_history=true，表示使用非流式响应，并记录历史消息。​
你需要记录会话的 Conversation ID 和 Chat ID，用于后续查看详细信息。​
定期轮询 ​ 查看对话详情接口，建议每次间隔 1 秒以上，直到会话状态流转为终态，即 status 为 completed、required_action、canceled 或 failed。​
调用 ​ 查看对话消息详情接口，查询大模型生成的最终结果。​
custom_variables​
Map<String, String>​
可选 ​
智能体提示词中定义的变量。在智能体 prompt 中设置变量 {{key}} 后，可以通过该参数传入变量值，同时支持 Jinja2 语法。详细说明可参考 ​ 变量示例。​
仅适用于智能体提示词中定义的变量，不支持用于智能体的变量，或者传入到工作流中。​
变量名只支持英文字母和下划线。​
​
auto_save_history​
​
Boolean​
​
可选 ​
是否保存本次对话记录。​
true：（默认）会话中保存本次对话记录，包括 additional_messages 中指定的所有消息、本次对话的模型回复结果、模型执行中间结果。​
false：会话中不保存本次对话记录，后续也无法通过任何方式查看本次对话信息、消息详情。在同一个会话中再次发起对话时，本次会话也不会作为上下文传递给模型。​
非流式响应下（stream=false），此参数必须设置为 true，即保存本次对话记录，否则无法查看对话状态和模型回复。​
​
meta_data​
Map​
可选 ​
附加信息，通常用于封装一些业务相关的字段。查看对话消息详情时，系统会透传此附加信息。​
自定义键值对，应指定为 Map 对象格式。长度为 16 对键值对，其中键（key）的长度范围为 1 ～ 64 个字符，值（value）的长度范围为 1 ～ 512 个字符。​
extra_params​
Map<String, String>​
可选 ​
附加参数，通常用于特殊场景下指定一些必要参数供模型判断，例如指定经纬度，并询问智能体此位置的天气。该参数不会传给工作流。​
自定义键值对格式，其中键（key）仅支持设置为：​
latitude：纬度，此时值（Value）为纬度值，例如 39.9800718。​
longitude：经度，此时值（Value）为经度值，例如 116.309314。​
shortcut_command​
Object​
可选 ​
快捷指令信息。你可以通过此参数指定此次对话执行的快捷指令，必须是智能体已绑定的快捷指令。​
消息结构可参考 ShortcutCommandDetail Object。​
调用快捷指令，会自动根据快捷指令配置信息生成本次对话中的用户问题，并放入 additional_messages 最后一条消息作为本次对话的用户输入。​
​
parameters​
Map[String, Any]​
可选 ​
给自定义参数赋值并传给对话流。你可以根据实际业务需求，在对话流开始节点的输入参数中设置自定义参数，调用本接口发起对话时，可以通过 parameters 参数传入自定义参数的值并传给对话流。具体示例代码请参见 ​ 自定义用户变量。​
仅支持为已发布 API、ChatSDK 的单 Agent（对话流模式）的智能体设置该参数。​
​
​
EnterMessage Object​
​
参数 ​
类型 ​
是否必选 ​
说明 ​
role​
String​
必选 ​
发送这条消息的实体。取值：​
user：代表该条消息内容是用户发送的。​
assistant：代表该条消息内容是智能体发送的。​
type​
​
String​
可选 ​
​
消息类型。默认为 question。​
question：用户输入内容。​
answer：智能体返回给用户的消息内容，支持增量返回。如果工作流绑定了消息节点，可能会存在多 answer 场景，此时可以用流式返回的结束标志来判断所有 answer 完成。​
function_call：智能体对话过程中调用函数（function call）的中间结果。 ​
tool_response：调用工具 （function call）后返回的结果。​
follow_up：如果在 智能体上配置打开了用户问题建议开关，则会返回推荐问题相关的回复内容。不支持在请求中作为入参。​
verbose：多 answer 场景下，服务端会返回一个 verbose 包，对应的 content 为 JSON 格式，content.msg_type =generate_answer_finish 代表全部 answer 回复完成。不支持在请求中作为入参。​
仅发起会话（v3）接口支持将此参数作为入参，且：​
如果 autoSaveHistory=true，type 支持设置为 question 或 answer。​
如果 autoSaveHistory=false，type 支持设置为 question、answer、function_call、tool_output/tool_response。​
其中，type=question 只能和 role=user 对应，即仅用户角色可以且只能发起 question 类型的消息。详细说明可参考 ​ 消息 type 说明。​
​
content​
String​
可选 ​
消息的内容，支持纯文本、多模态（文本、图片、文件混合输入）、卡片等多种类型的内容。​
content_type 为 object_string 时，content 为 object_string object 数组序列化之后的 JSON String，详细说明可参考 object_string object。​
当 content_type = text 时，content 为普通文本，例如 "content" :"Hello!"。​
content_type​
String​
可选 ​
消息内容的类型，支持设置为：​
text：文本。​
object_string：多模态内容，即文本和文件的组合、文本和图片的组合。​
card：卡片。此枚举值仅在接口响应中出现，不支持作为入参。​
content 不为空时，此参数为必选。​
​
meta_data​
Map ​
可选 ​
创建消息时的附加消息，获取消息时也会返回此附加消息。​
自定义键值对，应指定为 Map 对象格式。长度为 16 对键值对，其中键（key）的长度范围为 1 ～ 64 个字符，值（value）的长度范围为 1 ～ 512 个字符。

是否必选
说明
必选
多模态消息内容类型，支持设置为：
text：文本类型。
file：文件类型。
image：图片类型。
audio：音频类型。
可选
文本内容。
可选
文件、图片、音频内容的 ID。
必须是当前账号上传的文件 ID，上传方式可参考上传文件。
在 type 为 file、image 或 audio 时，file_id 和 file_url 应至少指定一个。

可选
文件、图片或语音文件的在线地址。必须是可公共访问的有效地址。
在 type 为 file、image 或 audio 时，file_id 和 file_url 应至少指定一个。

消息结构示例：
文本消息的 content_type 为 text，消息结构示例如下。
{
    "role": "user",
    "content": "搜几个最新的军事新闻",
    "content_type": "text"
}

流式响应
在流式响应中，服务端不会一次性发送所有数据，而是以数据流的形式逐条发送数据给客户端，数据流中包含对话过程中触发的各种事件（event），直至处理完毕或处理中断。处理结束后，服务端会通过 conversation.message.completed 事件返回拼接后完整的模型回复信息。各个事件的说明可参考流式响应事件。
流式响应允许客户端在接收到完整的数据流之前就开始处理数据，例如在对话界面实时展示智能体的回复内容，减少客户端等待模型完整回复的时间。

流式响应的整体流程如下：
######### 整体概览 （chat, MESSAGE 两级）
# chat - 开始
# chat - 处理中
#   MESSAGE - 知识库召回
#   MESSAGE - function_call
#   MESSAGE - tool_output
#   MESSAGE - answer is card
#   MESSAGE - answer is normal text
#   MESSAGE - 多 answer 的情况下，会继续有 message.delta
#   MESSAGE - verbose （多 answer、Multi-agent 跳转等场景）
#   MESSAGE - suggestion
# chat - 完成
# 流结束 event: done
#########

流式响应示例：

# chat - 开始
event: conversation.chat.created
// 在 chat 事件里，data 字段中的 id 为 Chat ID，即会话 ID。
data: {"id": "123", "conversation_id":"123", "bot_id":"222", "created_at":1710348675,compleated_at:null, "last_error": null, "meta_data": {}, "status": "created","usage":null}

# chat - 处理中
event: conversation.chat.in_progress
data: {"id": "123", "conversation_id":"123", "bot_id":"222", "created_at":1710348675, compleated_at: null, "last_error": null,"meta_data": {}, "status": "in_progress","usage":null}

# MESSAGE - 知识库召回
event: conversation.message.completed
data: {"id": "msg_001", "role":"assistant","type":"knowledge","content":"---\nrecall slice 1:xxxxxxx\n","content_type":"text","chat_id": "123", "conversation_id":"123", "bot_id":"222"}

# MESSAGE - function_call
event: conversation.message.completed
data: {"id": "msg_002", "role":"assistant","type":"function_call","content":"{\"name\":\"toutiaosousuo-search\",\"arguments\":{\"cursor\":0,\"input_query\":\"今天的体育新闻\",\"plugin_id\":7281192623887548473,\"api_id\":7288907006982012986,\"plugin_type\":1","content_type":"text","chat_id": "123", "conversation_id":"123", "bot_id":"222"}

# MESSAGE - toolOutput
event: conversation.message.completed
data: {"id": "msg_003", "role":"assistant","type":"tool_output","content":"........","content_type":"card","chat_id": "123", "conversation_id":"123", "bot_id":"222"}

# MESSAGE - answer is card
event: conversation.message.completed
data: {"id": "msg_004", "role":"assistant","type":"answer","content":"{{card_json}}","content_type":"card","chat_id": "123", "conversation_id":"123", "bot_id":"222"}

# MESSAGE - answer is normal text
event: conversation.message.delta
data:{"id": "msg_005", "role":"assistant","type":"answer","content":"以下","content_type":"text","chat_id": "123", "conversation_id":"123", "bot_id":"222"}

event: conversation.message.delta
data:{"id": "msg_005", "role":"assistant","type":"answer","content":"是","content_type":"text","chat_id": "123", "conversation_id":"123", "bot_id":"222"}

...... {{ N 个 delta 消息包}} ......

event: conversation.message.completed
data:{"id": "msg_005", "role":"assistant","type":"answer","content":"{{msg_005 完整的结果。即之前所有 msg_005 delta 内容拼接的结果}}","content_type":"text","chat_id": "123", "conversation_id":"123", "bot_id":"222"}


# MESSAGE - 多 answer 的情况,会继续有 message.delta
event: conversation.message.delta
data:{"id": "msg_006", "role":"assistant","type":"answer","content":"你好你好","content_type":"text","chat_id": "123", "conversation_id":"123", "bot_id":"222"}

...... {{ N 个 delta 消息包}} ......

event: conversation.message.completed
data:{"id": "msg_006", "role":"assistant","type":"answer","content":"{{msg_006 完整的结果。即之前所有 msg_006 delta 内容拼接的结果}}","content_type":"text","chat_id": "123", "conversation_id":"123", "bot_id":"222"}

# MESSAGE - Verbose （流式 plugin, 多 answer 结束，Multi-agent 跳转等场景）
event: conversation.message.completed
data:{"id": "msg_007", "role":"assistant","type":"verbose","content":"{\"msg_type\":\"generate_answer_finish\",\"data\":\"\"}","content_type":"text","chat_id": "123", "conversation_id":"123", "bot_id":"222"}

# MESSAGE - suggestion
event: conversation.message.completed
data: {"id": "msg_008", "role":"assistant","type":"follow_up","content":"朗尼克的报价是否会成功？","content_type":"text","chat_id": "123", "conversation_id":"123", "bot_id":"222"}
event: conversation.message.completed
data: {"id": "msg_009", "role":"assistant","type":"follow_up","content":"中国足球能否出现？","content_type":"text","chat_id": "123", "conversation_id":"123", "bot_id":"222"}
event: conversation.message.completed
data: {"id": "msg_010", "role":"assistant","type":"follow_up","content":"羽毛球种子选手都有谁？","content_type":"text","chat_id": "123", "conversation_id":"123", "bot_id":"222"}

# chat - 完成
event: conversation.chat.completed （chat完成）
data: {"id": "123", "chat_id": "123", "conversation_id":"123", "bot_id":"222", "created_at":1710348675, compleated_at:1710348675, "last_error":null, "meta_data": {}, "status": "compleated", "usage":{"token_count":3397,"output_tokens":1173,"input_tokens":2224}}

event: done （stream流结束）
data: [DONE]

# chat - 失败
event: conversation.chat.failed
data: {
    "code":701231,
    "msg":"error"
}

返回的事件消息体结构如下：
参数
类型
说明
event
String
当前流式返回的数据包事件。详细说明可参考 流式响应事件。
data
Object
消息内容。其中，chat 事件和 message 事件的格式不同。
chat 事件中，data 为 Chat Object。
message、audio 事件中，data 为 Message Object。


事件（event）名称
说明
conversation.chat.created
创建对话的事件，表示对话开始。
conversation.chat.in_progress
服务端正在处理对话。
conversation.message.delta
增量消息，通常是 type=answer 时的增量消息。
conversation.audio.delta
增量语音消息，通常是 type=answer 时的增量消息。只有输入中包含语音消息时，才会返回 audio.delta。
conversation.message.completed
message 已回复完成。此时流式包中带有所有 message.delta 的拼接结果，且每个消息均为 completed 状态。
conversation.chat.completed
对话完成。工具类型
conversation.chat.failed
此事件用于标识对话失败。
conversation.chat.requires_action
对话中断，需要使用方上报工具的执行结果。
error
流式响应过程中的错误事件。关于 code 和 msg 的详细说明，可参考错误码。
done
本次会话的流式返回正常结束。


##流式响应示例

### Request:

curl --location --request POST 'https://api.coze.cn/v3/chat?conversation_id=7374752000116113452' \
--header 'Authorization: Bearer pat_OYDacMzM3WyOWV3Dtj2bHRMymzxP****' \
--header 'Content-Type: application/json' \
--data-raw '{
    "bot_id": "734829333445931****",
    "user_id": "123456789",
    "stream": true,
    "auto_save_history":true,
    "additional_messages": [
    {
      "role": "user",
      "type": "question",
      "content_type": "text",
      "content": "我昨晚开始打喷嚏，流鼻涕，体温37.5度，请看下我是不是感冒了"
    },
    {
      "role": "assistant",
      "type": "answer",
      "content_type": "text",
      "content": "根据你提供的症状描述，是的，你很可能感冒了，但症状并不严重，建议适当吃药就可以痊愈。"
    },
    {
      "role": "user",
      "type": "question",
      "content_type": "text",
      "content": "我应该吃哪些药呢"
    }
  ]
}'

### Response // 在 chat 事件里，data 字段中的 id 为 Chat ID，即会话ID。
{
event:conversation.chat.created,
data:{"id":"7382159487131697202","conversation_id":"7381473525342978089","bot_id":"7379462189365198898",
"completed_at":1718792949,
"last_error":{"code":0,"msg":""},
"status":"created",
"usage":{"token_count":0,"output_count":0,"input_count":0}
}
}

{
event:conversation.chat.in_progress,
data:{"id":"7382159487131697202","conversation_id":"7381473525342978089","bot_id":"7379462189365198898","completed_at":1718792949,"last_error":{"code":0,"msg":""},"status":"in_progress","usage":{"token_count":0,"output_count":0,"input_count":0}
}
}
{
event:conversation.message.delta,
data:{"id":"7382159494123470858","conversation_id":"7381473525342978089","bot_id":"7379462189365198898","role":"assistant","type":"answer","content" : "从你的症状来看","content_type":"text","chat_id":"7382159487131697202"}
}
{
event:conversation.message.delta,
data:{"id":"7382159494123470858","conversation_id":"7381473525342978089","bot_id":"7379462189365198898","role":"assistant","type":"answer","content":"，基本可以诊断为普通感冒。普通感冒通常是由病毒感染引起，起病较急，早期","content_type":"text","chat_id":"7382159487131697202"}
}
//省略模型回复的部分中间事件event:conversation.message.delta
......
{
event:conversation.message.delta,
data:{"id":"7382159494123470858","conversation_id":"7381473525342978089","bot_id":"7379462189365198898","role":"assistant","type":"answer","content":"更严重的疾病。","content_type":"text","chat_id":"7382159487131697202"}
}
{
event:conversation.message.delta,
data:{"id":"7382159494123470858","conversation_id":"7381473525342978089","bot_id":"7379462189365198898","role":"assistant","type":"answer","content":"一般普通感冒在一周左右可自行痊愈。","content_type":"text","chat_id":"7382159487131697202"}
}
{
event:conversation.message.completed,
data:{"id":"7382159494123470858","conversation_id":"7381473525342978089","bot_id":"7379462189365198898","role":"assistant","type":"answer","content":"从你描述的昨晚开始打喷嚏、流鼻涕，体温 37.5℃来看，基本可以诊断为普通感冒。普通感冒通常是由病毒感染引起，起病较急，早期症状就包括打喷嚏、流清水样鼻涕，还可能伴有低热等。\n\n治疗方案和建议如下：\n- **药物治疗**：可以服用一些缓解症状的感冒药，如复方氨酚烷胺胶囊等，能减轻打喷嚏、流鼻涕症状，也有助于缓解低热。若体温持续上升超过 38.5℃，可服用布洛芬等退烧药。\n- **生活护理**：保证充足的休息，让身体有足够的能量对抗病毒。多喝温开水，每天至少 1500 - 2000 毫升，促进新陈代谢，也有助于缓解喉咙不适和稀释痰液。饮食上选择清淡、易消化的食物，比如小米粥、软面条等，避免吃辛辣、油腻、刺激性食物。\n- **病情监测**：密切关注体温变化以及症状是否加重，若出现高热不退、咳嗽加重、呼吸困难等情况，要及时就医，排查是否合并有细菌感染或其他更严重的疾病。一般普通感冒在一周左右可自行痊愈。","content_type":"text","chat_id":"7382159487131697202"}
}
{
event:conversation.message.completed,
data:{"id":"7382159494123552778","conversation_id":"7381473525342978089","bot_id":"7379462189365198898","role":"assistant","type":"verbose","content":"{\"msg_type\":\"generate_answer_finish\",\"data\":\"\",\"from_module\":null,\"from_unit\":null}","content_type":"text","chat_id":"7382159487131697202"}
}
{
event:conversation.chat.completed,
data:{
  "id":"7382159487131697202","conversation_id":"7381473525342978089","bot_id":"7379462189365198898","completed_at":1718792949,"last_error":{"code":0,"msg":""},"status":"completed","usage":{"token_count":876,"output_count":253,"input_count":623}
  }
}
{
event:done,
data:"[DONE]"
}


