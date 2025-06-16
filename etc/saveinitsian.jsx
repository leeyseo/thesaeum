(function () {
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;

  // 먼저 원본 문서를 한 번 저장해 두면 충돌 가능성 ↓
  if (doc.modified) doc.save();

  // ─────────────────────────────────────────────
  // 1) 저장할 파일명 입력
  // ─────────────────────────────────────────────
  var fileNameInput = prompt("저장할 파일명을 입력하세요 (예: hong_gildong_design)", "");
  if (!fileNameInput) { alert("파일명이 입력되지 않아 작업을 취소합니다."); return; }
  var safeName = fileNameInput.replace(/[\\\/:*?"<>|]/g, "_");

  // 2) 변수 “이름*” 모두 찾아 “홍길동”으로 치환 ― 수정 블록
  var nameVars = [];
  for (var i = 0; i < doc.variables.length; i++) {
    if (doc.variables[i].name.indexOf("이름") === 0) nameVars.push(doc.variables[i]);
  }
  if (nameVars.length === 0) { alert("'이름'으로 시작하는 변수가 없습니다."); return; }

  for (var j = 0; j < doc.textFrames.length; j++) {
    var tf = doc.textFrames[j];
    for (var k = 0; k < nameVars.length; k++) {
      if (tf.variable === nameVars[k]) {
        tf.variable  = null;          // ← 변수 연결 해제
        tf.contents  = "홍길동";      // ← 텍스트 덮어쓰기
        break;
      }
    }
  }

  // ─────────────────────────────────────────────
  // 3) 저장 경로 준비
  // ─────────────────────────────────────────────
  var targetFolder = new Folder("C:/Users/thesaeum/Desktop/디자인실습/일러 자동화 테스트");
  if (!targetFolder.exists) targetFolder.create();

  var pdfFile = File(targetFolder + "/" + safeName + ".pdf");
  var jpgFile = File(targetFolder + "/" + safeName + ".jpg");

  // ─────────────────────────────────────────────
  // 4) 첫 번째 아트보드 활성
  // ─────────────────────────────────────────────
  doc.artboards.setActiveArtboardIndex(0);

  // ─────────────────────────────────────────────
  // 5) PDF ‟Save a Copy”  저장
  //    → 세 번째 인수 asCopy=true 로 충돌 방지
  // ─────────────────────────────────────────────
  var pdfOpts = new PDFSaveOptions();
  pdfOpts.compatibility = PDFCompatibility.ACROBAT8;     // 필요시 조정
  pdfOpts.generateThumbnails = true;
  pdfOpts.preserveEditability = false;
  doc.saveAs(pdfFile, pdfOpts, true);  // ← asCopy = true

  // ─────────────────────────────────────────────
  // 6) JPG export
  // ─────────────────────────────────────────────
  var jpgOpts = new ExportOptionsJPEG();
  jpgOpts.artBoardClipping = true;
  jpgOpts.qualitySetting   = 70;
  jpgOpts.horizontalScale  = 100;
  jpgOpts.verticalScale    = 100;
  jpgOpts.antiAliasing     = true;
  jpgOpts.artBoardRange    = "1";
  doc.exportFile(jpgFile, ExportType.JPEG, jpgOpts);

  alert("✅ 저장 완료!\n" + targetFolder.fsName);
})();