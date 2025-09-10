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

  /* 2) CSV 경로 구성: C:/work/<id>/<id>.csv  (슬래시는 / 사용) */
  var csvPath = "C:/work/" + orderId + "/" + orderId +"_new"+ ".csv";
  var csvFile = new File(csvPath);
  if (!csvFile.exists) {
    // 보조: 같은 폴더의 .CSV(대문자) 또는 .xml도 찾아봄
    var csvAlt = new File("C:/work/" + orderId + "/" + orderId + "_add" + ".csv");
    if (csvAlt.exists) {
      return;
    }
    else {
      return;
    }
  }

  /* 3) 변수 라이브러리 불러오기 (CSV 또는 XML 모두 지원) */
  try {
    // Illustrator DOM: Document.importVariables(File)
    doc.importVariables(csvFile);
  } catch (e) {
    alert("❌ 변수 라이브러리 불러오기 실패:\n" + e);
    return;
  }

  /* 4) 보호 텍스트(홍길동, hong gil dong) 원복 + 첫 데이터셋 미리보기 */
var PROTECT_VALUES = ["홍길동","길동", "hong gil dong","gil dong","Hong Gil Dong","Hong gil dong","Gil Dong","Gil dong"];

function _norm(s) { return (s || "").toLowerCase().replace(/[\s\-\_\.]+/g, ""); } // 공백/기호 무시
function _trim(s) { return (s || "").replace(/^\s+|\s+$/g, ""); }

var keepFrames = [], keepTexts = [];

// 4-1) 표시 전: 보호 대상 텍스트프레임 수집
for (var i = 0; i < doc.textFrames.length; i++) {
  var tf = doc.textFrames[i];
  if (tf.locked || tf.hidden) continue;                // 편집 불가면 제외
  var txt = _trim(tf.contents);
  var nrm = _norm(txt);
  for (var k = 0; k < PROTECT_VALUES.length; k++) {
    if (nrm === _norm(PROTECT_VALUES[k])) {
      keepFrames.push(tf);
      keepTexts.push(tf.contents);                      // 정확히 원본을 저장
      break;
    }
  }
}

// 4-2) 첫 데이터셋 표시
var dsCount = doc.dataSets.length;
try { if (dsCount > 0) doc.dataSets[0].display(); } catch (_) {}

// 4-3) 표시 후: 보호 대상 원복
for (i = 0; i < keepFrames.length; i++) {
  try { keepFrames[i].contents = keepTexts[i]; } catch (_) {}
}

})();
