(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  /* ───────────────── 사용자 입력 ───────────────── */
  var inputText = prompt(
    "저장용 전체 이름을 입력하세요:\n(예: UV 명찰_70x25_골드_옷핀+집게_재제작_정근진_4_20250626-0000190)",
    ""
  );
  if (!inputText) return;

  /* 날짜-번호(폴더명) 추출 */
  var mDate = inputText.match(/_([0-9]{8}-[0-9]{7})$/);
  if (!mDate) {
    alert("❌ '_날짜-번호' 형식을 찾을 수 없습니다.");
    return;
  }
  var folderName = mDate[1];

  /* 배경 이미지 키 추출(70x25_골드 등) */
  var mKey = inputText.match(/^.*?_([^_]+_[^_]+)/);
  if (!mKey) {
    alert("❌ 배경 이미지 키를 추출할 수 없습니다.");
    return;
  }
  var imageKey = mKey[1];
  var bgImagePath = new File("C:/work/img/" + imageKey + ".png");
  if (!bgImagePath.exists) {
    alert("❌ 배경 이미지가 없습니다:\n" + bgImagePath.fsName);
    return;
  }

  /* ───────────────── 폴더 준비 ───────────────── */
  var baseFolder = new Folder("C:/work");
  if (!baseFolder.exists) baseFolder.create();

  var projFolder = new Folder(baseFolder.fsName + "/" + folderName);
  if (!projFolder.exists) projFolder.create();

  var baseName = inputText;        // 파일 이름 원형

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

  /* ───────────────── 시안(대지 디자인) PNG(투명) 임시 추출 ───────────────── */
  var tempPng = new File(Folder.temp + "/__temp_fg__.png");
  app.executeMenuCommand("deselectall");
  doc.selectObjectsOnActiveArtboard();

  var pngOpts = new ExportOptionsPNG24();
  pngOpts.transparency      = true;
  pngOpts.antiAliasing      = true;
  pngOpts.artBoardClipping  = true;
  pngOpts.horizontalScale   = 300;
  pngOpts.verticalScale     = 300;
  doc.exportFile(tempPng, ExportType.PNG24, pngOpts);

  /* ───────────────── 새 문서에 배경 + 시안 배치 ───────────────── */
  var newDoc = app.documents.add(DocumentColorSpace.RGB, 2000, 1000);
  var bg = newDoc.placedItems.add(); bg.file = bgImagePath;
  var fg = newDoc.placedItems.add(); fg.file = tempPng;
  app.redraw();                              // 파일 크기 확정

  bg.position = [0, bg.height];
  var W = bg.width, H = bg.height;
  newDoc.artboards[0].artboardRect = [0, H, W, 0];

  /* 시안 확대(배경 너비의 60%) */
  var targetW  = W * 0.6;
  var scalePct = (targetW / fg.width) * 100;
  fg.resize(scalePct, scalePct);

  /* 시안 중앙 배치 */
  fg.position = [(W - fg.width) / 2, H - (H - fg.height) / 2];

  /* ───────────────── JPG 저장(600 dpi) ───────────────── */
  var jpgOpts = new ExportOptionsJPEG();
  jpgOpts.qualitySetting  = 100;
  jpgOpts.resolution      = 600;
  jpgOpts.horizontalScale = 100;
  jpgOpts.verticalScale   = 100;
  jpgOpts.antiAliasing    = true;
  jpgOpts.optimized       = true;
  jpgOpts.artBoardClipping = true;
  newDoc.exportFile(jpgFile, ExportType.JPEG, jpgOpts);

  newDoc.close(SaveOptions.DONOTSAVECHANGES);
  tempPng.remove();

  /* ───────────────── AI 저장 ───────────────── */
  var aiOpts = new IllustratorSaveOptions();
  aiOpts.compatibility  = Compatibility.ILLUSTRATOR17;
  aiOpts.flattenOutput  = OutputFlattening.PRESERVEAPPEARANCE;
  doc.saveAs(aiFile, aiOpts);

  alert("✅ 저장 완료:\n" +
        folderName + " 폴더\n→ " +
        finalName + ".ai / .jpg");
})();
