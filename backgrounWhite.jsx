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

    var abLeft   = abRect[0];
    var abTop    = abRect[1];
    var abWidth  = abRect[2] - abRect[0];
    var abHeight = abRect[1] - abRect[3];

    var found = false;

    // 모든 객체 검사해서 이 아트보드 영역에 정확히 맞는 배경 찾기
    for (var j = 0; j < doc.pageItems.length; j++) {
      var item = doc.pageItems[j];
      if (item.locked || item.hidden) continue;
      if (!item.visibleBounds) continue;

      var b = item.visibleBounds; // [L, T, R, B]
      var w = b[2] - b[0];
      var h = b[1] - b[3];

      var isSameSize = Math.abs(w - abWidth) < 1 && Math.abs(h - abHeight) < 1;
      var isSamePos  = Math.abs(b[0] - abLeft) < 1 && Math.abs(b[1] - abTop) < 1;

      if (isSameSize && isSamePos && item.filled) {
        // 배경 후보 발견 → 색이 투명한 경우만 변경
        if (item.fillColor.typename === "NoColor") {
          item.fillColor = white;
          item.zOrder(ZOrderMethod.SENDTOBACK);
          found = true;
          break;
        } else {
          // 이미 흰색 또는 컬러일 수 있음 → 그냥 맨 뒤로만 보냄
          item.zOrder(ZOrderMethod.SENDTOBACK);
          found = true;
          break;
        }
      }
    }

    // 없으면 새로 만들어서 배경 추가
    if (!found) {
      var rect = doc.pathItems.rectangle(
        abTop, abLeft, abWidth, abHeight
      );
      rect.fillColor = white;
      rect.stroked = false;
      rect.zOrder(ZOrderMethod.SENDTOBACK);
    }
  }

})();
