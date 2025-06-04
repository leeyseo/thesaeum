(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // ── 사용자로부터 파일명 입력 ──
  var fileName = prompt("저장할 파일명을 입력하세요 (확장자 제외):", "my_design");
  if (!fileName) {
    alert("파일명이 입력되지 않아 작업을 취소합니다.");
    return;
  }

  // ── 바탕화면/tmp 폴더 생성 ──
  var desktop = Folder.desktop;
  var tmpFolder = new Folder(desktop + "/tmp");
  if (!tmpFolder.exists) tmpFolder.create();

  // ── 문서 저장 (안정성 확보) ──
  if (doc.modified) doc.save();

  // ── 첫 번째 대지와 첫 번째 레이어 지정 ──
  var artboard = doc.artboards[0];
  var abBounds = artboard.artboardRect; // [L, T, R, B]
  var targetLayer = doc.layers[0];

  // ── 모든 선택 해제 후, 해당 대지 내 첫 레이어 아이템만 선택 ──
  app.executeMenuCommand("deselectall");

  for (var i = 0; i < targetLayer.pageItems.length; i++) {
    var item = targetLayer.pageItems[i];
    var b = item.geometricBounds; // [L, T, R, B]
    var intersects =
      b[2] >= abBounds[0] && b[0] <= abBounds[2] &&
      b[1] >= abBounds[3] && b[3] <= abBounds[1];
    if (intersects) item.selected = true;
  }

  // ── 저장 경로 설정 ──
  var jpgFile = new File(tmpFolder + "/" + fileName + ".jpg");
  var aiFile = new File(tmpFolder + "/" + fileName + ".ai");

  // ── 고해상도 JPG 저장 옵션 ──
  var exportOptions = new ExportOptionsJPEG();
  exportOptions.antiAliasing = true;
  exportOptions.qualitySetting = 100;      // 최고 품질
  exportOptions.horizontalScale = 300;     // 3배 크기 (고해상도)
  exportOptions.verticalScale = 300;
  exportOptions.resolution = 300;          // 300 dpi
  exportOptions.optimized = true;
  exportOptions.artBoardClipping = true;
  exportOptions.flattenOutput = OutputFlattening.PRESERVEAPPEARANCE;

  // ── JPG 저장 ──
  doc.exportFile(jpgFile, ExportType.JPEG, exportOptions);

  // ── AI 저장 옵션 ──
  var saveOptions = new IllustratorSaveOptions();
  saveOptions.compatibility = Compatibility.ILLUSTRATOR17;
  saveOptions.flattenOutput = OutputFlattening.PRESERVEAPPEARANCE;
  doc.saveAs(aiFile, saveOptions);

  alert("파일이 성공적으로 저장되었습니다.\n위치: " + tmpFolder.fsName);
})();
