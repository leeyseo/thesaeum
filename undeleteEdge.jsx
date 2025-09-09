(function () {
  /* ───── 0) 문서 검사 ───── */
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc   = app.activeDocument;
  var fileStem = decodeURI(doc.name).replace(/\.ai$/i, "");
  var m = fileStem.match(/_([0-9]{8}-[0-9]{7}(?:-\d+)?)(?:\+([^+]+))?$/);

  if (m) {
    var numPart    = m[1];  // "20250812-0000765-01"
    var reportPart = (m[2] || "").replace(/^\s+|\s+$/g, "");
    // 보고단위에 'b'가 포함되어 있으면 즉시 종료 (대소문자 무시)
    if (reportPart.toLowerCase().indexOf("b") !== -1) {
      return;
    }
  }

  /* ───── 1) 톨러런스 & 아트보드 사각형 캐시 ───── */
  // 배경 판정: 아트보드와 거의 동일(폭/높이/모서리 위치)
  var RAT_TOL = 0.02; // 비율 허용치(±2%)
  var ABS_TOL = 4;    // 절대 허용치(±4 pt)

  var abRects = [];   // [ [L,T,R,B], ... ]
  for (var ai = 0; ai < doc.artboards.length; ai++) {
    abRects.push(doc.artboards[ai].artboardRect);
  }

  function nearVal(val, target) {
    // target이 0에 가깝지 않게 보호
    var t = Math.abs(target);
    var band = Math.max(t * RAT_TOL, ABS_TOL);
    return Math.abs(val - target) <= band;
  }

  function isNearAnyArtboardRect(gb) {
    // gb: [L,T,R,B]
    var w = gb[2] - gb[0];
    var h = gb[1] - gb[3];

    for (var i = 0; i < abRects.length; i++) {
      var r  = abRects[i];
      var aw = r[2] - r[0];
      var ah = r[1] - r[3];

      // 폭/높이 유사 + 4모서리도 거의 동일해야 "배경"으로 인정
      if (nearVal(w, aw) && nearVal(h, ah) &&
          nearVal(gb[0], r[0]) && nearVal(gb[1], r[1]) &&
          nearVal(gb[2], r[2]) && nearVal(gb[3], r[3])) {
        return true;
      }
    }
    return false;
  }

  /* ───── 2) 색/카운트 ───── */
  var black = new RGBColor();            // 검정 stroke
  black.red = black.green = black.blue = 0;

  var count = 0;

  /* ──  유틸: ‘백색’ 판정  ── */
  function isWhiteColor(col) {
    if (!col || col.typename === "NoColor") return false;

    switch (col.typename) {
      case "RGBColor":
        return col.red   === 255 && col.green === 255 && col.blue  === 255;
      case "CMYKColor":
        return col.cyan  === 0   && col.magenta === 0 &&
               col.yellow === 0  && col.black  === 0;
      case "GrayColor":
        // 환경에 따라 0 또는 100을 화이트로 쓰는 경우가 있어 양쪽 허용
        return col.gray === 0 || col.gray === 100;
      default:
        return false;   // SpotColor, PatternColor 등은 무시
    }
  }

  /* ── 3) 순회 ── */
  function traverse(layer) {
    if (!layer.visible) return;

    // ① 레이어 내 오브젝트
    for (var i = 0; i < layer.pageItems.length; i++) {
      process(layer.pageItems[i]);
    }
    // ② 하위 레이어
    for (var j = 0; j < layer.layers.length; j++) {
      traverse(layer.layers[j]);
    }
  }

  function process(item) {
    if (!item || item.locked || item.hidden) return;
    if (item.layer && item.layer.name.indexOf("칼선") !== -1) return; // ‘칼선’ 레이어 제외

    // 그룹/복합패스 내부 재귀
    if (item.typename === "GroupItem") {
      for (var g = 0; g < item.pageItems.length; g++) process(item.pageItems[g]);
      return;
    }
    if (item.typename === "CompoundPathItem") {
      for (var c = 0; c < item.pathItems.length; c++) process(item.pathItems[c]);
      return;
    }

    // ── 핵심 필터: "배경(아트보드와 거의 동일)"인 '흰색 채움'만 외곽선 생성
    try {
      if (item.typename === "PathItem" && item.filled && isWhiteColor(item.fillColor)) {
        var gb = item.geometricBounds; // [L,T,R,B]
        if (isNearAnyArtboardRect(gb)) {
          item.stroked     = true;
          item.strokeColor = black;
          count++;
        }
      }
    } catch (e) {
      // 텍스트 등 fill/stroke 속성 없는 경우는 무시
    }
  }

  // ── 실행 ──
  for (var l = 0; l < doc.layers.length; l++) traverse(doc.layers[l]);

  // 필요하면 토스트:
  // alert("배경 외곽선(검정) 생성: " + count + "개");

})();
