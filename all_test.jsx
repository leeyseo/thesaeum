(function () {
  var doc = app.activeDocument;
  if (!doc) {
    alert("열린 문서가 없습니다!"); return;
  }

  // ── 매개변수 ─
  var strokeWeightText = 1;
  var strokeWeightAB = 2;
  var minFontSize = 6;
  var margin = 7;
  var maxMove = 20;
  var moveStep = 1;

  function rgb(r, g, b) {
    var c = new RGBColor();
    c.red = r; c.green = g; c.blue = b;
    return c;
  }

  var RED = rgb(255, 0, 0);
  var BLUE = rgb(0, 120, 255);

  // ── 모든 아트보드 순회 ──
  for (var abIdx = 0; abIdx < doc.artboards.length; abIdx++) {
    var ab = doc.artboards[abIdx];
    var AB = ab.artboardRect; // [L, T, R, B]

    // 아트보드 테두리 그리기
    var abW = AB[2] - AB[0];
    var abH = AB[1] - AB[3];
    var abRect = doc.pathItems.rectangle(AB[1], AB[0], abW, abH);
    abRect.stroked = true;
    abRect.filled = false;
    abRect.strokeColor = RED;
    abRect.strokeWidth = strokeWeightAB;

    // 텍스트 프레임 순회
    for (var i = 0; i < doc.textFrames.length; i++) {
      var tf = doc.textFrames[i];
      if (tf.locked || tf.hidden || !tf.editable) continue;

      var g = tf.geometricBounds; // [L, T, R, B]

      // 텍스트가 이 아트보드 위에 있는가?
      var inThisAB = g[0] <= AB[2] && g[2] >= AB[0] &&
                     g[1] >= AB[3] && g[3] <= AB[1];
      if (!inThisAB) continue;

      var fontSize = tf.textRange.characterAttributes.size;

      var withinMargin =
        g[0] >= AB[0] + margin && g[2] <= AB[2] - margin &&
        g[1] <= AB[1] - margin && g[3] >= AB[3] + margin;
      if (withinMargin && !tf.overflows) continue;

      // 1) 좌/우 이동으로 여백 확보 시도
      var needRight = (g[0] < AB[0] + margin);
      var needLeft = (g[2] > AB[2] - margin);

      var moved = false;
      if (needRight || needLeft) {
        var dx = 0;
        if (needRight) dx = (AB[0] + margin) - g[0];
        else dx = (AB[2] - margin) - g[2];

        if (dx > maxMove) dx = maxMove;
        if (dx < -maxMove) dx = -maxMove;

        var step = (dx > 0) ? moveStep : -moveStep;
        for (var movedX = 0; Math.abs(movedX) <= Math.abs(dx); movedX += step) {
          tf.position = [tf.position[0] + step, tf.position[1]];
          g = tf.geometricBounds;

          var fits =
            g[0] >= AB[0] + margin && g[2] <= AB[2] - margin &&
            g[1] <= AB[1] - margin && g[3] >= AB[3] + margin;

          if (fits && !tf.overflows) { moved = true; break; }
        }
      }

      // 2) 폰트 축소
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

      // 3) 상태 테두리 그리기
      g = tf.geometricBounds;
      var out =
        g[0] < AB[0] || g[2] > AB[2] ||
        g[1] > AB[1] || g[3] < AB[3];

      var strokeCol = (out || tf.overflows) ? BLUE : RED;

      var w = g[2] - g[0];
      var h = g[1] - g[3];
      var box = doc.pathItems.rectangle(g[1], g[0], w, h);
      box.stroked = true;
      box.filled = false;
      box.strokeColor = strokeCol;
      box.strokeWidth = strokeWeightText;
    }
  }

  alert("완료! 모든 아트보드에 대해 정렬/축소 작업이 끝났습니다.");
})();
