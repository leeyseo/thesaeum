(function () {
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;

  // ── 파일명 조건: 블랙/화이트/사원증이면 임시 외곽선 사용
  var nameNoExt     = decodeURI(doc.name).replace(/\.ai$/i, "");
  var useTempStroke = /사원증|블랙|화이트/i.test(nameNoExt);

  // ── (A) 아트보드 캐시 & 판정 유틸
  var RAT_TOL = 0.02, ABS_TOL = 4; // 비율/절대 허용치
  var abRects = [];
  for (var ai = 0; ai < doc.artboards.length; ai++) abRects.push(doc.artboards[ai].artboardRect);

  function nearVal(v, t){ var b=Math.max(Math.abs(t)*RAT_TOL, ABS_TOL); return Math.abs(v-t) <= b; }
  function isNearAnyArtboardRect(gb){
    var w=gb[2]-gb[0], h=gb[1]-gb[3];
    for (var i=0;i<abRects.length;i++){
      var r=abRects[i], aw=r[2]-r[0], ah=r[1]-r[3];
      if (nearVal(w,aw)&&nearVal(h,ah)&&nearVal(gb[0],r[0])&&nearVal(gb[1],r[1])&&nearVal(gb[2],r[2])&&nearVal(gb[3],r[3])) return true;
    }
    return false;
  }
  function isWhiteColor(col){
    if (!col || col.typename==="NoColor") return false;
    switch(col.typename){
      case "RGBColor":  return col.red===255 && col.green===255 && col.blue===255;
      case "CMYKColor": return col.cyan===0 && col.magenta===0 && col.yellow===0 && col.black===0;
      case "GrayColor": return col.gray===0 || col.gray===100;
      default: return false;
    }
  }
  function cloneColor(col){
    if (!col) return null;
    if (col.typename==="NoColor") return new NoColor();
    if (col.typename==="RGBColor"){ var c=new RGBColor(); c.red=col.red;c.green=col.green;c.blue=col.blue; return c; }
    if (col.typename==="CMYKColor"){ var c2=new CMYKColor(); c2.cyan=col.cyan;c2.magenta=col.magenta;c2.yellow=col.yellow;c2.black=col.black; return c2; }
    if (col.typename==="GrayColor"){ var g=new GrayColor(); g.gray=col.gray; return g; }
    // Spot/Pattern 등은 그냥 null 처리
    return null;
  }

  // ── (B) 임시 외곽선 켜기 / 복원
  function enableTempOutlines(){
    var black = new RGBColor(); black.red=black.green=black.blue=0;
    var changes = []; // {item, stroked, strokeColor}

    function process(it){
      if (!it || it.locked || it.hidden) return;
      if (it.typename==="GroupItem"){ for (var g=0; g<it.pageItems.length; g++) process(it.pageItems[g]); return; }
      if (it.typename==="CompoundPathItem"){ for (var c=0; c<it.pathItems.length; c++) process(it.pathItems[c]); return; }

      if (it.typename==="PathItem" && it.filled && isWhiteColor(it.fillColor)) {
        var gb = it.geometricBounds;
        if (isNearAnyArtboardRect(gb)) {
          // 백업
          changes.push({
            item: it,
            stroked: it.stroked,
            strokeColor: cloneColor(it.strokeColor)
          });
          // 외곽선 on
          it.stroked = true;
          it.strokeColor = black;
        }
      }
    }
    // 모든 레이어 순회
    for (var l=0; l<doc.layers.length; l++){
      (function trav(layer){
        if (!layer.visible) return;
        for (var i=0; i<layer.pageItems.length; i++) process(layer.pageItems[i]);
        for (var j=0; j<layer.layers.length; j++) trav(layer.layers[j]);
      })(doc.layers[l]);
    }
    return changes;
  }

  function restoreTempOutlines(changes){
    for (var i=0; i<changes.length; i++){
      var ch = changes[i], it = ch.item;
      if (!it) continue;
      try{
        it.stroked = ch.stroked;
        if (ch.stroked) {
          // 원래 스트로크가 있었던 경우 색도 복구
          it.strokeColor = ch.strokeColor ? ch.strokeColor : new NoColor();
        } else {
          // 원래 스트로크 없던 경우 투명
          it.strokeColor = new NoColor();
        }
      }catch(_){}
    }
  }

  // ── (C) 적용/복원 래퍼
  var _changes = [];
  if (useTempStroke) {
    _changes = enableTempOutlines(); // ▶ 외곽선 임시 ON
  }

  try {
    // ===============================
    // 여기에 "원래 하시던 작업"을 넣으세요.
    // 예) 내보내기, 합성, 배치 등…
    // ===============================
    (function () {
        if (app.documents.length === 0) {
            alert("열린 문서가 없습니다.");
            return;
        }

        var doc = app.activeDocument;

        /* ── 1) 사용자 입력 ── */
        // var baseName = prompt("저장할 기준 파일명을 입력하세요:\n(예: 엣지 명찰_70x20_골드_옷핀+집게_..._20250704-0000621)", "");
        // if (!baseName) return;
        var fullName = decodeURI(doc.name).replace(/\.ai$/i, "");
        var matchFull = fullName.match(/^(.*?_\d{8}-\d{7}(?:-\d+)?)/);
        if (!matchFull) {
            alert("❌ 파일명에서 '_YYYYMMDD-#######' 형식을 찾지 못했습니다.");
            return;
        }
        var baseName = matchFull[1];
        var hasBlackWhite = /블랙|화이트/i.test(baseName);
        var isCarrierTag  = /사원증/i.test(baseName);

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
        if (!(isCarrierTag || hasBlackWhite)) {
            var tryPng = new File("C:/work/img/" + imgKey + ".png");
            var tryJpg = new File("C:/work/img/" + imgKey + ".jpg");
            if (tryPng.exists) imgFile = tryPng;
            else if (tryJpg.exists) imgFile = tryJpg;
        }

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

        for (var part = 0; part < jpgCount; part++) {
            var startIdx = part * bundleSize;
            var endIdx = Math.min(startIdx + bundleSize - 1, totalBoards - 1);

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
                grp.blendingMode = (imgFile && imgFile.exists) ? BlendModes.MULTIPLY : BlendModes.NORMAL;
                var gb = grp.visibleBounds;
                grp.translate(pos.x - gb[0], pos.y - gb[1]);
            }
            if (pos.col > maxCol) maxCol = pos.col;
            if (pos.row > maxRow) maxRow = pos.row;
            idxCnt++;
            }

                /* 중복번호(_숫자) 찾기 ───────────────────────── */
            function getDupTag(folder, baseName) {
            // baseName 예: "엣지 명찰_70x20_실버_자석3구_KPA대한약사회_1_20250622-5555555"
            var maxDup  = 0;
            var aiFiles = folder.getFiles("*.ai");   // 폴더 안 *.ai 모두

            for (var i = 0; i < aiFiles.length; i++) {
                var nm = decodeURI(aiFiles[i].name);   // 한글·공백 복원
                nm = nm.replace(/\.ai$/i, "");         // 확장자 제거

                // ① baseName 과 완전히 같은 파일 ⇒ 중복번호 0 (건너뜀)
                if (nm === baseName) continue;

                // ② "<baseName>_<숫자>" 패턴만 추출
                if (nm.lastIndexOf(baseName + "_", 0) === 0) { // prefix 일치?
                var tail = nm.slice(baseName.length + 1);    // '_' 뒤
                if (/^\d+$/.test(tail)) {                    // 순수 숫자?
                    var n = parseInt(tail, 10);
                    if (n > maxDup) maxDup = n;                // 최대값 갱신
                }
                }
            }

            // 0 → "" , 1↑ → "_<숫자>"
            return (maxDup > 0) ? "_" + maxDup : "";
            }


            /* 사용 */
            // "(1)" 또는 ""

            var totCols = maxCol + 1, totRows = maxRow + 1;
            var totW = totCols * ABW + (totCols - 1) * GAP;
            var totH = totRows * ABH + (totRows - 1) * GAP;
            var expAB = doc.artboards.add([ORIGIN_X, 0, ORIGIN_X + totW, -totH]);
            var expIdx = doc.artboards.length - 1;
            var outDir;
            try {
            outDir = doc.fullName.parent;
            } catch (e) {
            alert("❌ 먼저 문서를 저장한 뒤 다시 실행하세요.");
            return;
            }
            var dupTag = getDupTag(outDir, baseName);
            var basePath = outDir.fsName + "/" + baseName + dupTag  + "_전체시안(" + (part + 1) + ")";
            /* 2) 같은 이름이 있으면 _1, _2 … 붙여 주는 헬퍼 */
            function uniqueJpg(base) {
            var safe = base.replace(/\s+/g, "-");
            var f   = new File(safe + ".jpg");
            var idx = 1;
            while (f.exists) {                     // 이미 있으면
                f = new File(base + "_" + idx + ".jpg");  // 뒤에 _1, _2 …
                idx++;
            }
            return f;                              // 존재하지 않는 File 객체
            }

            /* 3) 최종 저장 경로 */
            var outFile = uniqueJpg(basePath);        // ← 여기서 중복 해결

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


  } catch (e) {
    alert("실행 중 오류:\n" + e);
  } finally {
    if (useTempStroke && _changes && _changes.length) {
      restoreTempOutlines(_changes); // ▶ 외곽선 원복(투명/비활성)
      app.redraw();
    }
  }
})();
