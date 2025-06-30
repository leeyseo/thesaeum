(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // ── 사용자 입력 ──
  var inputText = prompt("저장용 전체 이름을 입력하세요:\n(예: UV 명찰_70x25_골드_옷핀+집게_재제작_정근진_4_20250626-0000190)", "");
  if (!inputText) return;

  var matches = inputText.match(/_([0-9]{8}-[0-9]{7})$/);
  if (!matches || matches.length < 2) {
    alert("❌ 올바른 형식이 아닙니다.\n마지막에 '_20250626-0000190' 형식의 문자열이 필요합니다.");
    return;
  }

  var folderName = matches[1];     // 예: 20250626-0000190
  var baseName = inputText;        // 파일 이름 원형

  // ── 저장 폴더 생성 ──
  var baseFolder = new Folder("C:/work");
  if (!baseFolder.exists) baseFolder.create();

  var projFolder = new Folder(baseFolder.fsName + "/" + folderName);
  if (!projFolder.exists) projFolder.create();

  // ── 파일명 중복 체크 및 확정 ──
  var index = 0;
  var finalName = baseName;
  var aiFile = new File(projFolder.fsName + "/" + finalName + ".ai");

  while (aiFile.exists) {
    index++;
    finalName = baseName + "_" + index;
    aiFile = new File(projFolder.fsName + "/" + finalName + ".ai");
  }

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

  // alert("✅ 저장 완료:\n" + folderName + " 폴더\n→ " + finalName + ".ai & .jpg");

})(); 