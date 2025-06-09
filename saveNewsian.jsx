(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // ── 1. 사용자 파일명 입력 ──
  var fileName = prompt("저장할 파일명을 입력하세요 (확장자 제외):", "my_design");
  if (!fileName) {
    alert("파일명이 입력되지 않아 작업을 취소합니다.");
    return;
  }

  // ── 2. tmp 폴더 생성 ──
  var tmpFolder = new Folder(Folder.desktop + "/tmp");
  if (!tmpFolder.exists) tmpFolder.create();

  // ── 3. 문서 저장 ──
  if (doc.modified) doc.save();

  // ── 4. 첫 번째 대지 정보 ──
  var ab = doc.artboards[0];
  var abBounds = ab.artboardRect; // [L, T, R, B]

  // ── 5. 스크립트 시작 시점의 보이는 레이어 중 가장 위의 것 찾기 ──
  var targetLayer = null;
  for (var i = 0; i < doc.layers.length; i++) {
    if (doc.layers[i].visible) {
      targetLayer = doc.layers[i];
      break;
    }
  }

  if (!targetLayer) {
    alert("표시된 레이어가 없습니다. JPG 내보내기를 취소합니다.");
    return;
  }

  // ── 6. JPG를 위한 선택 작업 ──
  app.executeMenuCommand("deselectall");

  // 레이어 상태 백업 및 잠금 해제
  var layerState = {
    locked: targetLayer.locked,
    visible: targetLayer.visible
  };
  targetLayer.locked = false;
  targetLayer.visible = true;

  var selectedItems = [];

  for (var j = 0; j < targetLayer.pageItems.length; j++) {
    var item = targetLayer.pageItems[j];

    var itemState = {
      item: item,
      locked: item.locked,
      hidden: item.hidden
    };

    item.locked = false;
    item.hidden = false;

    var b = item.geometricBounds; // [L, T, R, B]
    var intersects =
      b[2] >= abBounds[0] && b[0] <= abBounds[2] &&
      b[1] >= abBounds[3] && b[3] <= abBounds[1];

    if (intersects) {
      item.selected = true;
      selectedItems.push(itemState);
    } else {
      item.locked = itemState.locked;
      item.hidden = itemState.hidden;
    }
  }

  // ── 7. JPG 저장 ──
  var jpgFile = new File(tmpFolder + "/" + fileName + ".jpg");

  var exportOptions = new ExportOptionsJPEG();
  exportOptions.antiAliasing = true;
  exportOptions.qualitySetting = 100;
  exportOptions.horizontalScale = 300;
  exportOptions.verticalScale = 300;
  exportOptions.resolution = 300;
  exportOptions.optimized = true;
  exportOptions.artBoardClipping = true;
  exportOptions.flattenOutput = OutputFlattening.PRESERVEAPPEARANCE;

  doc.exportFile(jpgFile, ExportType.JPEG, exportOptions);

  // ── 8. 선택 오브젝트 상태 복원 ──
  for (var s = 0; s < selectedItems.length; s++) {
    var ent = selectedItems[s];
    ent.item.locked = ent.locked;
    ent.item.hidden = ent.hidden;
  }

  // ── 9. 레이어 상태 복원 ──
  targetLayer.locked = layerState.locked;
  targetLayer.visible = layerState.visible;

  // ── 10. AI 전체 저장 ──
  var aiFile = new File(tmpFolder + "/" + fileName + ".ai");

  var saveOptions = new IllustratorSaveOptions();
  saveOptions.compatibility = Compatibility.ILLUSTRATOR17;
  saveOptions.flattenOutput = OutputFlattening.PRESERVEAPPEARANCE;

  doc.saveAs(aiFile, saveOptions);

  app.executeMenuCommand("deselectall");


})();
