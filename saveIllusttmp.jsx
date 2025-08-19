/*  미리보기용 파일로 “다른 이름 저장” (ES3-Compatible)  */
(function () {
  /* 0) 열려 있는 문서 확인 */
  if (app.documents.length === 0) {
    alert("❌ 열려 있는 AI 문서가 없습니다.");
    return;
  }
  // if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }
  var doc = app.activeDocument;
  if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }

  /* 1) 원본 파일 경로·이름 파싱 */
  var orig     = new File(doc.fullName);          // 전체 경로
  var dir      = orig.parent;                     // 같은 폴더
  var baseName = orig.name.replace(/\.ai$/i, ""); // 확장자 제외

  /* 2) ‘_미리보기용’ 접미어 부여 */
  var previewName = baseName + "_미리보기용-업로드금지(X).ai";
  var previewFile = new File(dir.fsName + "/" + previewName);


  /* 4) AI 저장 옵션 (편집 가능, PDF 미포함) */
  var aiOpts = new IllustratorSaveOptions();
  aiOpts.pdfCompatible = false;          // 필요 시 true
  aiOpts.embedICCProfile = false;
  aiOpts.compressed = true;

  /* 5) 저장 후 안내 */
  doc.saveAs(previewFile, aiOpts);
//   alert("✅ 미리보기용으로 저장 완료:\n" + previewFile.fsName);
  /* 6) 원본 파일명에서 +알파벳 제거 (예: ...-01+a_1.ai → ...-01_1.ai) */
  var cleanedBase = baseName.replace(
    /(_\d{8}-\d{7}(?:-\d+)?)(\+[A-Za-z]+)(?=(_|$))/,
    "$1"
  );

  if (cleanedBase !== baseName) {
    var originalPath = dir.fsName + "/" + baseName + ".ai";
    var cleanedPath  = dir.fsName + "/" + cleanedBase + ".ai";

    var originalFile = new File(originalPath);
    var cleanedFile  = new File(cleanedPath);

    if (originalFile.exists) {
      // 같은 이름이 이미 있으면 (2), (3)… 붙여서 저장
      if (cleanedFile.exists) {
        var n = 2;
        while (new File(dir.fsName + "/" + cleanedBase + "(" + n + ").ai").exists) {
          n++;
        }
        cleanedFile = new File(dir.fsName + "/" + cleanedBase + "(" + n + ").ai");
      }
      try {
        originalFile.rename(cleanedFile.name);
      } catch (e) {
        // rename 실패 시에는 그대로 두거나 필요하면 alert
        // alert("⚠️ 이름 변경 실패: " + e);
      }
    }
  }
})();
