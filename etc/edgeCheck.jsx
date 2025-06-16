/**
 * Illustrator ExtendScript (JSX)
 * ──────────────────────────────
 * • 빨간 선  = 대지(아트보드) 테두리
 * • 빨간 선  = 텍스트가 대지 안 & 오버플로 없음
 * • 파란 선  = 텍스트가 대지 밖 OR 오버플로 발생
 * (모든 사각형은 채우기 없음)
 */
(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("열린 문서가 없습니다!"); return; }

  // ── 기본 설정 ───────────────────────────────────
  var strokeWeightText = 1;  // 텍스트-프레임 선 두께
  var strokeWeightAB   = 2;  // 아트보드 선 두께 (굵게)

  // 색상 객체
  function rgb(r, g, b) {
    var c = new RGBColor();
    c.red = r; c.green = g; c.blue = b;
    return c;
  }
  var RED  = rgb(255,   0,   0);
  var BLUE = rgb(  0, 120, 255);

  // ── (1) 활성 아트보드 테두리 그리기 ───────────────
  var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
  var AB = ab.artboardRect;                // [left, top, right, bottom]
//   alert("AB = " + AB.join(", "));

  var abWidth  = AB[2] - AB[0];
  var abHeight = AB[1] - AB[3];

  var abRect = doc.pathItems.rectangle(
    AB[1],            // top
    AB[0],            // left
    abWidth,          // width
    abHeight          // height
  );
  abRect.stroked     = true;
  abRect.filled      = false;
  abRect.strokeColor = RED;                // ← 빨간색
  abRect.strokeWidth = strokeWeightAB;
  abRect.name        = "__artboard_border";

  // ── (2) 텍스트-프레임 테두리 표시 ─────────────────
  for (var i = 0; i < doc.textFrames.length; i++) {
    var tf = doc.textFrames[i];
    if (tf.locked || tf.hidden || !tf.editable) continue;

    var g = tf.geometricBounds;            // [left, top, right, bottom]
    // alert("g = " + g.join(", "));

    // 대지 밖 여부
    var out =
      g[0] < AB[0] || g[2] > AB[2] || g[1] > AB[1] || g[3] < AB[3];

    var useBlue  = out || tf.overflows;
    var strokeCol = useBlue ? BLUE : RED;

    var w = Math.abs(g[2] - g[0]);
    var h = Math.abs(g[1] - g[3]);   
    var topY = Math.max(g[1], g[3]);
    var box = doc.pathItems.rectangle(topY, g[0], w, h);

    box.stroked     = true;
    box.filled      = false;
    box.strokeColor = strokeCol;
    box.strokeWidth = strokeWeightText;
    box.name        = "__textbox_border";
  }

  alert("완료! 빨간색(대지·정상 텍스트) / 파란색(밖·오버플로) 테두리를 그렸습니다.");
})();
