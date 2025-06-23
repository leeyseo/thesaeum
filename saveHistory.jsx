(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // ── 사용자 입력 ──
  var userName = prompt("저장할 이름을 입력하세요 (예: 홍길동):", "");
  if (!userName) return;

  // ── 폴더 생성 ──
  var baseFolder = new Folder(Folder.desktop + "/작업물");
  if (!baseFolder.exists) baseFolder.create();

  var docName = doc.name.replace(/\.[^\.]+$/, "");  // 확장자 제거
  var projFolder = new Folder(baseFolder.fsName + "/" + docName);
  if (!projFolder.exists) projFolder.create();

  // ── 기존 파일명 조사 ──
  var maxIndex = 0;
  var files = projFolder.getFiles("*.ai");
  for (var i = 0; i < files.length; i++) {
    var fname = decodeURI(files[i].name);
    var match = fname.match(new RegExp("^" + userName + "_(\\d+)\\.ai$"));
    if (match) {
      var num = parseInt(match[1]);
      if (!isNaN(num) && num > maxIndex) maxIndex = num;
    }
  }
  var nextIndex = maxIndex + 1;
  var finalName = userName + "_" + nextIndex;

  // ── 저장 경로 ──
  var aiFile = new File(projFolder.fsName + "/" + finalName + ".ai");
  var jpgFile = new File(projFolder.fsName + "/" + finalName + ".jpg");

  // ── JPG 내보내기 ──
  var ab = doc.artboards[0];
  doc.artboards.setActiveArtboardIndex(0);
  app.executeMenuCommand("deselectall");
  doc.selectObjectsOnActiveArtboard();

  var jpgOptions = new ExportOptionsJPEG();
  jpgOptions.antiAliasing = true;
  jpgOptions.qualitySetting = 100;
  jpgOptions.horizontalScale = 300;
  jpgOptions.verticalScale = 300;
  jpgOptions.resolution = 300;
  jpgOptions.optimized = true;
  jpgOptions.artBoardClipping = true;

  doc.exportFile(jpgFile, ExportType.JPEG, jpgOptions);

  // ── AI 저장 ──
  var aiOptions = new IllustratorSaveOptions();
  aiOptions.compatibility = Compatibility.ILLUSTRATOR17;
  aiOptions.flattenOutput = OutputFlattening.PRESERVEAPPEARANCE;

  doc.saveAs(aiFile, aiOptions);

  alert("✅ 저장 완료:\n" + finalName + ".ai & .jpg");

})();
