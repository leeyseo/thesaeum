(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("열린 문서가 없습니다!"); return; }

  // ── 매개변수 ──────────────────────────────
  var strokeWeightText = 1;   // 텍스트 테두리 선두께
  var strokeWeightAB   = 2;   // 아트보드 테두리 선두께
  var minFontSize      = 6;   // 폰트 최소 pt
  var margin           = 7;  // 대지-텍스트 최소 여백
  var maxMove          = 20;  // 최대 이동거리
  var moveStep         = 1;   // 이동 보폭

  // ── 색상 헬퍼 ─────────────────────────────
  function rgb(r, g, b){ var c=new RGBColor(); c.red=r; c.green=g; c.blue=b; return c;}
  var RED  = rgb(255,0,0);
  var BLUE = rgb(0,120,255);

  // ── 아트보드 정보 ─────────────────────────
  var ab   = doc.artboards[doc.artboards.getActiveArtboardIndex()];
  var AB   = ab.artboardRect;       // [left, top, right, bottom]

  // (참고) Illustrator Y축은 위로 갈수록 값이 큽니다.

  // ── 아트보드 테두리 그리기 ────────────────
  var abRect = doc.pathItems.rectangle(AB[1], AB[0], AB[2]-AB[0], AB[1]-AB[3]);
  abRect.stroked = true;  abRect.filled = false;
  abRect.strokeColor = RED; abRect.strokeWidth = strokeWeightAB;

  // ── 텍스트 프레임 루프 ────────────────────
  for (var i=0; i<doc.textFrames.length; i++){
    var tf = doc.textFrames[i];
    if (tf.locked || tf.hidden || !tf.editable) continue;

    var fontSize = tf.textRange.characterAttributes.size;
    var g        = tf.geometricBounds;           // [L, T, R, B]

    // 이미 여백을 만족 + 오버플로 없으면 skip
    var withinMargin =
        g[0] >= AB[0]+margin && g[2] <= AB[2]-margin &&
        g[1] <= AB[1]-margin && g[3] >= AB[3]+margin;
    if (withinMargin && !tf.overflows) continue;

    /*────────────────────────────────────────
      1) 가로 방향 이동으로 먼저 해결 시도
    ────────────────────────────────────────*/
    var needRight = (g[0] < AB[0]+margin);        // 왼쪽이 모자라면 → 오른쪽(+)
    var needLeft  = (g[2] > AB[2]-margin);        // 오른쪽이 넘치면 → 왼쪽(-)

    var moved = false;
    if (needRight || needLeft){
      // 목표 이동량 계산
      var dx = 0;
      if (needRight) dx = (AB[0]+margin) - g[0];        // 양수
      else           dx = (AB[2]-margin) - g[2];        // 음수

      // clamp to ±maxMove
      if (dx >  maxMove) dx =  maxMove;
      if (dx < -maxMove) dx = -maxMove;

      // 보폭 단위로 이동하며 체크
      var step = (dx > 0) ? moveStep : -moveStep;
      for (var movedX = 0; Math.abs(movedX) <= Math.abs(dx); movedX += step){
        tf.position = [tf.position[0] + step, tf.position[1]];
        g = tf.geometricBounds;

        var fits =
          g[0] >= AB[0]+margin && g[2] <= AB[2]-margin &&
          g[1] <= AB[1]-margin && g[3] >= AB[3]+margin;

        if (fits && !tf.overflows){ moved = true; break; }
      }
    }

    /*────────────────────────────────────────
      2) 이동으로도 안 되면 폰트 축소
    ────────────────────────────────────────*/
    if (!moved){
      while (true){
        g = tf.geometricBounds;
        var tooClose =
            g[0] < AB[0]+margin || g[2] > AB[2]-margin ||
            g[1] > AB[1]-margin || g[3] < AB[3]+margin;

        if (!tooClose || fontSize <= minFontSize) break;

        fontSize -= 0.5;
        tf.textRange.characterAttributes.size = fontSize;
      }
    }

    /*────────────────────────────────────────
      3) 상태 테두리 그리기
    ────────────────────────────────────────*/
    g = tf.geometricBounds;
    var out =  g[0] < AB[0] || g[2] > AB[2] ||
               g[1] > AB[1] || g[3] < AB[3];

    var strokeCol = (out || tf.overflows) ? BLUE : RED;

    var w = g[2]-g[0];                // right - left
    var h = g[1]-g[3];                // top - bottom (양수)
    var box = doc.pathItems.rectangle(g[1], g[0], w, h);
    box.stroked = true; box.filled = false;
    box.strokeColor = strokeCol; box.strokeWidth = strokeWeightText;
  }

  alert("완료! 방향별 이동 → 축소 로직으로 대지 여백 확보했습니다.");
})();
