(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  var baseName = prompt("저장할 기준 파일명을 입력하세요:\n(예: 엣지 명찰_70x20_..._20250627-0000182)", "");
  if (!baseName) return;

  var rangeInput = prompt("아트보드 범위를 입력하세요 (예: 1-30 또는 30)", "");
  if (!rangeInput) return;

  var match = baseName.match(/_([0-9]{8}-[0-9]{7})$/);
  if (!match) {
    alert("❌ 파일명에 '_YYYYMMDD-#######' 형식이 없습니다.");
    return;
  }
  var folderId = match[1];

  var startIdx = 0;
  var endIdx = 0;
  if (/^\d+$/.test(rangeInput)) {
    endIdx = parseInt(rangeInput, 10) - 1;
  } else if (/^(\d+)-(\d+)$/.test(rangeInput)) {
    var parts = rangeInput.split("-");
    startIdx = parseInt(parts[0], 10) - 1;
    endIdx = parseInt(parts[1], 10) - 1;
  } else {
    alert("❌ 범위는 '1-30' 또는 '30' 형식으로 입력해주세요.");
    return;
  }

  var totalAB = doc.artboards.length;
  if (endIdx >= totalAB) endIdx = totalAB - 1;

  // 기존 레이어 상태 저장 및 전부 활성화
  var originalLayerStates = [];
  for (var i = 0; i < doc.layers.length; i++) {
    var lay = doc.layers[i];
    originalLayerStates.push({ name: lay.name, visible: lay.visible });
    lay.locked = false;
    lay.visible = true;
  }

  // 병합 레이어 생성
  var mergeLayer;
  try {
    mergeLayer = doc.layers.getByName("TEMP_EXPORT_LAYER");
    mergeLayer.visible = true;
    mergeLayer.locked = false;
    while (mergeLayer.pageItems.length > 0) mergeLayer.pageItems[0].remove();
  } catch (e) {
    mergeLayer = doc.layers.add();
    mergeLayer.name = "TEMP_EXPORT_LAYER";
  }

  var abRect = doc.artboards[0].artboardRect;
  var abW = abRect[2] - abRect[0];
  var abH = abRect[1] - abRect[3];
  var GAP = 0;
  var MAX_ROWS = 10;

  var count = 0;
  for (var i = startIdx; i <= endIdx; i++) {
    doc.artboards.setActiveArtboardIndex(i);
    doc.selectObjectsOnActiveArtboard();
    app.executeMenuCommand("copy");

    doc.activeLayer = mergeLayer;
    doc.artboards.setActiveArtboardIndex(0);
    app.executeMenuCommand("pasteInPlace");

    var pasted = doc.selection;

    // 배경 투명화
    for (var j = 0; j < pasted.length; j++) {
      var it = pasted[j];
      if (it.typename === "PathItem" && it.filled) {
        var gb = it.geometricBounds;
        var w = gb[2] - gb[0];
        var h = gb[1] - gb[3];
        if (Math.abs(w - abW) <= 4 && Math.abs(h - abH) <= 4) {
          it.fillColor = new NoColor();
        }
      }
    }

    var group = doc.groupItems.add();
    for (var j = 0; j < pasted.length; j++) pasted[j].moveToBeginning(group);

    var pairIdx = Math.floor(count / 2);
    var row = pairIdx % MAX_ROWS;
    var col = Math.floor(pairIdx / MAX_ROWS) * 2 + (count % 2); // 0,1 / 2,3 / ...

    group.left = col * (abW + GAP);
    group.top = -row * (abH + GAP);

    count++;
  }

  // JPG 내보내기용 아트보드 생성
  var totalCols = Math.ceil(count / MAX_ROWS);
  var exportW = totalCols * 2 * abW;
  var exportH = MAX_ROWS * abH;
  var exportAB = doc.artboards.add([0, 0, exportW, -exportH]);
  var exportABIndex = doc.artboards.length - 1;
  doc.artboards.setActiveArtboardIndex(exportABIndex);

  // 저장
  var outFolder = new Folder("C:/work/" + folderId + "/jpg");
  if (!outFolder.exists) outFolder.create();

  var label = (startIdx + 1) + "-" + (endIdx + 1);
  var fileName = baseName + "_전체시안_" + label + ".jpg";
  var saveFile = new File(outFolder.fsName + "/" + fileName);

  var jpgOpts = new ExportOptionsJPEG();
  jpgOpts.qualitySetting = 100;
  jpgOpts.artBoardClipping = true;
  jpgOpts.horizontalScale = 100;
  jpgOpts.verticalScale = 100;

  doc.exportFile(saveFile, ExportType.JPEG, jpgOpts);

  doc.artboards.remove(exportABIndex);

  for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = false;
  for (var i = 0; i < originalLayerStates.length; i++) {
    var s = originalLayerStates[i];
    try { doc.layers.getByName(s.name).visible = s.visible; } catch (e) {}
  }

  alert("✅ JPG 저장 완료!\n" + saveFile.fsName);
})();
