/*  #target "Illustrator"  -- ES3 호환  */
/*  보이는 레이어에 텍스트 존재 여부만 확인 후, 있으면 한 줄 알림  */

(function () {
  if (app.documents.length === 0) return;          // 문서 없음 → 종료
  var doc = app.activeDocument;

  // 레이어(및 하위 레이어) 안에 TextFrame 존재하는지 재귀 탐색
  function layerHasText(lyr) {
    var items = lyr.pageItems;
    for (var i = 0; i < items.length; i++) {
      if (items[i].typename === "TextFrame") return true;
    }
    for (var j = 0; j < lyr.layers.length; j++) {
      if (layerHasText(lyr.layers[j])) return true;
    }
    return false;
  }

  // 보이는 레이어 중 하나라도 TextFrame이 있으면 알림
  for (var k = 0; k < doc.layers.length; k++) {
    var L = doc.layers[k];
    if (L.visible && layerHasText(L)) {
      alert("텍스트가 존재합니다.");
      return;
    }
  }
  /* 아무 레이어에도 텍스트가 없으면 조용히 종료 */
})();
