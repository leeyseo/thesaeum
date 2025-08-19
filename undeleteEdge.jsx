
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
    var numPart    = m[1];                     // "20250812-0000765-01"
    var reportPart = (m[2] || "").replace(/^\s+|\s+$/g, "");  // "ab" 또는 ""
    // 보고단위에 'a'가 포함되어 있으면 즉시 종료 (대소문자 무시)
    if (reportPart.toLowerCase().indexOf("b") !== -1) {
      return;
    }
  }


  
  var black = new RGBColor();            // 검정stroke
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
        return col.gray  === 0 || col.gray === 100;   // 0(화이트) 또는 100(화이트) 용도별 호환
      default:
        return false;   // SpotColor, PatternColor 등은 무시
    }
  }

  /* ──  재귀 순회 ── */
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

    /* 그룹・복합패스는 내부로 재귀 탐색 */
    if (item.typename === "GroupItem") {
      for (var g = 0; g < item.pageItems.length; g++) process(item.pageItems[g]);
      return;
    }
    if (item.typename === "CompoundPathItem") {
      for (var c = 0; c < item.pathItems.length; c++) process(item.pathItems[c]);
      return;
    }

    /* ── 개별 객체 처리 ── */
    try {
      if (item.filled && isWhiteColor(item.fillColor)) {
        // 빈(stroke OFF) 객체라도 켜 주고 색상 변경
        item.stroked     = true;
        item.strokeColor = black;
        count++;
      }
    } catch (e) { /* 텍스트 등 일부는 fill/stroke 속성 없음 */ }
  }

  /* ── 실행 ── */
  for (var l = 0; l < doc.layers.length; l++) traverse(doc.layers[l]);

//   alert("외곽선 검정으로 변경 (배경이 흰색인 경우만): " + count + "개");
})();
