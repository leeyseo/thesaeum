(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;
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
    // ── 아트보드 정보 & 허용오차
  var abRects = []; 
  for (var ai = 0; ai < doc.artboards.length; ai++) {
    abRects.push(doc.artboards[ai].artboardRect);
  }
  var tolAbs = 2;      // pt
  var tolPct = 0.02;   // 2%

  function isNearArtboardSize(item, abRects, tolAbs, tolPct) {
    if (!item.geometricBounds) return false;
    var gb = item.geometricBounds; // [L,T,R,B]
    var iw = Math.abs(gb[2]-gb[0]), ih = Math.abs(gb[1]-gb[3]);
    for (var k = 0; k < abRects.length; k++) {
      var ab = abRects[k];
      var aw = Math.abs(ab[2]-ab[0]), ah = Math.abs(ab[1]-ab[3]);
      var wOk = (Math.abs(iw-aw) <= tolAbs) || (Math.abs(iw-aw)/Math.max(aw,0.0001) <= tolPct);
      var hOk = (Math.abs(ih-ah) <= tolAbs) || (Math.abs(ih-ah)/Math.max(ah,0.0001) <= tolPct);
      if (wOk && hOk) return true;
    }
    return false;
  }



  var noStroke = new NoColor();
  var count = 0;

  /* ───────── 모든 오브젝트 순회 (잠김/숨김 제외) ───────── */
  function traverseVisible(layer) {
    if (!layer.visible) return;
    for (var i = 0; i < layer.pageItems.length; i++) {
      processItem(layer.pageItems[i]);
    }

    // 하위 레이어도 포함
    for (var j = 0; j < layer.layers.length; j++) {
      traverseVisible(layer.layers[j]);
    }
  }

  function processItem(item) {
    if (!item || item.locked || item.hidden) return;
    if (item.layer && item.layer.name.indexOf("칼선") !== -1) return;

    // 그룹인 경우 안쪽으로 순회
    if (item.typename === "GroupItem") {
      for (var i = 0; i < item.pageItems.length; i++) {
        processItem(item.pageItems[i]);
      }
    }

    // 복합패스는 pathItems 사용
    else if (item.typename === "CompoundPathItem") {
      for (var j = 0; j < item.pathItems.length; j++) {
        processItem(item.pathItems[j]);
      }
    }

    // 기본 객체 처리
    else {
      try {
        if (item.stroked && isNearArtboardSize(item, abRects, tolAbs, tolPct)) {
          item.strokeColor = noStroke;
          count++;
        }
      } catch (e) {}
    }

  }

  /* ───────── 전체 레이어 탐색 시작 ───────── */
  for (var i = 0; i < doc.layers.length; i++) {
    traverseVisible(doc.layers[i]);
  }

  // alert("외곽선 투명 처리 완료: " + count + "개");
})();
