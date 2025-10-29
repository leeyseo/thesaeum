// #target illustrator
(function () {
  if (app.documents.length === 0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument;

  /* 1) 파일명에서 '..._YYYYMMDD-#######(-n)' 블록 추출 */
  var fullName = decodeURI(doc.name).replace(/\.ai$/i, "");
  var m = fullName.match(/^(.*?_\d{8}-\d{7}(?:-\d+)?)/);
  if (!m) { alert("❌ 파일명에서 '_YYYYMMDD-#######' 형식을 찾을 수 없습니다."); return; }
  var inputStem = m[1]; // 앞부분+_날짜-번호(-추가번호)
  // 순수 주문번호만 추출 (밑줄 뒤)
  var idm = inputStem.match(/_(\d{8}-\d{7}(?:-\d+)?)/);
  if (!idm) { alert("❌ 주문번호 추출 실패"); return; }
  var orderId = idm[1]; // 예: 20250814-0001677-01

  var candidates = [
    { path: "C:/work/" + orderId + "/" + orderId + "_new.csv", isNew: true },
    { path: "C:/work/" + orderId + "/" + orderId + "_add.csv", isNew: false }
  ];

  var csvFile = null;
  var isNewJob = false;

  for (var c = 0; c < candidates.length; c++) {
    var f = new File(candidates[c].path);
    if (f.exists) {
      csvFile = f;
      isNewJob = candidates[c].isNew === true;
      break;
    }
  }

  if (isNewJob) { 
    return; 
  }

  if (!csvFile) {
    // alert("❌ CSV 파일을 찾을 수 없습니다.\n"
    //   + "시도한 경로:\n - " + candidates[0].path + "\n - " + candidates[1].path);
    return;
  }


  /* 3) 변수 라이브러리 불러오기 */
  try {
    doc.importVariables(csvFile);
  } catch (e) {
    // alert("❌ 변수 라이브러리 불러오기 실패:\n" + e);
    return;
  }

  /* 4) 신규건(_new)일 때만 보호 원복 + 첫 데이터셋 미리보기 */
  if (!isNewJob) {
    // 기타(_add) 건은 변수만 가져오고 끝.
    return;
  }

  /* 4) 보호 텍스트 원복 + 첫 데이터셋 미리보기 (정규화·부분포함 매칭) */

  // 보호어 원본 리스트
  var PROTECT_VALUES = ["홍길동", "길동", "honggildong", "gildong"];

  // ★ CHANGED: 더 강한 정규화 함수
  //  - 영문 소문자화
  //  - 한글/영문/숫자만 남기고 나머지(공백·특수문자 등) 제거
  function _normalize(s) {                       // ★ CHANGED
    s = (s || "").toLowerCase();
    return s.replace(/[^0-9a-z\uac00-\ud7a3]+/g, "");
  }

  function _trim(s) { return (s || "").replace(/^\s+|\s+$/g, ""); }

  // ★ CHANGED: 보호어를 미리 정규화해 둔다
  var PROTECT_TOKENS = [];                       // ★ CHANGED
  for (var p = 0; p < PROTECT_VALUES.length; p++) {
    PROTECT_TOKENS[PROTECT_TOKENS.length] = _normalize(PROTECT_VALUES[p]);
  }

  var keepFrames = [], keepTexts = [];

  // 4-1) 표시 전: 보호 대상 텍스트프레임 수집 (정규화 후 '부분 포함' 매칭)
  for (var i = 0; i < doc.textFrames.length; i++) {
    var tf = doc.textFrames[i];
    if (tf.locked || tf.hidden) continue; // 편집 불가면 제외

    var raw = _trim(tf.contents);
    var nrm = _normalize(raw);            // ★ CHANGED: 새 정규화 사용

    // ★ CHANGED: '완전 동일(===)' → '부분 포함(indexOf != -1)'
    var protectHit = false;               // ★ CHANGED
    for (var k = 0; k < PROTECT_TOKENS.length; k++) {
      var token = PROTECT_TOKENS[k];
      if (token && nrm.indexOf(token) !== -1) { // 부분포함
        protectHit = true;
        break;
      }
    }

    if (protectHit) {
      keepFrames[keepFrames.length] = tf;
      keepTexts[keepTexts.length] = tf.contents; // 원본 저장
    }
  }

  // 4-2) 첫 데이터셋 표시
  var dsCount = doc.dataSets.length;
  try { if (dsCount > 0) doc.dataSets[0].display(); } catch (_){}

  // 4-3) 표시 후: 보호 대상 원복
  for (i = 0; i < keepFrames.length; i++) {
    try { keepFrames[i].contents = keepTexts[i]; } catch (_){}
  }

})();
