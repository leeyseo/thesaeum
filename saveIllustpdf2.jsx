(function () {

  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;

  /* ──── 공백 검사 함수 (ES3) ──── */
  function isEmpty(str){ return str===null || str.replace(/^\s+|\s+$/g,'')===""; }

  /* ──── 파일명 입력 ──── */
  // var inputName = prompt("PDF로 저장할 파일 이름을 입력하세요:", "");
  // if (inputName === null){ alert("❌ 저장이 취소되었습니다."); return; }
  var inputName = decodeURI(doc.name).replace(/\.ai$/i, "");

  /* ──── PDF 옵션 공통 ──── */
  var pdfOpts = new PDFSaveOptions();
  pdfOpts.compatibility       = PDFCompatibility.ACROBAT5;
  pdfOpts.preserveEditability = false;
  pdfOpts.generateThumbnails  = true;
  pdfOpts.viewPDF             = false;

  /* =====  행-우선 2-열 순서 구성  ===== */
  var COLS = 2;                                       // 열 개수
  function rowMajorOrder(total, cols){
    var rows  = Math.ceil(total/cols), seq = [];
    for (var r=0; r<rows; r++){
      for (var c=0; c<cols; c++){
        var idx = c*rows + r + 1;                    // 1-based
        if (idx <= total) seq.push(idx);
      }
    }
    return seq;
  }

  if (doc.artboards.length > 1){
    var orderArr = rowMajorOrder(doc.artboards.length, COLS);
    pdfOpts.saveMultipleArtboards = true;
    pdfOpts.artboardRange         = orderArr.join(",");   // "1,2,4,5,3,6" 등
  }else{
    pdfOpts.saveMultipleArtboards = false;
  }

  /* ──── 작업물 폴더 ──── */
  var workFolder = new Folder("C:/work/작업물"); if(!workFolder.exists) workFolder.create();

  /* 공백 입력 → 파일명없음.pdf 한 장만 */
  if (isEmpty(inputName)){
    var f = new File(workFolder.fsName + "/파일명없음.pdf");
    doc.saveAs(f, pdfOpts);
    alert("✅ PDF 저장 완료:\n" + f.fsName);
    return;
  }

  /* ──── 폴더명 확인 & 생성 ──── */
  var resultFolder = doc.fullName.parent;

  function uniq(folder, base){
    var f=new File(folder.fsName+"/"+base+".pdf"),i=1;
    while(f.exists){ f=new File(folder.fsName+"/"+base+"_"+i+".pdf"); i++; }
    return f;
  }

  /* 1️⃣ 작업결과(중복 방지) */
  var file1 = uniq(resultFolder, inputName);
  doc.saveAs(file1, pdfOpts);

  /* 2️⃣ 작업물(고정 이름, 중복 체크 X) */
  var file2 = new File(workFolder.fsName + "/" + inputName + ".pdf");
  doc.saveAs(file2, pdfOpts);

  // /* ──── 완료 보고 ──── */
  // alert(
  //   "✅ PDF 저장 완료 (행-우선 2열 순서)\n" +
  //   "1) " + file1.fsName + "\n" +
  //   "2) " + file2.fsName
  // );

})();
