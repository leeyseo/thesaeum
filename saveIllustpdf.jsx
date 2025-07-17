(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;
  // ★ 현재 문서(.ai)가 저장된 폴더
  var docFolder;
  try {
    docFolder = doc.fullName.parent;
  } catch (e) {
    alert("❌ 먼저 문서를 저장한 뒤 다시 실행하세요.");
    return;
  }
  if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }

  

  // 🔧 ES3 호환 공백 제거 함수 (trim 대체)
  function isEmpty(str) {
    return str === null || str.replace(/^\s+|\s+$/g, '') === "";
  }

  // 🔤 파일명 입력
  // var inputName = prompt("PDF로 저장할 파일 이름을 입력하세요:", "");
  var fullName = decodeURI(doc.name).replace(/\.ai$/i, "");
  var matchFull = fullName.match(/^(.*?_\d{8}-\d{7}(?:-\d+)?)/);
  if (!matchFull) {
    alert("❌ 파일명에서 '_YYYYMMDD-#######' 형식을 찾지 못했습니다.");
    return;
  }
  var inputName = matchFull[1];
  

  // // ⛔ 창 닫음 (null) → 저장 안 함
  // if (inputName === null) {
  //   alert("❌ 저장이 취소되었습니다.");
  //   return;
  // }

  // 📄 PDF 옵션
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

  // 📁 작업물 폴더 항상 준비
  var workFolder = new Folder("C:/work/작업물");
  if (!workFolder.exists) workFolder.create();

  // ⛔ 입력이 공백일 경우 → "파일명없음.pdf"만 작업물에 저장
  if (isEmpty(inputName)) {
    var fileSimple = new File(workFolder.fsName + "/파일명없음.pdf");
    doc.saveAs(fileSimple, pdfOpts);
    alert("✅ PDF 저장 완료:\n" + fileSimple.fsName);
    return;
  }

  // ✅ 입력 정상 → 작업결과 + 작업물 모두 저장
  var match = inputName.match(/_([0-9]{8}-[0-9]{7}(?:-\d+)?)/);
  if (!match) {
    alert("❌ 파일명 마지막에 '_YYYYMMDD-#######' 형식이 필요합니다.");
    return;
  }

  var folderName = match[1];

  var resultFolder = docFolder;

  // 중복 방지 파일 생성 함수
  function getUniqueFile(folder, baseName) {
    var f = new File(folder.fsName + "/" + baseName + ".pdf");
    var i = 1;
    while (f.exists) {
      f = new File(folder.fsName + "/" + baseName + "_" + i + ".pdf");
      i++;
    }
    return f;
  }

  // 1️⃣ 작업결과 폴더에 중복 방지 저장 (doc.saveAs는 딱 1번만)
  var file1 = getUniqueFile(resultFolder, inputName);
  doc.saveAs(file1, pdfOpts);

  // 2️⃣ 작업물 폴더에는 파일 복사
  var file2 = new File(workFolder.fsName + "/" + inputName + ".pdf");
  file1.copy(file2);  // ← 복사만 함
  // ✅ 완료 메시지
  // alert("✅ PDF 저장 완료:\n1) " + file1.fsName + "\n2) " + file2.fsName);
})();
