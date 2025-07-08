(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  /* ── 1) 사용자 입력 ── */
  var baseName = prompt("저장할 기준 파일명을 입력하세요:\n(예: 엣지 명찰_70x20_골드_옷핀+집게_..._20250704-0000621)", "");
  if (!baseName) return;

  var bundleSizeStr = prompt("몇 개씩 JPG로 나눌지 입력하세요 (예: 10)", "10");
  if (!bundleSizeStr) return;
  var bundleSize = parseInt(bundleSizeStr, 10);
  if (isNaN(bundleSize) || bundleSize <= 0) {
    alert("❌ 숫자를 올바르게 입력하세요.");
    return;
  }

  var toks = baseName.split("_");
  var imgKey = (toks.length >= 3) ? toks[1] + "_" + toks[2] : "";
  if (toks[0].indexOf("엣지") !== -1) imgKey = "엣지_" + imgKey;
  var imgFile = null;
  var tryPng = new File("C:/work/img/" + imgKey + ".png");
  var tryJpg = new File("C:/work/img/" + imgKey + ".jpg");

  if (tryPng.exists) imgFile = tryPng;
  else if (tryJpg.exists) imgFile = tryJpg;

  var m = baseName.match(/_([0-9]{8}-[0-9]{7})$/);
  if (!m) {
    alert("❌ 파일명에 '_YYYYMMDD-#######' 형식이 없습니다.");
    return;
  }
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
      layer = doc.layers.add();
      layer.name = name;
    }
    layer.visible = true;
    return layer;
  }

  var ab0 = doc.artboards[0].artboardRect;
  var ABW = ab0[2] - ab0[0], ABH = ab0[1] - ab0[3];
  var GAP = 10, COL_PAIR = 1, ROW_MAX = 10;
  var TOL = Math.max(4, ABW * 0.05);
  var noFill = new NoColor();
  var maxRight = -Infinity;
  for (i = 0; i < doc.artboards.length; i++) {
    var rc = doc.artboards[i].artboardRect;
    if (rc[2] > maxRight) maxRight = rc[2];
  }
  var ORIGIN_X = maxRight + 500;

  function cellXY(n) {
    var sub = n % COL_PAIR;
    var row = Math.floor(n / COL_PAIR) % ROW_MAX;
    var grp = Math.floor(n / (COL_PAIR * ROW_MAX));
    var col = grp * COL_PAIR + sub;
    return {
      x: ORIGIN_X + col * (ABW + GAP),
      y: -row * (ABH + GAP),
      col: col,
      row: row
    };
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
          try { it.fillColor = noFill; } catch (e) { }
        }
      }
    }
  }

  function getNonConflictingFile(base, ext) {
    var f = new File(base + ext);
    var i = 1;
    while (f.exists) {
      f = new File(base + "_" + i + ext);
      i++;
    }
    return f;
  }

  for (var part = 0; part < jpgCount; part++) {
    var startIdx = part * bundleSize;
    var endIdx = Math.min(startIdx + bundleSize - 1, totalBoards - 1);
    var actualRange = (startIdx + 1) + "-" + (endIdx + 1);

    var imgLayer = makeEmptyLayer("TEMP_IMG_LAYER");
    var designLayer = makeEmptyLayer("TEMP_EXPORT_LAYER");

    app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
    var idxCnt = 0, maxCol = -1, maxRow = -1;
    for (var iAB = startIdx; iAB <= endIdx; iAB++) {
      var pos = cellXY(idxCnt);
      if (imgFile && imgFile.exists) {
        var pl = imgLayer.placedItems.add();
        pl.file = imgFile;
        var sx = 100 * (ABW / pl.width);
        var sy = 100 * (ABH / pl.height);
        pl.resize(sx, sy);
        pl.left = pos.x;
        pl.top = pos.y;
      }

      var rect = doc.artboards[iAB].artboardRect, arr = [];
      collect(srcLayer, rect, arr);
      if (arr.length > 0) {
        var grp = designLayer.groupItems.add();
        for (var j = 0; j < arr.length; j++) {
          var dup = arr[j].duplicate(designLayer, ElementPlacement.PLACEATEND);
          dup.moveToBeginning(grp);
        }
        clearBg(grp);
        grp.blendingMode = BlendModes.MULTIPLY;
        var gb = grp.visibleBounds;
        grp.translate(pos.x - gb[0], pos.y - gb[1]);
      }
      if (pos.col > maxCol) maxCol = pos.col;
      if (pos.row > maxRow) maxRow = pos.row;
      idxCnt++;
    }

    var totCols = maxCol + 1, totRows = maxRow + 1;
    var totW = totCols * ABW + (totCols - 1) * GAP;
    var totH = totRows * ABH + (totRows - 1) * GAP;
    var expAB = doc.artboards.add([ORIGIN_X, 0, ORIGIN_X + totW, -totH]);
    var expIdx = doc.artboards.length - 1;

    var outDir = new Folder("C:/work/" + folderId);
    if (!outDir.exists) outDir.create();
    // var basePath = outDir.fsName + "/" + baseName + "_전체시안(" + (part + 1) + ")";
    var cleanName = baseName.replace(/\s+/g, "");
    var basePath = outDir.fsName + "/" + cleanName + "_전체시안(" + (part + 1) + ")";
    var outFile = getNonConflictingFile(basePath, ".jpg");

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

  for (var n in visMap) {
    try { doc.layers.getByName(n).visible = visMap[n]; } catch (e) { }
  }
})();
