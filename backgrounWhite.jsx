(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;
  var abCount = doc.artboards.length;
  var white = new RGBColor();
  white.red = 255; white.green = 255; white.blue = 255;

  for (var i = 0; i < abCount; i++) {
    var ab = doc.artboards[i];
    var abRect = ab.artboardRect; // [L, T, R, B]
    var abLeft = abRect[0];
    var abTop = abRect[1];
    var abWidth = abRect[2] - abRect[0];
    var abHeight = abRect[1] - abRect[3];

    var layerName = "Artboard_" + (i + 1);
    var layer;

    // 레이어 찾기 (없으면 건너뜀)
    try {
      layer = doc.layers.getByName(layerName);
    } catch (e) {
      continue;
    }

    layer.locked = false;
    layer.visible = true;

    var found = false;

    // 레이어 내 객체만 검사
    for (var j = 0; j < layer.pageItems.length; j++) {
      var item = layer.pageItems[j];

      // 해당 아이템도 해제 필요
      if (item.locked) item.locked = false;
      if (item.hidden) item.hidden = false;

      var b = item.visibleBounds; // [L, T, R, B]
      if (!b) continue;

      var w = b[2] - b[0];
      var h = b[1] - b[3];

      var isSameSize = Math.abs(w - abWidth) < 1;
      var isSamePos = Math.abs(b[0] - abLeft) < 1 && Math.abs(b[1] - abTop) < 1;

      if (isSameSize && isSamePos && item.filled) {
        if (item.fillColor.typename === "NoColor") {
          item.fillColor = white;
        }
        item.zOrder(ZOrderMethod.SENDTOBACK);
        found = true;
        break;
      }
    }

    // 배경이 없으면 새로 생성
    if (!found) {
      var rect = layer.pathItems.rectangle(abTop, abLeft, abWidth, abHeight);
      rect.fillColor = white;
      rect.stroked = false;
      rect.zOrder(ZOrderMethod.SENDTOBACK);
    }
  }
})();
