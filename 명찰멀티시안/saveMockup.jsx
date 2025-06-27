(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // ───────── 사용자 입력 ─────────
  var inputText = prompt("저장용 전체 이름을 입력하세요:\n(예: 엣지 명찰_70x20_골드_자석3구_김은영_15_20250627-0000182)", "");
  if (!inputText) return;

  // 🔄 공백을 하이픈으로 치환
  var baseInput = inputText.replace(/ /g, "-");

  // ───────── 날짜-번호 추출 ─────────
  var m = baseInput.match(/_([0-9]{8}-[0-9]{7})$/);
  if (!m) {
    alert("❌ '_날짜-번호' 형식을 찾을 수 없습니다.");
    return;
  }
  var folderName = m[1];

  // ───────── 배경 키 추출 ─────────
  var keyMatch = baseInput.match(/^.*?_([^_]+_[^_]+)/);
  if (!keyMatch) {
    alert("❌ 배경 이미지 키를 추출할 수 없습니다.");
    return;
  }
  var imageKey = keyMatch[1];
  var bgImagePath = new File("C:/work/img/" + imageKey + ".png");
  if (!bgImagePath.exists) {
    alert("❌ 배경 이미지가 없습니다:\n" + bgImagePath.fsName);
    return;
  }

  // ───────── 저장 폴더 준비 ─────────
  var jpgFolder = new Folder("C:/work/" + folderName + "/jpg");
  if (!jpgFolder.exists) jpgFolder.create();

  // ───────── 시안전송용 파일명 중복 체크 ─────────
  var siAnBase = baseInput + "_시안전송용";
  var siAnFile = new File(jpgFolder.fsName + "/" + siAnBase + ".jpg");
  var siAnIndex = 0;
  while (siAnFile.exists) {
    siAnIndex++;
    siAnFile = new File(jpgFolder.fsName + "/" + siAnBase + "_" + siAnIndex + ".jpg");
  }

  // ───────── 확정형 파일명 중복 체크 ─────────
  var hwakBase = baseInput + "_확정형";
  var hwakFile = new File(jpgFolder.fsName + "/" + hwakBase + ".jpg");
  var hwakIndex = 0;
  while (hwakFile.exists) {
    hwakIndex++;
    hwakFile = new File(jpgFolder.fsName + "/" + hwakBase + "_" + hwakIndex + ".jpg");
  }

  // ───────── 첫 번째 아트보드 배경 제거 후 PNG 추출 ─────────
  doc.artboards.setActiveArtboardIndex(0);
  app.executeMenuCommand("deselectall");
  doc.selectObjectsOnActiveArtboard();

  var abRect = doc.artboards[0].artboardRect;
  var abW = abRect[2] - abRect[0];
  var abH = abRect[1] - abRect[3];
  var selection = doc.selection;

  for (var i = 0; i < selection.length; i++) {
    var it = selection[i];
    if (it.typename === "PathItem" && it.filled) {
      var gb = it.geometricBounds;
      var w = gb[2] - gb[0], h = gb[1] - gb[3];
      var nearW = Math.abs(w - abW) <= Math.max(10, abW * 0.02);
      var nearH = Math.abs(h - abH) <= Math.max(10, abH * 0.02);
      if (nearW && nearH) it.fillColor = new NoColor();
    }
  }

  var tempPng = new File(Folder.temp + "/__temp_fg__.png");
  var pngOpts = new ExportOptionsPNG24();
  pngOpts.transparency      = true;
  pngOpts.antiAliasing      = true;
  pngOpts.artBoardClipping  = true;
  pngOpts.horizontalScale   = 300;
  pngOpts.verticalScale     = 300;
  doc.exportFile(tempPng, ExportType.PNG24, pngOpts);

  // ───────── 시안전송용 JPG (합성본) ─────────
  var newDoc = app.documents.add(DocumentColorSpace.RGB, 2000, 1000);
  var bg = newDoc.placedItems.add(); bg.file = bgImagePath;
  var fg = newDoc.placedItems.add(); fg.file = tempPng;
  app.redraw();

  bg.position = [0, bg.height];
  var W = bg.width, H = bg.height;
  newDoc.artboards[0].artboardRect = [0, H, W, 0];

  var targetW = W * 0.6;
  var scalePct = (targetW / fg.width) * 100;
  fg.resize(scalePct, scalePct);
  fg.position = [(W - fg.width) / 2, H - (H - fg.height) / 2];

  var jpgOpts = new ExportOptionsJPEG();
  jpgOpts.qualitySetting    = 100;
  jpgOpts.resolution        = 600;
  jpgOpts.horizontalScale   = 100;
  jpgOpts.verticalScale     = 100;
  jpgOpts.antiAliasing      = true;
  jpgOpts.optimized         = true;
  jpgOpts.artBoardClipping  = true;

  newDoc.exportFile(siAnFile, ExportType.JPEG, jpgOpts);
  newDoc.close(SaveOptions.DONOTSAVECHANGES);
  tempPng.remove();

  // ───────── 확정형 JPG (원본 아트보드 그대로) ─────────
  doc.artboards.setActiveArtboardIndex(0);
  app.executeMenuCommand("deselectall");
  doc.selectObjectsOnActiveArtboard();
  doc.exportFile(hwakFile, ExportType.JPEG, jpgOpts);

  // ───────── 완료 알림 ─────────
  alert("✅ JPG 2종 저장 완료:\n" +
        "☑ 시안전송용: " + decodeURIComponent(siAnFile.name) + "\n" +
        "☑ 확정형: " + decodeURIComponent(hwakFile.name));
})();
