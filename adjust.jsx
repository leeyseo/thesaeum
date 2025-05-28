(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("열린 문서가 없습니다!"); return; }

  // ── 매개변수 ──────────────────────────────
  var strokeWeightText = 1;
  var strokeWeightAB   = 2;
  var minFontSize      = 6;
  var margin           = 5;
  var maxMove          = 20;
  var moveStep         = 1;

  function rgb(r, g, b) {
    var c = new RGBColor(); c.red = r; c.green = g; c.blue = b; return c;
  }
  var RED = rgb(255, 0, 0);
  var BLUE = rgb(0, 120, 255);

  // ── 아트보드 순회 ─────────────────────────
  for (var abIdx = 0; abIdx < doc.artboards.length; abIdx++) {
    doc.artboards.setActiveArtboardIndex(abIdx);
    var ab = doc.artboards[abIdx];
    var AB = ab.artboardRect;  // [L, T, R, B]

    // // ── 아트보드 경계 그리기 ────────────────
    // var abRect = doc.pathItems.rectangle(AB[1], AB[0], AB[2]-AB[0], AB[1]-AB[3]);
    // abRect.stroked = true; abRect.filled = false;
    // abRect.strokeColor = RED; abRect.strokeWidth = strokeWeightAB;

    // ── 텍스트 프레임 순회 ──────────────────
    for (var i = 0; i < doc.textFrames.length; i++) {
      var tf = doc.textFrames[i];
      if (tf.locked || tf.hidden || !tf.editable) continue;

      var g = tf.geometricBounds; // [L, T, R, B]

      // 현재 아트보드와 겹치는지 체크
      var intersects =
        g[2] >= AB[0] && g[0] <= AB[2] &&
        g[1] >= AB[3] && g[3] <= AB[1];

      if (!intersects) continue;

      var fontSize = tf.textRange.characterAttributes.size;

      var withinMargin =
        g[0] >= AB[0] + margin && g[2] <= AB[2] - margin &&
        g[1] <= AB[1] - margin && g[3] >= AB[3] + margin;

      if (withinMargin && !tf.overflows) continue;

      // ── 이동 시도 ──────────────────────────
      var dx = 0;
      var needRight = g[0] < AB[0] + margin;
      var needLeft  = g[2] > AB[2] - margin;

      if (needRight) dx = (AB[0] + margin) - g[0];
      else if (needLeft) dx = (AB[2] - margin) - g[2];

      dx = Math.max(-maxMove, Math.min(maxMove, dx));

      var moved = false;
      if (dx !== 0) {
        var step = (dx > 0) ? moveStep : -moveStep;
        for (var movedX = 0; Math.abs(movedX) <= Math.abs(dx); movedX += step) {
          tf.position = [tf.position[0] + step, tf.position[1]];
          g = tf.geometricBounds;

          var fits =
            g[0] >= AB[0] + margin && g[2] <= AB[2] - margin &&
            g[1] <= AB[1] - margin && g[3] >= AB[3] + margin;

          if (fits && !tf.overflows) {
            moved = true;
            break;
          }
        }
      }

      // ── 폰트 축소 시도 ─────────────────────
      if (!moved) {
        while (true) {
          g = tf.geometricBounds;
          var tooClose =
            g[0] < AB[0] + margin || g[2] > AB[2] - margin ||
            g[1] > AB[1] - margin || g[3] < AB[3] + margin;

          if (!tooClose || fontSize <= minFontSize) break;

          fontSize -= 0.5;
          tf.textRange.characterAttributes.size = fontSize;
        }
      }

      // // ── 상태 테두리 시각화 ─────────────────
      // g = tf.geometricBounds;
      // var out = g[0] < AB[0] || g[2] > AB[2] ||
      //           g[1] > AB[1] || g[3] < AB[3];

      // var strokeCol = (out || tf.overflows) ? BLUE : RED;

      // var w = g[2] - g[0];
      // var h = g[1] - g[3];
      // var box = doc.pathItems.rectangle(g[1], g[0], w, h);
      // box.stroked = true; box.filled = false;
      // box.strokeColor = strokeCol; box.strokeWidth = strokeWeightText;
    }
  }

})();
