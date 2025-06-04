(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;
  var count = 0;
  var cutLineLayers = [];

  // 이름에 "칼선"이 포함된 모든 레이어 찾아 숨김 처리
  for (var i = 0; i < doc.layers.length; i++) {
    var layer = doc.layers[i];
    if (layer.name.indexOf("칼선") !== -1) {
      layer.visible = false;
      cutLineLayers.push(layer);
    }
  }

  // stroke 변경 (칼선 레이어 제외)
  for (var j = 0; j < doc.pageItems.length; j++) {
    var item = doc.pageItems[j];

    if (item.locked || item.hidden) continue;

    // 해당 오브젝트가 "칼선" 레이어에 속해 있는지 확인
    var isInCutLineLayer = false;
    for (var k = 0; k < cutLineLayers.length; k++) {
      if (item.layer === cutLineLayers[k]) {
        isInCutLineLayer = true;
        break;
      }
    }

    if (isInCutLineLayer) continue;

    if (item.stroked) {
      item.strokeColor = new NoColor();
      count++;
    }
  }

  alert(
    `"칼선" 관련 레이어 ${cutLineLayers.length}개를 숨겼습니다.\n` +
    `그 외 ${count}개의 오브젝트 외곽선을 투명 처리했습니다.`
  );
})();
