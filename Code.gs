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
    
    if (payload.type === "slash_command") {
      return handleSlashCommand(payload);
    } else if (payload.type === "view_submission") {
      return handleViewSubmission(payload);
    } else if (payload.type === "block_actions") {
      return handleBlockActions(payload);
    }
    
    return createJsonResponse({ ok: false, error: "不明なペイロードタイプです" });
  } catch (error) {
    console.error('doPost処理中にエラー:', error);
    return createJsonResponse({ ok: false, error: error.message });
  }
}

// JSONレスポンスを作成するヘルパー関数
function createJsonResponse(data) {
  console.log('レスポンス作成:', JSON.stringify(data, null, 2));
  const response = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return response;
}

// Slashコマンド処理
function handleSlashCommand(payload) {
  try {
    const view = {
      "type": "modal",
      "callback_id": "thanks_modal_submission",
      "title": {
        "type": "plain_text",
        "text": "Send Thanks"
      },
      "submit": {
        "type": "plain_text",
        "text": "送信"
      },
      "close": {
        "type": "plain_text",
        "text": "キャンセル"
      },
      "blocks": [
        {
          "type": "input",
          "block_id": "receiver_block",
          "element": {
            "type": "users_select",
            "action_id": "receiver_select",
            "placeholder": {
              "type": "plain_text",
              "text": "感謝を送りたいユーザーを選択"
            }
          },
          "label": {
            "type": "plain_text",
            "text": "受信者"
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
              "text": "メッセージを入力してください"
            }
          },
          "label": {
            "type": "plain_text",
            "text": "メッセージ"
          }
        }
      ]
    };

    callSlackApi("views.open", {
      trigger_id: payload.trigger_id,
      view: view
    });

    return createJsonResponse({ ok: true });
  } catch (error) {
    console.error('Slashコマンド処理中にエラー:', error);
    return createJsonResponse({ ok: false, error: error.message });
  }
}

// モーダル送信処理を修正
function handleViewSubmission(payload) {
  try {
    console.log('View Submission payload:', JSON.stringify(payload, null, 2));

    // ペイロードの検証
    if (!payload.view?.state?.values) {
      const error = new Error('無効なペイロード形式です');
      console.error('ペイロード検証エラー:', error.message, JSON.stringify(payload, null, 2));
      throw error;
    }

    const values = payload.view.state.values;
    console.log('入力値:', JSON.stringify(values, null, 2));
    
    // 入力値の取得
    const receiver = values.receiver_block?.receiver_select?.selected_user;
    const message = values.message_block?.message_input?.value;

    console.log('パース済み入力値:', {
      receiver,
      message,
      user_id: payload.user?.id
    });

    // バリデーション
    const errors = {};
    if (!receiver) {
      console.warn('受信者が未選択です');
      errors["receiver_block"] = "受信者を選択してください";
    }
    if (!message) {
      console.warn('メッセージが未入力です');
      errors["message_block"] = "メッセージを入力してください";
    }

    if (Object.keys(errors).length > 0) {
      console.log('バリデーションエラー:', errors);
      // バリデーションエラー時は必ずerrorsオブジェクトのみを返す
      return createJsonResponse({ errors });
    }

    try {
      console.log('メッセージ送信開始:', {
        to: receiver,
        from: payload.user.id,
        message: message
      });

      // メッセージ送信
      const postResult = callSlackApi("chat.postMessage", {
        channel: receiver,
        text: `<@${payload.user.id}> からのメッセージ:\n${message}`,
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `<@${payload.user.id}> からのメッセージ:`
            }
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": message
            }
          }
        ]
      });

      console.log('メッセージ送信成功:', postResult);

      // 成功時は空のオブジェクトを返す（モーダルを閉じる）
      return createJsonResponse({});

    } catch (error) {
      console.error('メッセージ送信エラー:', error.message, error.stack);
      // APIエラー時はエラーメッセージを表示
      return createJsonResponse({
        errors: {
          message_block: `メッセージの送信に失敗しました:\n${error.message}\n\n詳細: ${JSON.stringify(error, null, 2)}`
        }
      });
    }

  } catch (error) {
    console.error('モーダル送信処理中の予期せぬエラー:', error.message, error.stack);
    // 予期せぬエラー時もエラーメッセージを表示
    return createJsonResponse({
      errors: {
        message_block: `予期せぬエラーが発生しました:\n${error.message}\n\nスタックトレース:\n${error.stack}\n\nペイロード:\n${JSON.stringify(payload, null, 2)}`
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
  if (!token) {
    throw new Error('Slackトークンが設定されていません');
  }

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
  if (!result.ok) {
    throw new Error(`Slack API エラー (${method}): ${result.error}`);
  }

  return result;
}

// ペイロードパース
function parsePayload(e) {
  if (!e?.postData?.contents) {
    throw new Error('無効なリクエストです');
  }

  if (e.postData.type === "application/x-www-form-urlencoded") {
    // Slashコマンドの場合
    const params = {};
    e.postData.contents.split('&').forEach(pair => {
      const [key, value] = pair.split('=').map(decodeURIComponent);
      params[key] = value;
    });
    params.type = "slash_command";
    return params;
  }

  // インタラクティブペイロードの場合
  const payload = JSON.parse(e.parameter.payload);
  return payload;
} 