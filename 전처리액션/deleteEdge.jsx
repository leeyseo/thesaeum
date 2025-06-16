(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다."); return;
  }

  var doc = app.activeDocument;
  var count = 0;
  var noStroke = new NoColor();

  /* 재귀 처리 ─ 레이어 내부까지 모두 순회 */
  function processLayer(lay) {

    /* 1) “칼선” 레이어이면 건너뜀 */
    if (lay.name.indexOf("칼선") !== -1) { return; }

    /* 2) 일시적으로 레이어 표시 */
    var wasHidden = !lay.visible;
    if (wasHidden) lay.visible = true;

    /* 3) 이 레이어의 오브젝트 처리 */
    for (var i = 0; i < lay.pageItems.length; i++) {
      var it = lay.pageItems[i];
      try {
        if (it.stroked) { it.strokeColor = noStroke; count++; }
      } catch(e) {}        // 텍스트‧이미지 등 stroked 없는 경우 무시
    }

    /* 4) 하위 레이어 재귀 호출 */
    for (var j = 0; j < lay.layers.length; j++) {
      processLayer(lay.layers[j]);
    }

    /* 5) 원래 숨겨져 있었으면 다시 숨김 */
    if (wasHidden) lay.visible = false;
  }

  /* 최상위 레이어부터 실행 */
  for (var k = 0; k < doc.layers.length; k++) {
    processLayer(doc.layers[k]);
  }

  // alert(count + "개의 오브젝트 외곽선을 투명색으로 변환 완료!");
})();
