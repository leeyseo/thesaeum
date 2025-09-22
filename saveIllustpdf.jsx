(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;
  var docFolder;
  try {
    docFolder = doc.fullName.parent;
  } catch (e) {
    alert("❌ 먼저 문서를 저장한 뒤 다시 실행하세요.");
    return;
  }
  if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }

  var curName = doc.name.replace(/\.ai$/i, "");
  if (curName.indexOf("디자이너용") !== -1) {
    alert("⚠️ 디자이너용 미리보기로 작업하셨습니다. f3->f9은 금지되어있습니다. 처음부터 다시 작업하세요");
    return;
  }

  var nameNoExt = decodeURI(doc.name).replace(/\.ai$/i, "");
  var mm = nameNoExt.match(/_([0-9]+)_(\d{8}-\d{7}(?:-\d+)?)/);
  if (!mm) {
    alert("❌ 파일명에서 '_<개수>_YYYYMMDD-#######(-##)' 패턴을 찾지 못했습니다.\n예: ..._3_20250902-0002919-01_1");
    return;
  }
  var parsedCount = parseInt(mm[1], 10);
  var orderBlock  = mm[2];
  if (!parsedCount || parsedCount < 1) {
    alert("❌ 파일명에서 유효한 개수를 읽지 못했습니다: '" + mm[1] + "'");
    return;
  }

  // 키워드 리스트 관리
  var DOUBLE_WORDS = ["사원증", "명함"];  // 있으면 양면 처리 대상
  var EXCLUDE_DOUBLE_WORDS = ["오로라"];   // 포함되면 양면 예외

  function containsAny(hay, arr) {
    if (!hay) return false;
    for (var i = 0; i < arr.length; i++) {
      var w = arr[i];
      if (w && hay.indexOf(w) !== -1) return true; // 문자열 indexOf는 ES3 OK
    }
    return false;
  }

  var hasDouble = containsAny(nameNoExt, DOUBLE_WORDS);
  var hasExclude = containsAny(nameNoExt, EXCLUDE_DOUBLE_WORDS);

  var expectedBoards = parsedCount;
  if (!hasExclude && hasDouble) expectedBoards = parsedCount * 2;

  var actualBoards = doc.artboards.length;
  if (actualBoards !== expectedBoards) {
    var msgA = "🚫 대지 개수 불일치로 실행을 중단합니다.\n\n"
             + "• 주문 블록: " + orderBlock + "\n"
             + "• 파일명에서 읽은 개수 N: " + parsedCount + ( (!hasExclude && hasDouble) ? "  (양면 → ×2 적용)" : "" ) + "\n"
             + "• 필요 대지수: " + expectedBoards + "\n"
             + "• 실제 대지수: " + actualBoards + "\n\n"
             + "규칙: 파일명에 '오로라'가 없고, '사원증/명함'이 포함되면 N×2 대지가 필요합니다.";
    alert(msgA);
    return;
  }

  /* =========================
     0) 실행 전 텍스트 정규화 검사 (포함되면 알럿 후 종료)
     ========================= */
  // 보호어 원본 목록
  var PROTECT_VALUES = ["홍길동", "길동", "honggildong", "gildong"];

  // 정규화: 영문 소문자화 + 한글/영문/숫자만 유지 (공백·특수문자 제거)
  function _normalize(s) {
    s = (s || "").toLowerCase();
    return s.replace(/[^0-9a-z\uac00-\ud7a3]+/g, "");
  }
  function _trim(s) { return (s || "").replace(/^\s+|\s+$/g, ""); }

  // 보호어 정규화(ES3: 배열 indexOf 미사용)
  var tokens = [];
  var i, j;
  for (i = 0; i < PROTECT_VALUES.length; i++) {
    tokens[tokens.length] = _normalize(PROTECT_VALUES[i]);
  }
  function isScannableTextFrame(tf) {
    if (!tf) return false;

    // 1) 자신 상태
    if (tf.locked || tf.hidden) return false;

    // 2) 소속 레이어 상태 (레이어 숨김/잠금이면 제외)
    var lay = tf.layer;
    if (lay) {
      if (lay.locked) return false;
      if (lay.visible === false) return false; // 숨겨진 레이어 제외
    }

    // 3) 상위 그룹/페이지아이템 체인 상태 (레이어/문서 제외)
    var p = tf.parent;
    while (p && p.typename && p.typename !== "Document") {
      if (p.locked || p.hidden) return false; // 숨김/잠금 그룹 제외
      p = p.parent;
    }
    return true;
  }

  // 모든 텍스트프레임 검사
  var hits = []; // 발견된 원문을 몇 개만 모음
  for (i = 0; i < doc.textFrames.length; i++) {
    var tf = doc.textFrames[i];
    if (!isScannableTextFrame(tf)) continue;

    var raw  = _trim(tf.contents);
    if (!raw) continue;

    var norm = _normalize(raw);
    var found = false;
    for (j = 0; j < tokens.length; j++) {
      var tok = tokens[j];
      if (tok && norm.indexOf(tok) !== -1) { // 부분 포함 매칭
        found = true;
        break;
      }
    }
    if (found) {
      hits[hits.length] = raw;
      if (hits.length >= 8) break; // 너무 많으면 적당히 자름
    }
  }

  if (hits.length > 0) {
    var msg = "🚫 보호어(정규화 기준) 포함 텍스트가 발견되었습니다. 확인바랍니다.\n\n";
    for (i = 0; i < hits.length; i++) {
      var sample = hits[i];
      if (sample.length > 40) sample = sample.substring(0, 40) + "…";
      msg += "• " + sample + "\n";
    }
    alert(msg);
    // return; // 즉시 종료
  }
  /* =========================
     (검사 통과 시 이하 기존 로직 실행)
     ========================= */

  var fileStem = decodeURI(doc.name).replace(/\.ai$/i, "");
  var m = fileStem.match(/_([0-9]{8}-[0-9]{7}(?:-\d+)?)(?:\+([^+]+))?$/);
  if (m) {
    var reportPart = (m[2] || "").replace(/^\s+|\s+$/g, "");
    if (reportPart.toLowerCase().indexOf("b") !== -1) {
      var workFolderA = new Folder("C:/work/작업물");
      if (!workFolderA.exists) workFolderA.create();

      // …_YYYYMMDD-#######(-##) 까지
      var fullNameA = decodeURI(doc.name).replace(/\.ai$/i, "");
      var matchFullA = fullNameA.match(/^(.*?_\d{8}-\d{7}(?:-\d+)?)/);
      var inputNameA = matchFullA ? matchFullA[1] : fullNameA;

      // AI 파일 복사
      var aiDest = new File(workFolderA.fsName + "/" + inputNameA + ".ai");
      doc.fullName.copy(aiDest);
      return;
    }
  }

  // ── 유틸
  function isEmpty(str) {
    return str === null || str.replace(/^\s+|\s+$/g, '') === "";
  }

  // 파일명 파싱
  var fullName = decodeURI(doc.name).replace(/\.ai$/i, "");
  var matchFull = fullName.match(/^(.*?_\d{8}-\d{7}(?:-\d+)?)/);
  if (!matchFull) {
    alert("❌ 파일명에서 '_YYYYMMDD-#######' 형식을 찾지 못했습니다.");
    return;
  }
  var inputName = matchFull[1];

  // PDF 옵션
  var pdfOpts = new PDFSaveOptions();
  pdfOpts.compatibility       = PDFCompatibility.ACROBAT5;
  pdfOpts.preserveEditability = false;
  pdfOpts.generateThumbnails  = true;
  pdfOpts.viewPDF             = false;

  if (doc.artboards.length > 1) {
    pdfOpts.saveMultipleArtboards = true;
    pdfOpts.artboardRange = "1-" + doc.artboards.length;
  } else {
    pdfOpts.saveMultipleArtboards = false;
  }

  // 작업물 폴더
  var workFolder = new Folder("C:/work/작업물");
  if (!workFolder.exists) workFolder.create();

  if (isEmpty(inputName)) {
    var fileSimple = new File(workFolder.fsName + "/파일명없음.pdf");
    doc.saveAs(fileSimple, pdfOpts);
    alert("✅ PDF 저장 완료:\n" + fileSimple.fsName);
    return;
  }

  var match = inputName.match(/_([0-9]{8}-[0-9]{7}(?:-\d+)?)/);
  if (!match) {
    alert("❌ 파일명 마지막에 '_YYYYMMDD-#######' 형식이 필요합니다.");
    return;
  }

  var resultFolder = docFolder;

  // 중복 방지 파일 생성
  function getUniqueFile(folder, baseName) {
    var f = new File(folder.fsName + "/" + baseName + ".pdf");
    var idx = 1;
    while (f.exists) {
      f = new File(folder.fsName + "/" + baseName + "_" + idx + ".pdf");
      idx++;
    }
    return f;
  }

  // 1) 작업결과 폴더 저장
  var file1 = getUniqueFile(resultFolder, inputName);
  doc.saveAs(file1, pdfOpts);

  // 2) 작업물 폴더 복사
  var file2 = new File(workFolder.fsName + "/" + inputName + ".pdf");
  file1.copy(file2);
})();
