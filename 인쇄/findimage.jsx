/*  #target "Illustrator"   -- ES3 호환  */
/*  보이는 레이어에 이미지(PlacedItem·RasterItem) 있으면 한 줄 알림  */

(function () {
  if (app.documents.length === 0) return;          // 문서 없음 → 종료
  var doc = app.activeDocument;

  // 레이어(및 하위 레이어) 안에 이미지가 있는지 재귀 탐색
  function layerHasImage(lyr) {
    var items = lyr.pageItems;
    for (var i = 0; i < items.length; i++) {
      var t = items[i].typename;
      if (t === "PlacedItem" || t === "RasterItem") return true;
    }
    for (var j = 0; j < lyr.layers.length; j++) {
      if (layerHasImage(lyr.layers[j])) return true;
    }
    return false;
  }

  // 보이는 레이어 중 하나라도 이미지가 있으면 알림
  for (var k = 0; k < doc.layers.length; k++) {
    var L = doc.layers[k];
    if (L.visible && layerHasImage(L)) {
      alert("이미지가 존재합니다.");
      return;
    }
  }
  /* 이미지가 없으면 조용히 종료 */
})();
