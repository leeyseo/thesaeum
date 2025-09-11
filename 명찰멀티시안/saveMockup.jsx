(function () {
  /* ─── JPG 3종 + 주문번호·고객명 텍스트 (좌표 지정) ─────────────────────────────── */

  /* 0) 문서 검사 */
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc = app.activeDocument;
  if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }

  var fullName = decodeURI(doc.name).replace(/\.ai$/i, "");
  var match = fullName.match(/^(.*?_\d{8}-\d{7}(?:-\d+)?)/);
  if (!match) {
    alert("❌ 파일명에서 '_YYYYMMDD-#######' 형식을 찾을 수 없습니다.");
    return;
  }
  var input = match[1];  // ← 여기까지 자른 결과만 사용됨
  var marginPct = 98; 
  var yShiftVal = 0.10;

  var baseOrig = input;                    // 표시용(공백 포함)
  var basePath = input.replace(/ /g, "-"); // 경로·파일명용
  /* ❶ ‘뱃지’ 여부에 따라 허용 필드 수가 다름 */
  var isCarrierTag = /사원증/i.test(baseOrig); 


  var parts = baseOrig.split("_");

  var isBadge = parts[0].indexOf("뱃지") !== -1;
  var FONT_SIZE_BADGE    = 8;   // 뱃지일 때 (확 줄임)
  var FONT_SIZE_NAMETAG  = 36;   // 일반 명찰
  var FONT_SIZE_CARRIER  = 12;   // 캐리어 네임택(기존과 동일)
  /* ❷ 형식 검사 */
  /* ❷ 형식 검사 */
  // if ( (!isBadge  && !isCarrierTag && parts.length < 7) ||   // 일반 명찰 ≥7
  //     ( (isBadge || isCarrierTag) && parts.length < 6) ) {  // 뱃지·캐리어네임택 ≥6
  //   alert("❌ 입력 형식 오류");
  //   return;
  // }
  /* ❸ 필드 해석 */

  var imgKey   = (parts[0].indexOf("엣지") !== -1 ? "엣지_" : "") +
                 parts[1] + "_" + parts[2];       // 배경키

  if (imgKey.indexOf("66x16") !== -1) {
    marginPct = 90;                   // 규격·색상 일치 ➜ 90 %
    yShiftVal -= 0.08;
  }

    /* 배경 이미지 & 목업 */
  if (!isCarrierTag) {                     // ← 캐리어네임택이면 배경을 아예 안 읽음
    var bgImg  = new File("C:/work/img/" + imgKey + ".png");
    if (!bgImg.exists) {
      alert("❌ 배경 이미지 없음:\n" + bgImg.fsName);
      return;
    }
  }
  var mockBg = new File("C:/work/img/목업.png");
  if (!mockBg.exists) { alert("❌ 목업 이미지 없음:\n" + mockBg.fsName); return; }

  /* 출력 폴더 */

  var outDir = doc.fullName.parent; // 현재 문서 경로
  function uniq(name){
    var f = new File(outDir + "/" + name + ".jpg"), n = 0;
    while (f.exists) { n++; f = new File(outDir + "/" + name + "_" + n + ".jpg"); }
    return f;
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

      // '레이어' 변수 찾기
  var layerVar = null;
  for (var i = 0; i < doc.variables.length; i++) {
    if (doc.variables[i].name === "레이어") {
      layerVar = doc.variables[i];
      break;
    }
  }
  if (!layerVar) {
    alert("❌ '레이어' 변수 없음.");
    return;
  }

  var RESTORE_IDX = 0;
  var layerMap = [];  // ← 결과 저장: [ [dataset_index, "1"], ... ]

  for (var d = 0; d < doc.dataSets.length; d++) {
    var ds  = doc.dataSets[d];
    var val = "";
    var raw;

    // 1) 공식 API
    try {
      raw = ds.getVariableValue(layerVar);
      if (raw != null) {
        if (raw.textualContents !== undefined)      val = raw.textualContents;
        else if (raw.contents !== undefined)         val = raw.contents;
        else                                         val = "" + raw;
      }
    } catch (e1) {}

    // 2) display() 후 추출
    if (!val) {
      try {
        ds.display(); $.sleep(10);
        if (layerVar.pageItems && layerVar.pageItems.length > 0) {
          var pi = layerVar.pageItems[0];
          if (pi.contents !== undefined && pi.contents !== "") {
            val = pi.contents;
          }
        }
      } catch (e2) {}
    }

    val = val.replace(/^\s+|\s+$/g, "");  // trim
    if (!val) val = "";  // 비어있으면 빈 문자열로

    layerMap.push([d, val]);  // 결과 저장
  }

  // 복원
  try { doc.dataSets[RESTORE_IDX].display(); } catch(e3){}
  // 중복 제거
  var uniqueLayers = [];
  var seen = {};

  for (var i = 0; i < layerMap.length; i++) {
    var pair = layerMap[i];
    var layerVal = pair[1];

    if (!seen[layerVal]) {
      uniqueLayers.push(pair);
      seen[layerVal] = true;
    }
  }

  /* 사용 */
  var dupTag = getDupTag(outDir, baseOrig);  // "(1)" 또는 ""

  var siAnFile = new File(Folder.temp + "/__siAn__.jpg");
  var hwakFile = uniq(basePath+ dupTag  + "_확정형");
  var mockFile = uniq(basePath+ dupTag  + "_시안전송목업용");

  /* 2) 전경 PNG (배경 투명) */
  doc.artboards.setActiveArtboardIndex(0);
  app.executeMenuCommand("deselectall");
  doc.selectObjectsOnActiveArtboard();

  var ab = doc.artboards[0].artboardRect, AW = ab[2] - ab[0], AH = ab[1] - ab[3],
      tol = Math.max(10, AW * 0.02), sel = doc.selection;
  for (var i = 0; i < sel.length; i++) {
    var it = sel[i];
    if (it.typename === "PathItem" && it.filled) {
      var b = it.geometricBounds, w = b[2] - b[0], h = b[1] - b[3];
      if (Math.abs(w - AW) <= tol && Math.abs(h - AH) <= tol) it.fillColor = new NoColor();
    }
  }
  var tmpPng = new File(Folder.temp + "/__tmp_fg__.png");
  var pOpt = new ExportOptionsPNG24();
  pOpt.transparency = true; pOpt.antiAliasing = true; pOpt.artBoardClipping = true;
  pOpt.horizontalScale = pOpt.verticalScale = 300;     // 300% (≈ 900 ppi)
  doc.exportFile(tmpPng, ExportType.PNG24, pOpt);

  /* 공통 JPG 옵션 */
  var jOpt = new ExportOptionsJPEG();
  jOpt.qualitySetting = 100; jOpt.resolution = 600;
  jOpt.resolution      = isBadge ? 1200 : 600;
  jOpt.horizontalScale = jOpt.verticalScale = 100;
  jOpt.antiAliasing = true; jOpt.optimized = true; jOpt.artBoardClipping = true;

  /* 3) 합성 함수 (Multiply Blend) */
  function composite(bg, fg, out, ratio, yShift,
                     txt1, off1, txt2, off2, font){
    if (ratio == null)  ratio = 1;
    if (yShift == null) yShift = 0;

    // 새 문서 (배경 크기에 맞춤)
    var nd = app.documents.add(DocumentColorSpace.RGB, 2000, 1000);
    var b  = nd.placedItems.add();
    var f  = nd.placedItems.add();

    b.file = bg; f.file = fg; app.redraw();

    // BlendMode "Multiply" 적용 ▶︎ 곱하기 효과
    f.blendingMode = BlendModes.MULTIPLY;

    // 배경을 좌상단 (0,0) → 하단(+,−) 좌표로 맞춤
    b.position = [0, b.height];
    var W = b.width, H = b.height;
    nd.artboards[0].artboardRect = [0, H, W, 0];

    // 전경 스케일 & 위치
    var sPct = (W * ratio / f.width) * marginPct;
    f.resize(sPct, sPct);
    var spare = H - f.height;
    f.position = [(W - f.width) / 2, H - (spare / 2) - (spare * yShift)];

    // 텍스트 (옵션)
    var black = new RGBColor(); black.red = black.green = black.blue = 0;
    function putText(txt, off, sz){
      if (!txt || !off) return;
      var t = nd.textFrames.add(); t.contents = txt;
      var ft = null;
      if (font) {
        try { ft = app.textFonts.getByName(font); } catch (e) {}
      }
      if (!ft) ft = app.textFonts[0];
      t.textRange.characterAttributes.textFont = ft;
      t.textRange.characterAttributes.size = sz || 40;
      t.textRange.characterAttributes.fillColor = black;
      t.position = [off[0], H - off[1]];   // 좌상단 기준
    }
    // 뱃지면 14, 아니면 40
    putText(txt1, off1, isBadge ? FONT_SIZE_BADGE : 40);
    putText(txt2, off2, isBadge ? FONT_SIZE_BADGE : 40);

    // ▶︎ JPG 내보내기
    nd.exportFile(out, ExportType.JPEG, jOpt);
    nd.close(SaveOptions.DONOTSAVECHANGES);
  }

  /* 4) 시안전송용 (배경 × 전경 PNG, Multiply) */
  var compositeJPGs = [];

  for (var i = 0; i < uniqueLayers.length; i++) {
    var abIdx = uniqueLayers[i][0];                 // ← 아트보드 번호 추출
    doc.dataSets[abIdx].display();                  // 해당 데이터셋 표시
    $.sleep(10);

    doc.artboards.setActiveArtboardIndex(abIdx);    // 해당 아트보드 선택
    app.executeMenuCommand("deselectall");
    doc.selectObjectsOnActiveArtboard();

    var ab = doc.artboards[abIdx].artboardRect,     // ← 해당 아트보드 기준
        AW = ab[2] - ab[0], AH = ab[1] - ab[3],
        tol = Math.max(10, AW * 0.02), sel = doc.selection;

    for (var j = 0; j < sel.length; j++) {
      var it = sel[j];
      if (it.typename === "PathItem" && it.filled) {
        var b = it.geometricBounds, w = b[2] - b[0], h = b[1] - b[3];
        if (Math.abs(w - AW) <= tol && Math.abs(h - AH) <= tol) {
          it.fillColor = new NoColor();
        }
      }
    }

    var tmpPng = new File(Folder.temp + "/__tmp_fg__" + abIdx + ".png");  // 파일명도 고유하게
    var pOpt = new ExportOptionsPNG24();
    pOpt.transparency = true;
    pOpt.antiAliasing = true;
    pOpt.artBoardClipping = true;
    pOpt.horizontalScale = pOpt.verticalScale = 300;
    doc.exportFile(tmpPng, ExportType.PNG24, pOpt);

    var siAnFile = new File(Folder.temp + "/__siAn__" + abIdx + ".jpg");
   if (isCarrierTag) {
    /* ── 배경 없이 디자인만 JPG ── */
    var jOpt2 = new ExportOptionsJPEG();
    jOpt2.qualitySetting     = 100;
    jOpt2.resolution         = isBadge ? 1200 : 600;
    jOpt2.horizontalScale    = jOpt2.verticalScale = 100;
    jOpt2.antiAliasing       = true;
    jOpt2.optimized          = true;
    jOpt2.artBoardClipping   = true;

    // 현재 아트보드 → JPG
    doc.exportFile(siAnFile, ExportType.JPEG, jOpt2);
    // 배경 PNG는 건드리지 않으므로 bgImg 없어도 OK
    } else {
      /* ── 기존 Multiply 합성 ── */
      composite(bgImg, tmpPng, siAnFile, 1, yShiftVal,
                null, null, null, null, "GmarketSans");
    }

    try { tmpPng.remove(); } catch (e) {}
    compositeJPGs.push(siAnFile);
  }




  /* 6) 시안전송 목업용 (시안전송용 JPG + 목업 배경) */
  var userText = prompt("시안전송 목업 JPG에 넣을 텍스트를 입력하세요:", "");
  if (userText === null) userText = "";

  // 목업 배경 없이 시안전송 JPG + 텍스트만
  stackVertically(compositeJPGs, mockFile, userText, "GmarketSans");

  function stackVertically(images, outFile, userText, fontName)
  {
    /* ── 0) 유효성 ─────────────────────────── */
    if (!images || images.length === 0) { alert("이미지가 없습니다."); return; }

    /* ── 1) 새 문서 & 이미지 배치 ───────────── */
    var tempDoc      = app.documents.add(DocumentColorSpace.RGB, 2000, 2000);
    var placed       = [];
    var totalHeight  = 0;
    var maxWidth     = 0;

    for (var i = 0; i < images.length; i++) {
      var f = new File(images[i]);
      if (!f.exists) continue;

      var it = tempDoc.placedItems.add();
      it.file = f;  app.redraw();

      placed.push(it);
      totalHeight += it.height;
      if (it.width > maxWidth) maxWidth = it.width;
    }

    if (placed.length === 0) {
      tempDoc.close(SaveOptions.DONOTSAVECHANGES);
      alert("유효한 이미지가 없습니다.");
      return;
    }

    /* ── 2) 아트보드 크기 & 이미지 위치 ─────── */
    var TOP_SPACE    = (!isCarrierTag && userText) ? 150 : 0;  // 명찰/뱃지
    var BOTTOM_SPACE = ( isCarrierTag && userText) ? 80  : 0; // 캐리어

    var artH = totalHeight + TOP_SPACE + BOTTOM_SPACE;
    tempDoc.artboards[0].artboardRect = [0, artH, maxWidth, 0];

    var y = artH;
    for (var i = 0; i < placed.length; i++) {
      var it = placed[i];
      y -= it.height;
      it.position = [(maxWidth - it.width) / 2, y + it.height];
    }

    /* ── 3) 텍스트 추가 ─────────────────────── */
    if (userText && userText !== "") {

      if (isCarrierTag) {
        /* 캐리어 네임택 : 디자인 ‘아래’에 포인트-텍스트 */
        var tf = tempDoc.textFrames.add();
        tf.contents = userText;

        /* 글꼴·크기 */
        try {
          tf.textRange.characterAttributes.textFont =
              app.textFonts.getByName(fontName || "GmarketSans");
        } catch (e) {
          tf.textRange.characterAttributes.textFont = app.textFonts[0];
        }
        tf.textRange.characterAttributes.size = 12;

        /* 색상 */
        var red = new RGBColor(); red.red = 255; red.green = 0; red.blue = 0;
        tf.textRange.characterAttributes.fillColor = red;

        /* 가운데 정렬(문단) */
        tf.paragraphs[0].paragraphAttributes.justification = Justification.CENTER;

        /* 가로 중앙으로 보정 */
        app.redraw();                              // 폭 계산 전 필수
        var vb  = tf.visibleBounds;                // [L,T,R,B]
        var w   = vb[2] - vb[0];                   // 실제 글자 폭
        var h   = vb[1] - vb[3];                   // 실제 글자 높이

        var cx  = (maxWidth - w) / 2;              // 좌우 중앙
        var cy  = h / 2 + 10;                      // 하단 여백 10 pt
        tf.position = [cx, cy];

      } else {
        /* 명찰·뱃지 : 디자인 ‘위’ Area-Text */
        var margin = Math.min(60, maxWidth * 0.10);
        var frameW = Math.max(50, maxWidth - margin * 2);

        var tf = tempDoc.textFrames.areaText(
          tempDoc.pathItems.rectangle(TOP_SPACE - 20,  // top
                                      margin,          // left
                                      frameW,          // width
                                      100)             // height
        );
        tf.contents = userText;

        try {
          tf.textRange.characterAttributes.textFont =
              app.textFonts.getByName(fontName || "GmarketSans");
        } catch (e) {
          tf.textRange.characterAttributes.textFont = app.textFonts[0];
        }
        tf.textRange.characterAttributes.size = 36;

        var red = new RGBColor(); red.red = 255; red.green = 0; red.blue = 0;
        tf.textRange.characterAttributes.fillColor = red;
        tf.paragraphs[0].paragraphAttributes.justification = Justification.CENTER;
      }
    }

    /* ── 4) JPG 내보내기 ─────────────────────── */
    var jOpt = new ExportOptionsJPEG();
    jOpt.qualitySetting   = 100;
    jOpt.resolution       = 600;
    jOpt.horizontalScale  = jOpt.verticalScale = 100;
    jOpt.antiAliasing     = true;
    jOpt.optimized        = true;
    jOpt.artBoardClipping = true;

    tempDoc.exportFile(outFile, ExportType.JPEG, jOpt);
    tempDoc.close(SaveOptions.DONOTSAVECHANGES);
  }



  /* 7) 임시 PNG 삭제 & 종료 */
  try { tmpPng.remove(); } catch (e) {}
  try { siAnFile.remove(); } catch (e) {}
  // alert("✅ JPG 3종 저장 완료 (Multiply 반영)");

})();