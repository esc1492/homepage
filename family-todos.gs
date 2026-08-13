/**
 * 가족 투두 Apps Script (Supabase 로그인 필수)
 *
 * [배포 방법]
 * 1. 기존 Code.gs 내용 전체 삭제 후 이 코드를 붙여넣기
 * 2. 스프레드시트에 바인딩된 스크립트여야 함 (스프레드시트 -> 확장 프로그램 -> Apps Script)
 *    시트 "Todos"는 없으면 자동 생성됩니다.
 * 3. 저장 -> 배포 -> 새 배포 -> 유형 "웹 앱"
 *      - 실행 대상: "나"
 *      - 액세스 권한: "모든 사용자" (실제 보호는 JWT 검증이 담당)
 * 4. 발급된 /exec URL을 index.html의 SCRIPT_URL에 반영
 *
 * 보안: 프론트가 보낸 Supabase 액세스 토큰(JWT)을 Supabase /auth/v1/user로
 *       검증하고, 유효한 로그인 사용자만 읽기/쓰기를 허용합니다.
 */

var SUPABASE_URL = 'https://oggzgullnohqehthewuw.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZ3pndWxsbm9ocWVodGhld3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1ODg3ODMsImV4cCI6MjEwMjE2NDc4M30.tWfDgqwX9_YrDCfW2w67uX1Kluo4PvUJzBfk2VGkwU0';
var SHEET_NAME = 'Todos';

// === 인증 ===
function verifyToken(token) {
  if (!token) return false;
  try {
    var resp = UrlFetchApp.fetch(SUPABASE_URL + '/auth/v1/user', {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + token,
        'apikey': SUPABASE_ANON_KEY
      },
      muteHttpExceptions: true
    });
    return resp.getResponseCode() === 200;
  } catch (e) {
    return false;
  }
}

// === 시트 헬퍼 ===
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['id', 'text', 'done']);
  }
  return sheet;
}

function getAllTodos_() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  var todos = [];
  if (lastRow < 2) return todos;
  var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (!row[0]) continue;
    todos.push({ id: String(row[0]), text: row[1], done: !!row[2] });
  }
  return todos;
}

function findRow_(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // 1-indexed row
  }
  return -1;
}

function addTodo_(id, text) {
  var sheet = getSheet_();
  var newId = id || String(new Date().getTime());
  sheet.appendRow([newId, text, false]);
  return { id: newId, text: text, done: false };
}

function toggleTodo_(id) {
  var sheet = getSheet_();
  var row = findRow_(sheet, id);
  if (row === -1) return false;
  var cell = sheet.getRange(row, 3);
  cell.setValue(!cell.getValue());
  return true;
}

function deleteTodo_(id) {
  var sheet = getSheet_();
  var row = findRow_(sheet, id);
  if (row === -1) return false;
  sheet.deleteRow(row);
  return true;
}

function clearDone_() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  for (var r = lastRow; r >= 2; r--) {
    if (sheet.getRange(r, 3).getValue()) sheet.deleteRow(r);
  }
}

// === 응답 ===
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// === 엔트리포인트 ===
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  var token = (e && e.parameter && e.parameter.token) || '';
  if (action !== 'getAll') return json_({ error: 'unknown action' });
  if (!verifyToken(token)) return json_({ error: 'unauthorized' });
  return json_(getAllTodos_());
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return json_({ error: 'invalid body' });
  }
  if (!verifyToken(body.token)) return json_({ error: 'unauthorized' });

  var action = body.action;
  if (action === 'add') {
    return json_({ ok: true, todo: addTodo_(body.id, body.text || '') });
  }
  if (action === 'toggle') {
    return json_({ ok: toggleTodo_(body.id) });
  }
  if (action === 'delete') {
    return json_({ ok: deleteTodo_(body.id) });
  }
  if (action === 'clearDone') {
    clearDone_();
    return json_({ ok: true });
  }
  return json_({ error: 'unknown action' });
}
