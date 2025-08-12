(function () {
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;

  /* ── 1) 파일명 파싱 ── */
  var fullName = decodeURI(doc.name).replace(/\.ai$/i, "");
  var matchFull = fullName.match(/^(.*?_\d{8}-\d{7}(?:-\d+)?)/);
  if (!matchFull) { alert("❌ 파일명에서 '_YYYYMMDD-#######' 형식을 찾지 못했습니다."); return; }
  var baseName = matchFull[1];

  var bundleSizeStr = prompt("몇 개씩 JPG로 나눌지 입력하세요 (예: 10)", "10");
  if (!bundleSizeStr) return;
  var bundleSize = parseInt(bundleSizeStr, 10) * 2;  // ★ 입력값을 2배로 인식
  if (isNaN(bundleSize) || bundleSize <= 0) { alert("❌ 숫자를 올바르게 입력하세요."); return; }
  

  var m = baseName.match(/_([0-9]{8}-[0-9]{7}(?:-\d+)?)/);
  if (!m) { alert("❌ 파일명에 '_YYYYMMDD-#######' 형식이 없습니다."); return; }
  var folderId = m[1];

  var totalBoards = doc.artboards.length;
  var jpgCount = Math.ceil(totalBoards / bundleSize);

  /* ── 레이어 준비 ── */
  var srcLayer;
  try { srcLayer = doc.layers.getByName("출력_디자인"); }
  catch (e) { alert("❌ ‘출력_디자인’ 레이어 없음"); return; }

  var visMap = {};
  for (var i = 0; i < doc.layers.length; i++) visMap[doc.layers[i].name] = doc.layers[i].visible;
  srcLayer.visible = true;

  function makeEmptyLayer(name) {
    var layer;
    try {
      layer = doc.layers.getByName(name);
      while (layer.pageItems.length > 0) layer.pageItems[0].remove();
    } catch (e) {
      layer = doc.layers.add(); layer.name = name;
    }
    layer.visible = true;
    return layer;
  }

  var ab0 = doc.artboards[0].artboardRect;
  var ABW = ab0[2] - ab0[0], ABH = ab0[1] - ab0[3];

  var GAP = 10;
  var COL_PAIR = 2;                             /* ★ 변경: 2열 배치 */
  var ROW_MAX = Math.ceil(bundleSize / COL_PAIR);/* ★ 변경: 번들 크기에 맞춰 행 개수 */
  var TOL = Math.max(4, ABW * 0.05);
  var noFill = new NoColor();

  /* 오른쪽 바깥쪽 안전 위치(작업용 캔버스) */
  var maxRight = -Infinity;
  for (i = 0; i < doc.artboards.length; i++) {
    var rc = doc.artboards[i].artboardRect;
    if (rc[2] > maxRight) maxRight = rc[2];
  }
  var ORIGIN_X = maxRight + 500;

  function cellXY(n) {
    var sub = n % COL_PAIR;                              // 0 또는 1 (좌/우)
    var row = Math.floor(n / COL_PAIR) % ROW_MAX;        // 위→아래
    var grp = Math.floor(n / (COL_PAIR * ROW_MAX));      // (거의 0일 것)
    var col = grp * COL_PAIR + sub;                      // 좌우 열
    return { x: ORIGIN_X + col * (ABW + GAP),
             y: -row * (ABH + GAP),
             col: col, row: row };
  }

  function intersects(b1, b2) {
    return (b1[2] > b2[0]) && (b1[0] < b2[2]) && (b1[1] > b2[3]) && (b1[3] < b2[1]);
  }
  function collect(layer, rect, arr) {
    for (var k = 0; k < layer.pageItems.length; k++) {
      var it = layer.pageItems[k];
      if (it.hidden) continue;
      if (intersects(it.geometricBounds, rect)) arr.push(it);
    }
    for (k = 0; k < layer.layers.length; k++) collect(layer.layers[k], rect, arr);
  }
  function clearBg(g) {
    var its = g.pageItems;
    for (var p = 0; p < its.length; p++) {
      var it = its[p];
      if ((it.typename === "PathItem" || it.typename === "CompoundPathItem") && it.filled) {
        var b = it.geometricBounds, w = b[2] - b[0], h = b[1] - b[3];
        if (Math.abs(w - ABW) <= TOL && Math.abs(h - ABH) <= TOL) {
          try { it.fillColor = noFill; } catch (e) {}
        }
      }
    }
  }

  function getDupTag(folder, baseName) {
    var maxDup = 0, aiFiles = folder.getFiles("*.ai");
    for (var i = 0; i < aiFiles.length; i++) {
      var nm = decodeURI(aiFiles[i].name).replace(/\.ai$/i, "");
      if (nm === baseName) continue;
      if (nm.lastIndexOf(baseName + "_", 0) === 0) {
        var tail = nm.slice(baseName.length + 1);
        if (/^\d+$/.test(tail)) maxDup = Math.max(maxDup, parseInt(tail, 10));
      }
    }
    return (maxDup > 0) ? "_" + maxDup : "";
  }

  function uniqueJpg(base) {
    var safe = base.replace(/\s+/g, "-");
    var f = new File(safe + ".jpg"), idx = 1;
    while (f.exists) { f = new File(base + "_" + idx + ".jpg"); idx++; }
    return f;
  }

  /* ── 배경 이미지 사용 안함 ───────────────────────────────────── */
  var USE_BG = false;  /* ★ 변경: 배경 비사용 고정 */

  for (var part = 0; part < jpgCount; part++) {
    var startIdx = part * bundleSize;
    var endIdx = Math.min(startIdx + bundleSize - 1, totalBoards - 1);

    var imgLayer = makeEmptyLayer("TEMP_IMG_LAYER");
    var designLayer = makeEmptyLayer("TEMP_EXPORT_LAYER");

    app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
    var idxCnt = 0, maxCol = -1, maxRow = -1;

    for (var iAB = startIdx; iAB <= endIdx; iAB++) {
      var pos = cellXY(idxCnt);

      /* ▼ 배경 배치 비활성화 */
      if (USE_BG) {
        // (배경을 쓰려면 여기에서 placedItems.add() 로 배치)
      }

      /* 디자인 수집/복제 */
      var rect = doc.artboards[iAB].artboardRect, arr = [];
      collect(srcLayer, rect, arr);
      if (arr.length > 0) {
        var grp = designLayer.groupItems.add();
        for (var j = 0; j < arr.length; j++) {
          var dup = arr[j].duplicate(designLayer, ElementPlacement.PLACEATEND);
          dup.moveToBeginning(grp);
        }
        clearBg(grp);
        // grp.blendingMode = BlendModes.MULTIPLY; // 배경이 없으므로 필요시 유지/제거
        var gb = grp.visibleBounds;
        grp.translate(pos.x - gb[0], pos.y - gb[1]);
      }

      if (pos.col > maxCol) maxCol = pos.col;
      if (pos.row > maxRow) maxRow = pos.row;
      idxCnt++;
    }

    /* 내보낼 가상 아트보드 */
    var totCols = maxCol + 1, totRows = maxRow + 1;
    var totW = totCols * ABW + (totCols - 1) * GAP;
    var totH = totRows * ABH + (totRows - 1) * GAP;
    var expAB = doc.artboards.add([ORIGIN_X, 0, ORIGIN_X + totW, -totH]);
    var expIdx = doc.artboards.length - 1;

    var outDir;
    try { outDir = doc.fullName.parent; }
    catch (e) { alert("❌ 먼저 문서를 저장한 뒤 다시 실행하세요."); return; }

    var dupTag = getDupTag(outDir, baseName);
    var basePath = outDir.fsName + "/" + baseName + dupTag + "_전체시안(" + (part + 1) + ")";
    var outFile = uniqueJpg(basePath);

    var jpg = new ExportOptionsJPEG();
    jpg.artBoardClipping = true;
    jpg.antiAliasing = true;
    jpg.qualitySetting = 100;
    jpg.horizontalScale = 300;
    jpg.verticalScale = 300;
    jpg.optimization = true;

    doc.artboards.setActiveArtboardIndex(expIdx);
    doc.exportFile(outFile, ExportType.JPEG, jpg);
    doc.artboards.remove(expIdx);
  }

  /* 가시성 복원 */
  for (var n in visMap) {
    try { doc.layers.getByName(n).visible = visMap[n]; } catch (e) {}
  }
})();
