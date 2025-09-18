// #target "Illustrator"

(function () {
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }

  var doc     = app.activeDocument;
  var fileStem = decodeURI(doc.name).replace(/\.ai$/i, "");
  var m = fileStem.match(/_([0-9]{8}-[0-9]{7}(?:-\d+)?)(?:\+([^+]+))?$/);

  if (m) {
    var reportPart = (m[2] || "").replace(/^\s+|\s+$/g, "");  // "ab" 또는 ""
    // 보고단위에 'a'가 포함되어 있으면 즉시 종료 (대소문자 무시)
    if (reportPart.toLowerCase().indexOf("b") !== -1) {
      return;
    }
  }




  var abCount = doc.artboards.length;

  /* ── 0. 맨 아래 레이어 확보 ── */
  var bottomLayer           = doc.layers[doc.layers.length - 1];
  var restoreLock  = bottomLayer.locked;
  var restoreHide  = !bottomLayer.visible;
  if (restoreLock) bottomLayer.locked = false;
  if (restoreHide) bottomLayer.visible = true;
  

  /* 흰색 객체 */
  var white = new RGBColor(); white.red = white.green = white.blue = 255;

  /* ── 1. 각 아트보드마다: 클리핑 패스만 흰색으로, 이동/추가 금지 ── */
  for (var ai = 0; ai < abCount; ai++) {
    var abRect = doc.artboards[ai].artboardRect; // [L,T,R,B]
    var abLeft = abRect[0], abTop = abRect[1],
        abW    = abRect[2] - abRect[0],
        abH    = abRect[1] - abRect[3];

    var tol = 1; // 허용 오차(포인트)
    function near(a,b){ return Math.abs(a-b) < tol; }

    // 문서 전체에서 "아트보드와 같은 크기/위치"의 **클리핑 패스**만 찾는다
    for (var j = 0; j < doc.pageItems.length; j++) {
      var it = doc.pageItems[j];
      if (it.locked || it.hidden) continue;

      // ✦ 핵심: 클리핑 패스만 대상
      if (it.typename !== "PathItem" || !it.clipping) continue;

      // 클리핑 패스는 geometricBounds 기준이 정확
      var gb = it.geometricBounds; // [L,T,R,B]
      var w  = gb[2] - gb[0], h = gb[1] - gb[3];

      var sameSize = near(w, abW) && near(h, abH);
      var samePos  = near(gb[0], abLeft) && near(gb[1], abTop);
      if (!sameSize || !samePos) continue;

      // 이동 금지! 필요 시 색만 흰색으로
      try {
        var needPaint = (!it.filled || it.fillColor.typename === "NoColor");
        if (!needPaint && it.fillColor.typename === "RGBColor") {
          var fc = it.fillColor;
          needPaint = (fc.red !== 255 || fc.green !== 255 || fc.blue !== 255);
        }
        if (needPaint) {
          it.filled = true;
          var white = new RGBColor(); white.red = white.green = white.blue = 255;
          it.fillColor = white;
        }
      } catch(_) {}
      break; // 이 아트보드 처리 끝
    }

    // 요구사항: 클리핑 패스를 못 찾으면 **아무 것도 생성하지 않음** (사각형 추가 X)
  }


  /* ── 2. 레이어 상태 복구 ── */
  if (restoreLock) bottomLayer.locked  = true;
  if (restoreHide) bottomLayer.visible = false;

  // alert("✔ 투명 배경을 흰색으로 변환했고, 이미 흰 배경은 그대로 두었습니다.");
})();
