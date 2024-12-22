// スクリプトプロパティの定数
const SCRIPT_PROPERTIES = {
  SLACK_BOT_TOKEN: 'SLACK_BOT_TOKEN'
};

// Slack API関連の定数
const SLACK_API = {
  BASE_URL: 'https://slack.com/api/',
  METHODS: {
    VIEWS_OPEN: 'views.open',
    CHAT_POST_MESSAGE: 'chat.postMessage',
    CONVERSATIONS_OPEN: 'conversations.open'
  }
};

// スクリプトプロパティにSlackトークンを設定しているものとする
function getSlackBotToken() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty(SCRIPT_PROPERTIES.SLACK_BOT_TOKEN);
  if (!token) {
    throw new Error('Slack BOTトークンが設定されていません');
  }
  return token;
}

// Slack APIコール用共通関数
function callSlackApi(method, payload) {
  try {
    const url = SLACK_API.BASE_URL + method;
    const options = {
      method: 'post',
      headers: {
        Authorization: 'Bearer ' + getSlackBotToken(),
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    
    if (!result.ok) {
      console.error(`Slack API エラー: ${method} - ${result.error}`);
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error(`API呼び出しエラー: ${method}`, error);
    throw error;
  }
}

// 先頭に追加
const CONFIG = {
  CHANNELS: {
    THANKS_BOARD: '#thanks-board'
  },
  MESSAGE_TYPES: {
    SLASH_COMMAND: 'slash_command',
    INTERACTIVE: 'interactive'
  },
  VISIBILITY: {
    PUBLIC: 'public',
    PRIVATE: 'private'
  },
  ANONYMITY: {
    NAMED: 'named',
    ANONYMOUS: 'anonymous'
  }
};

// メインエンドポイント
function doPost(e) {
  try {
    const payload = parsePayload(e);
    console.log('受信したペイロード:', JSON.stringify(payload, null, 2));
    
    if (payload.type === "slash_command") {
      return handleSlashCommand(payload);
    } else if (payload.type === "view_submission") {
      return handleViewSubmission(payload);
    }
    
    return createJsonResponse({ ok: false, error: "不明なペイロードタイプです" });
  } catch (error) {
    console.error('doPost処理中にエラー:', error);
    return createJsonResponse({ ok: false, error: error.message });
  }
}

// JSONレスポンスを作成するヘルパー関数を修正
function createJsonResponse(data) {
  try {
    console.log('=== レスポンス作成開始 ===');
    console.log('データ型:', typeof data);
    console.log('データ構造:', Object.keys(data));
    console.log('生データ:', data);
    console.log('JSON文字列化:', JSON.stringify(data, null, 2));
    
    // レスポンスオブジェクトの作成
    const response = ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
    
    console.log('ContentServiceレスポンス:', {
      mimeType: response.getMimeType(),
      content: response.getContent()
    });
    console.log('=== レスポンス作成完了 ===');
    
    return response;
  } catch (error) {
    console.error('=== レスポンス作成エラー ===');
    console.error('エラー詳細:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      inputData: data
    });
    throw error;
  }
}

// Slashコマンド処理を修正
function handleSlashCommand(payload) {
  try {
    const view = {
      "type": "modal",
      "callback_id": "thanks_modal",
      "title": {
        "type": "plain_text",
        "text": "サンクスメッセージ",
        "emoji": true
      },
      "submit": {
        "type": "plain_text",
        "text": "送信",
        "emoji": true
      },
      "close": {
        "type": "plain_text",
        "text": "キャンセル",
        "emoji": true
      },
      "blocks": [
        {
          "type": "input",
          "block_id": "recipient_block",
          "element": {
            "type": "users_select",
            "action_id": "recipient_select",
            "placeholder": {
              "type": "plain_text",
              "text": "メッセージを送る相手を選択"
            }
          },
          "label": {
            "type": "plain_text",
            "text": "送信先",
            "emoji": true
          }
        },
        {
          "type": "input",
          "block_id": "message_block",
          "element": {
            "type": "plain_text_input",
            "action_id": "message_input",
            "multiline": true,
            "placeholder": {
              "type": "plain_text",
              "text": "感謝のメッセージを入力してください"
            }
          },
          "label": {
            "type": "plain_text",
            "text": "メッセージ",
            "emoji": true
          }
        },
        {
          "type": "input",
          "block_id": "visibility_block",
          "element": {
            "type": "radio_buttons",
            "action_id": "visibility_input",
            "initial_option": {
              "text": {
                "type": "plain_text",
                "text": "公開（#thanks-boardチャンネルに投稿）",
                "emoji": true
              },
              "value": "public"
            },
            "options": [
              {
                "text": {
                  "type": "plain_text",
                  "text": "公開（#thanks-boardチャンネルに投稿）",
                  "emoji": true
                },
                "value": "public"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "非公開（受信者にのみDMで送信）",
                  "emoji": true
                },
                "value": "private"
              }
            ]
          },
          "label": {
            "type": "plain_text",
            "text": "公開設定",
            "emoji": true
          }
        },
        {
          "type": "input",
          "block_id": "anonymity_block",
          "element": {
            "type": "radio_buttons",
            "action_id": "anonymity_input",
            "initial_option": {
              "text": {
                "type": "plain_text",
                "text": "記名（送信者の名前を表示）",
                "emoji": true
              },
              "value": "named"
            },
            "options": [
              {
                "text": {
                  "type": "plain_text",
                  "text": "記名（送信者の名前を表示）",
                  "emoji": true
                },
                "value": "named"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "匿名（送信者の名前を非表示）",
                  "emoji": true
                },
                "value": "anonymous"
              }
            ]
          },
          "label": {
            "type": "plain_text",
            "text": "匿名設定",
            "emoji": true
          }
        }
      ]
    };

    const result = callSlackApi(SLACK_API.METHODS.VIEWS_OPEN, {
      trigger_id: payload.trigger_id,
      view: view
    });

    console.log('モーダルオープン結果:', result);
    return createJsonResponse({ ok: true });
  } catch (error) {
    console.error('Slashコマンド処理中にエラー:', error);
    return createJsonResponse({ ok: false, error: error.message });
  }
}

// モーダル送信処理を修正
function handleViewSubmission(payload) {
  try {
    console.log('=== View Submission処理開始 ===');
    
    const values = payload.view.state.values;
    const messageInput = values.message_block.message_input.value;
    const recipientId = values.recipient_block.recipient_select.selected_user;
    const visibility = values.visibility_block.visibility_input.selected_option.value;
    const anonymity = values.anonymity_block.anonymity_input.selected_option.value;

    if (!messageInput || messageInput.trim().length === 0) {
      return createJsonResponse({
        response_action: "errors",
        errors: {
          "message_block": "メッセージを入力してください"
        }
      });
    }

    const sender = anonymity === CONFIG.ANONYMITY.NAMED ? 
      `<@${payload.user.id}>さんから` : 
      "匿名さんから";

    const messageText = `${sender}のサンクスメッセージ:\n${messageInput}`;

    if (visibility === CONFIG.VISIBILITY.PUBLIC) {
      // 公開メッセージの送信
      callSlackApi(SLACK_API.METHODS.CHAT_POST_MESSAGE, {
        channel: CONFIG.CHANNELS.THANKS_BOARD,
        text: `<@${recipientId}>さんへ\n${messageText}`,
        unfurl_links: false
      });
    } else {
      // DMの送信
      const dmChannel = callSlackApi(SLACK_API.METHODS.CONVERSATIONS_OPEN, {
        users: recipientId
      });
      
      callSlackApi(SLACK_API.METHODS.CHAT_POST_MESSAGE, {
        channel: dmChannel.channel.id,
        text: messageText,
        unfurl_links: false
      });
    }

    return createJsonResponse({});

  } catch (error) {
    console.error('=== View Submission処理エラー ===', error);
    return createJsonResponse({
      response_action: "errors",
      errors: {
        "message_block": "予期せぬエラーが発生しました"
      }
    });
  }
}

// ブロックアクション処理
function handleBlockActions(payload) {
  try {
    // ブロックアクションの処理（必要に応じて実装）
    return createJsonResponse({ ok: true });
  } catch (error) {
    console.error('ブロックアクション処理中にエラー:', error);
    return createJsonResponse({ ok: false, error: error.message });
  }
}

// Slack API呼び出し
function callSlackApi(method, payload) {
  const token = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  if (!token) throw new Error('Slackトークンが設定されていません');

  const response = UrlFetchApp.fetch(`https://slack.com/api/${method}`, {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText());
  if (!result.ok) throw new Error(`Slack API エラー (${method}): ${result.error}`);
  return result;
}

// ペイロードパース
function parsePayload(e) {
  if (!e?.postData?.contents) {
    throw new Error('無効なリクエストです');
  }

  // application/x-www-form-urlencoded の場合
  if (e.postData.type === "application/x-www-form-urlencoded") {
    const params = {};
    e.postData.contents.split('&').forEach(pair => {
      const [key, value] = pair.split('=').map(decodeURIComponent);
      params[key] = value;
    });
    
    // payloadキーが存在する場合はJSONとしてパース
    if (params.payload) {
      return JSON.parse(params.payload);
    }
    
    // スラッシュコマンドの場合
    params.type = "slash_command";
    return params;
  }

  // JSON形式の場合
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    console.error('JSONパースエラー:', error);
    throw new Error('無効なJSONペイロードです');
  }
} 