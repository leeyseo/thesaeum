
(function () {
  /* ───────── 0) 문서 검사 ───────── */
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다."); 
    return;
  }
  var doc = app.activeDocument;
  var abCount = doc.artboards.length;
  var originalIdx = doc.artboards.getActiveArtboardIndex(); // 나중에 복귀용

  /* ───────── 1) 아트보드 루프 ───────── */
  for (var idx = 0; idx < abCount; idx++) {

    // ① 아트보드 선택
    doc.selection = null;                        // 기존 선택 해제
    doc.artboards.setActiveArtboardIndex(idx);

    // ② “아트보드에서 모두 선택” (버전별 두 가지 방법)
    try {
      // 최신 버전: 메뉴 명령
      app.executeMenuCommand("selectallinartboard");
    } catch (e) {
      // 구버전 호환: 메서드
      if (typeof doc.selectObjectsOnActiveArtboard === "function") {
        doc.selectObjectsOnActiveArtboard();
      }
    }

    if (doc.selection.length === 0) {            // 아무것도 없으면 다음 아트보드
      continue;
    }

    // ③ 그룹 만들기 (선택 항목이 2개 이상일 때만 꼭 필요하지만, 1개여도 안전)
    app.executeMenuCommand("group");

    /* 그룹이 성공적으로 만들어지면
       selection[0] = 방금 만든 GroupItem 이므로 이름만 지정 */
    if (doc.selection.length === 1 &&
        doc.selection[0].typename === "GroupItem") {
      doc.selection[0].name = "AB_" + (idx + 1) + "_Group";
    }
  }

  /* ───────── 2) 원래 활성 아트보드로 복귀 ───────── */
  doc.artboards.setActiveArtboardIndex(originalIdx);
  doc.selection = null;

//   alert("✅ 각 아트보드 위 객체를 한 그룹으로 묶었습니다!");
})();

/**
 * ▸ “레이어” 변수 ←→ 더미 텍스트 1개 자동 매핑
 * ▸ 더미 텍스트는 **단 하나의** 레이어 “레이어변수” 안에 생성
 * ▸ 이미 레이어와 매핑이 있으면 새로 만들지 않음
 * ES3 ExtendScript
 */
(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다."); return; }



  /* ── 0. 전역 잠금·숨김 해제 ── */
  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");

  /* ── 1. ‘레이어’ 변수 확보 ── */
  var layVar = null, i;
  for (i = 0; i < doc.variables.length; i++)
    if (doc.variables[i].name === "레이어") { layVar = doc.variables[i]; break; }

  if (!layVar) {
    layVar = doc.variables.add();
    layVar.name = "레이어";
    layVar.kind = VariableKind.TEXTUAL;
  }

  /* 이미 매핑돼 있으면 아무것도 하지 않음 */
  try { if (layVar.pageItems.length > 0) { ; return; } }
  catch (_) {}   // 일부 버전 예외 무시

  /* ── 2. 레이어 “레이어변수” 준비 (중복 생성 X) ── */
  var holdLayer;
  try { holdLayer = doc.layers.getByName("레이어변수"); }
  catch (e) { holdLayer = doc.layers.add(); holdLayer.name = "레이어변수"; }

  holdLayer.locked   = false;   // 수정 가능
  holdLayer.template = false;
  holdLayer.visible  = true;    // 생성·확인 시 잠깐 보이도록

  /* ── 3. 더미 텍스트를 아트보드 중앙에 생성 ── */
  var AB = doc.artboards[0].artboardRect;   // [L, T, R, B]
  var cx = (AB[0] + AB[2]) / 2;
  var cy = (AB[1] + AB[3]) / 2;

  doc.activeLayer = holdLayer;
  var tf = holdLayer.textFrames.add();
  tf.contents = "";
  tf.textRange.characterAttributes.size = 1;  // 1 pt
  tf.position = [cx, cy];                     // 중앙

  /* ── 4. 변수와 바인딩 ── */
  try { tf.contentVariable = layVar; }        // CS6+
  catch (e) { tf.variable = layVar; }         // 구버전

  /* ── 5. 레이어 숨김 처리 ── */
  holdLayer.visible = false;

  // alert("✅ 더미 텍스트가 '레이어' 변수에 매핑되었습니다.\n(레이어 '레이어변수'는 숨김 처리됨)");
})();



(function () {
  /* ───────── 0) 문서 검사 ───────── */
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }
  var doc = app.activeDocument;
  var abCount = doc.artboards.length;
  var origIdx = doc.artboards.getActiveArtboardIndex();  // 나중에 복귀용

  /* ───────── 1) 아트보드 루프 ───────── */
  for (var idx = 0; idx < abCount; idx++) {

    // ① 아트보드 활성화 & 선택 초기화
    doc.selection = null;
    doc.artboards.setActiveArtboardIndex(idx);

    // ② ‘아트보드에서 모두 선택’
    try {
      app.executeMenuCommand("selectallinartboard");       // CC 신버전
    } catch (e) {
      if (typeof doc.selectObjectsOnActiveArtboard === "function") {
        doc.selectObjectsOnActiveArtboard();               // CS6‑급
      }
    }

    if (doc.selection.length === 0) {
      continue;   // 이 아트보드엔 선택될 게 없음 → 다음
    }

    /* ───────── ③ 그룹 해제 반복 ─────────
       Illustrator 의 ‘Ungroup’ 명령은 한 번에 한 단계만 풀기 때문에
       선택 안에 그룹이 사라질 때까지 반복 실행합니다.
    */
    var loopGuard = 10;    // 무한 루프 방지용 최대 반복 횟수
    function selectionHasGroup() {
      for (var s = 0; s < doc.selection.length; s++) {
        if (doc.selection[s].typename === "GroupItem") return true;
      }
      return false;
    }

    while (selectionHasGroup() && loopGuard-- > 0) {
      app.executeMenuCommand("ungroup");
    }
  }

  /* ───────── 2) 원래 아트보드로 복귀 & 선택 해제 ───────── */
  doc.artboards.setActiveArtboardIndex(origIdx);
  doc.selection = null;


})();


(function () {
  /* ───── 0) 문서 검사 ───── */
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc   = app.activeDocument;
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


(function () {
  /* ── 0) 문서 검사 ────────────────────────────────────────── */
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }
  var doc      = app.activeDocument;
  var abTotal  = doc.artboards.length;
  if (abTotal === 0) { alert("아트보드가 없습니다."); return; }

  var baseName = decodeURI(doc.name).replace(/\.ai$/i, "");
  var GAP_PT   = 10;          // 아트보드 간격

  /* ── 1) 각 아트보드 크기 수집 ---------------------------------- */
  var widths  = [], heights = [];
  for (var i = 0; i < abTotal; i++) {
    var ab = doc.artboards[i].artboardRect;     // [L,T,R,B]
    widths.push( ab[2] - ab[0] );
    heights.push( ab[1] - ab[3] );
  }
  var maxW   = Math.max.apply(null, widths);
  var totalH = 0;
  for (var h = 0; h < heights.length; h++) {
    totalH += heights[h];
    if (h < heights.length - 1) totalH += GAP_PT;
  }

  /* ── 2) 새 문서 생성 ------------------------------------------- */
  var comp = app.documents.add(DocumentColorSpace.RGB, maxW, totalH);
  comp.artboards[0].artboardRect = [0, totalH, maxW, 0];

  /* 복사‑붙여넣기 & 위치 맞추기 */
  function pasteBoard(srcIdx, destDoc, toX, toTopY) {
    doc.activate();
    doc.artboards.setActiveArtboardIndex(srcIdx);
    app.executeMenuCommand("deselectall");
    doc.selectObjectsOnActiveArtboard();
    app.copy();

    destDoc.activate();
    app.executeMenuCommand("pasteInPlace");

    var sel = destDoc.selection;
    var L = 1e10, T = -1e10;
    for (var s = 0; s < sel.length; s++) {
      var vb = sel[s].visibleBounds;   // [L,T,R,B]
      if (vb[0] < L) L = vb[0];
      if (vb[1] > T) T = vb[1];
    }
    var dx = toX - L,
        dy = toTopY - T;
    for (var s = 0; s < sel.length; s++) sel[s].translate(dx, dy);
    app.executeMenuCommand("deselectall");
  }

  /* ── 3) 1 열 배치 ---------------------------------------------- */
  var cursorY = 0;                       // 누적 높이 (위→아래)
  for (var idx = 0; idx < abTotal; idx++) {
    var topY = totalH - cursorY;         // Illustrator 좌표계: 위쪽 T 값
    pasteBoard(idx, comp, 0, topY);
    cursorY += heights[idx] + GAP_PT;
  }

  /* ── 4) JPG 내보내기 ------------------------------------------- */
  var jpgOpt = new ExportOptionsJPEG();
  jpgOpt.qualitySetting   = 100;
  jpgOpt.resolution       = 600;
  jpgOpt.horizontalScale  = jpgOpt.verticalScale = 100;
  jpgOpt.optimized        = true;
  jpgOpt.antiAliasing     = true;
  jpgOpt.artBoardClipping = false;

  var outFolder = doc.fullName.parent;
  var stem      = baseName;
  var outFile   = new File(outFolder + "/" + stem + ".jpg");
  var dup = 0;
  while (outFile.exists) outFile = new File(outFolder + "/" + stem + "_" + (++dup) + ".jpg");

  comp.exportFile(outFile, ExportType.JPEG, jpgOpt);
  comp.close(SaveOptions.DONOTSAVECHANGES);

  // alert("✅ 모든 아트보드를 1 열로 배치한 JPG 저장 완료:\n" + decodeURI(outFile.fsName));
})();

(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;
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
        if (item.stroked) {
          item.strokeColor = noStroke;
          count++;
        }
      } catch (e) { /* 일부는 stroke 속성 없음 */ }
    }
  }

  /* ───────── 전체 레이어 탐색 시작 ───────── */
  for (var i = 0; i < doc.layers.length; i++) {
    traverseVisible(doc.layers[i]);
  }

  // alert("외곽선 투명 처리 완료: " + count + "개");
})();


(function () {
  /* ───────── 0) 문서 검사 ───────── */
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다."); 
    return;
  }
  var doc = app.activeDocument;
  var abCount = doc.artboards.length;
  var originalIdx = doc.artboards.getActiveArtboardIndex(); // 나중에 복귀용

  /* ───────── 1) 아트보드 루프 ───────── */
  for (var idx = 0; idx < abCount; idx++) {

    // ① 아트보드 선택
    doc.selection = null;                        // 기존 선택 해제
    doc.artboards.setActiveArtboardIndex(idx);

    // ② “아트보드에서 모두 선택” (버전별 두 가지 방법)
    try {
      // 최신 버전: 메뉴 명령
      app.executeMenuCommand("selectallinartboard");
    } catch (e) {
      // 구버전 호환: 메서드
      if (typeof doc.selectObjectsOnActiveArtboard === "function") {
        doc.selectObjectsOnActiveArtboard();
      }
    }

    if (doc.selection.length === 0) {            // 아무것도 없으면 다음 아트보드
      continue;
    }

    // ③ 그룹 만들기 (선택 항목이 2개 이상일 때만 꼭 필요하지만, 1개여도 안전)
    app.executeMenuCommand("group");

    /* 그룹이 성공적으로 만들어지면
       selection[0] = 방금 만든 GroupItem 이므로 이름만 지정 */
    if (doc.selection.length === 1 &&
        doc.selection[0].typename === "GroupItem") {
      doc.selection[0].name = "AB_" + (idx + 1) + "_Group";
    }
  }

  /* ───────── 2) 원래 활성 아트보드로 복귀 ───────── */
  doc.artboards.setActiveArtboardIndex(originalIdx);
  doc.selection = null;

//   alert("✅ 각 아트보드 위 객체를 한 그룹으로 묶었습니다!");
})();


(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다."); return; }
  if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }
    // ✅ 이미 있으면 경고 후 종료
  try {
    if (doc.layers.getByName("출력_디자인")) {
      // alert("❌ 이미 '출력_디자인' 레이어가 존재합니다.\n작업을 취소합니다.");
      return;
    }
  } catch (_) {}

  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");

  while (doc.artboards.length > 1) doc.artboards[1].remove();
  var AB0  = doc.artboards[0].artboardRect,
      AB_H = AB0[1] - AB0[3],
      GAP  = 50;

  for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = false;

  var outLayer = doc.layers.add(); outLayer.name = "출력_디자인";

  var layVar = null, varPairs = [];
  for (i = 0; i < doc.variables.length; i++) {
    var nm = doc.variables[i].name;
    if (nm === "레이어") layVar = doc.variables[i];
    if (nm.indexOf("이름_") === 0) {
      var idx = nm.substring(3), mate = "직책_" + idx;
      for (var j = 0; j < doc.variables.length; j++) {
        if (doc.variables[j].name === mate) {
          varPairs.push({ idx: idx, nameVar: doc.variables[i], titleVar: doc.variables[j] });
          break;
        }
      }
    }
  }
  if (!layVar) { alert("변수 '레이어' 가 없습니다."); return; }

  for (var d = 0; d < doc.dataSets.length; d++) {
    var ds = doc.dataSets[d];
    ds.display(); $.sleep(60);

    var gIdx = null, lyrVal = null;
    try {
      if (typeof ds.getVariableValue === "function") {
        var dv = ds.getVariableValue(layVar);
        lyrVal = dv.textualContents || dv.contents || dv;
      }
    } catch (_) {}

    if (lyrVal == null) {
      try { lyrVal = layVar.pageItems[0].contents; } catch (_) {}
    }
    if (lyrVal && lyrVal !== "Nan") gIdx = lyrVal;
    if (!gIdx) {
      for (i = 0; i < varPairs.length; i++) {
        try {
          var vN = varPairs[i].nameVar.pageItems[0].contents,
              vT = varPairs[i].titleVar.pageItems[0].contents;
          if (vN !== "Nan" && vT !== "Nan") { gIdx = varPairs[i].idx; break; }
        } catch (_) {}
      }
    }
    if (!gIdx) {
      alert("DS" + (d+1) + ": 사용할 레이어를 판단할 수 없습니다.");
      continue;
    }

    var srcLayer;
    try { srcLayer = doc.layers.getByName("Artboard_" + gIdx); }
    catch (_) {
      alert("Artboard_" + gIdx + " 레이어가 없습니다.");
      continue;
    }

    var dy = -d * (AB_H + GAP),
        rect = [AB0[0], AB0[1] + dy, AB0[2], AB0[3] + dy],
        abIdx;

    if (d === 0) {
      abIdx = 0;
    } else {
      doc.artboards.add(rect);
      abIdx = doc.artboards.length - 1;
    }

    var grp = outLayer.groupItems.add();
    grp.name = "DS" + (d+1) + "_" + gIdx;

    for (i = 0; i < srcLayer.pageItems.length; i++) {
      var it = srcLayer.pageItems[i];
      if (!it.locked && !it.hidden) {
        it.duplicate(grp, ElementPlacement.PLACEATEND);
      }
    }

    // 정확한 위치 맞춤 (디자인 ↔ 새 아트보드)
    var bounds = grp.visibleBounds; // [L, T, R, B]
    var designLeft = bounds[0], designTop = bounds[1];

    var abRect = doc.artboards[abIdx].artboardRect;
    var abLeft = abRect[0], abTop = abRect[1];

    var dx = abLeft - designLeft;
    var dy2 = abTop - designTop;

    grp.position = [grp.position[0] + dx, grp.position[1] + dy2];
    try { grp.artboard = abIdx; } catch (_) {}
  }

  doc.dataSets[0].display();
})();


/**
 * ⚡ Illustrator 전체 레이어의 텍스트 프레임을 검사해
 *    "<br>"(소문자) 문자열을 줄바꿈(\r)으로 치환
 *    – 잠겨 있거나 숨겨진 텍스트는 건너뜀
 *    – ES3 ExtendScript 호환
 */
(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("열린 문서가 없습니다."); return; }

  var changed = 0, skipped = 0;

  for (var i = 0; i < doc.textFrames.length; i++) {
    var tf = doc.textFrames[i];
    if (tf.locked || tf.hidden) { skipped++; continue; }

    var txt = tf.contents;
    if (txt && txt.indexOf("<br>") !== -1) {
      tf.contents = txt.replace(/<br>/g, "\r");   // Illustrator 줄바꿈 = "\r"
      changed++;
    }
  }

  // alert("✅ 변환 완료\n치환된 프레임: " + changed + "\n건너뛴 프레임: " + skipped);
})();



(function () {
  /* ───────── 0) 문서 검사 ───────── */
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }
  var doc = app.activeDocument;
  var abCount = doc.artboards.length;
  var origIdx = doc.artboards.getActiveArtboardIndex();  // 나중에 복귀용

  /* ───────── 1) 아트보드 루프 ───────── */
  for (var idx = 0; idx < abCount; idx++) {

    // ① 아트보드 활성화 & 선택 초기화
    doc.selection = null;
    doc.artboards.setActiveArtboardIndex(idx);

    // ② ‘아트보드에서 모두 선택’
    try {
      app.executeMenuCommand("selectallinartboard");       // CC 신버전
    } catch (e) {
      if (typeof doc.selectObjectsOnActiveArtboard === "function") {
        doc.selectObjectsOnActiveArtboard();               // CS6‑급
      }
    }

    if (doc.selection.length === 0) {
      continue;   // 이 아트보드엔 선택될 게 없음 → 다음
    }

    /* ───────── ③ 그룹 해제 반복 ─────────
       Illustrator 의 ‘Ungroup’ 명령은 한 번에 한 단계만 풀기 때문에
       선택 안에 그룹이 사라질 때까지 반복 실행합니다.
    */
    var loopGuard = 10;    // 무한 루프 방지용 최대 반복 횟수
    function selectionHasGroup() {
      for (var s = 0; s < doc.selection.length; s++) {
        if (doc.selection[s].typename === "GroupItem") return true;
      }
      return false;
    }

    while (selectionHasGroup() && loopGuard-- > 0) {
      app.executeMenuCommand("ungroup");
    }
  }

  /* ───────── 2) 원래 아트보드로 복귀 & 선택 해제 ───────── */
  doc.artboards.setActiveArtboardIndex(origIdx);
  doc.selection = null;


})();


/*  미리보기용 파일로 “다른 이름 저장” (ES3-Compatible)  */
(function () {
  /* 0) 열려 있는 문서 확인 */
  if (app.documents.length === 0) {
    alert("❌ 열려 있는 AI 문서가 없습니다.");
    return;
  }
  // if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }
  var doc = app.activeDocument;
  if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }

  /* 1) 원본 파일 경로·이름 파싱 */
  var orig     = new File(doc.fullName);          // 전체 경로
  var dir      = orig.parent;                     // 같은 폴더
  var baseName = orig.name.replace(/\.ai$/i, ""); // 확장자 제외

  /* 2) ‘_미리보기용’ 접미어 부여 */
  var previewName = baseName + "_미리보기용-업로드금지(X).ai";
  var previewFile = new File(dir.fsName + "/" + previewName);


  /* 4) AI 저장 옵션 (편집 가능, PDF 미포함) */
  var aiOpts = new IllustratorSaveOptions();
  aiOpts.pdfCompatible = false;          // 필요 시 true
  aiOpts.embedICCProfile = false;
  aiOpts.compressed = true;

  /* 5) 저장 후 안내 */
  doc.saveAs(previewFile, aiOpts);
//   alert("✅ 미리보기용으로 저장 완료:\n" + previewFile.fsName);
})();


/* ── 배경(아트보드 크기와 거의 같은 도형) → 투명색 ── */
(function () {
  if (app.documents.length === 0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument,
      boards = [], fixed = 0;
  if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }

  /* 허용 비율 오차 (%) 및 최소 절대 오차(pt) */
  var RAT_TOL = 0.05,   // ±5 %
      ABS_TOL = 4;      // ±4 pt

  /* 아트보드 정보 캐시 */
  for (var i = 0; i < doc.artboards.length; i++) {
    var r = doc.artboards[i].artboardRect;               // [L,T,R,B]
    boards.push({W: r[2]-r[0], H: r[1]-r[3]});
  }

  /* 기준 충족 여부 체크 */
  function near(val, target) {
    return Math.abs(val-target) <= Math.max(target*RAT_TOL, ABS_TOL);
  }

  var noCol = new NoColor();

  /* 페이지 아이템 순회 */
  for (var p = 0; p < doc.pageItems.length; p++) {
    var it = doc.pageItems[p];
    if (it.locked || it.hidden || !it.layer.visible) continue;
    if (it.typename !== "PathItem" || !it.filled)    continue;

    var g = it.geometricBounds, w = g[2]-g[0], h = g[1]-g[3];

    for (var b = 0; b < boards.length; b++) {
      var ab = boards[b];
      if (near(w, ab.W) && near(h, ab.H)) {      // 크기만 비교
        it.fillColor = noCol;
        fixed++;
        break;
      }
    }
  }

  // alert("✅ 투명 처리된 배경 개수: " + fixed);
})();


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
  

  var baseOrig = input;                    // 표시용(공백 포함)
  var basePath = input.replace(/ /g, "-"); // 경로·파일명용
  /* ❶ ‘뱃지’ 여부에 따라 허용 필드 수가 다름 */


  var parts = baseOrig.split("_");

  var isBadge = parts[0].indexOf("뱃지") !== -1;
  /* ❷ 형식 검사 */
  if ( (!isBadge && parts.length < 7) ||   // 일반 = 7필드 이상
      ( isBadge && parts.length < 6) ) {  // 뱃지 = 6필드 이상
    alert("❌ 입력 형식 오류"); return;
  }
  /* ❸ 필드 해석 */
  if(isBadge){var orderNo  = parts[ parts.length - 1 ];   }else{
    var orderNo  = parts[6];  
  }

  var imgKey   = (parts[0].indexOf("엣지") !== -1 ? "엣지_" : "") +
                 parts[1] + "_" + parts[2];       // 배경키

  /* 배경 이미지 & 목업 */
  var bgImg  = new File("C:/work/img/" + imgKey + ".png");
  if (!bgImg.exists) { alert("❌ 배경 이미지 없음:\n" + bgImg.fsName); return; }
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
    var sPct = (W * ratio / f.width) * 98;
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
    putText(txt1, off1, 40);
    putText(txt2, off2, 40);

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
    composite(bgImg, tmpPng, siAnFile, 1, 0.1, null, null, null, null, "GmarketSans");

    try { tmpPng.remove(); } catch (e) {}
    compositeJPGs.push(siAnFile);
  }




  /* 6) 시안전송 목업용 (시안전송용 JPG + 목업 배경) */
  var userText = prompt("시안전송 목업 JPG에 넣을 텍스트를 입력하세요:", "");
  if (userText === null) userText = "";

  // 목업 배경 없이 시안전송 JPG + 텍스트만
  stackVertically(compositeJPGs, mockFile, userText, "GmarketSans");

  function stackVertically(images, outFile, userText, fontName) {
    if (!images || images.length === 0) {
      alert("이미지가 없습니다.");
      return;
    }

    var tempDoc = app.documents.add(DocumentColorSpace.RGB, 2000, 2000);
    var placed = [];
    var totalHeight = 0;
    var maxWidth = 0;

    for (var i = 0; i < images.length; i++) {
      var f = new File(images[i]);
      if (!f.exists) continue;

      var item = tempDoc.placedItems.add();
      item.file = f;
      app.redraw();
      placed.push(item);
      totalHeight += item.height;
      if (item.width > maxWidth) maxWidth = item.width;
    }

    if (placed.length === 0) {
      tempDoc.close(SaveOptions.DONOTSAVECHANGES);
      alert("유효한 이미지가 없습니다.");
      return;
    }

    // 🆕 여백 추가
    var EXTRA_SPACE = 150;
    var totalHWithText = totalHeight + (userText ? EXTRA_SPACE : 0);

    tempDoc.artboards[0].artboardRect = [0, totalHWithText, maxWidth, 0];
    var y = totalHWithText;

    for (var i = 0; i < placed.length; i++) {
      var item = placed[i];
      y -= item.height;
      item.position = [(maxWidth - item.width) / 2, y + item.height];
    }

    if (userText && userText !== "") {
      var tf = tempDoc.textFrames.areaText(
        tempDoc.pathItems.rectangle(EXTRA_SPACE - 20, 60, maxWidth - 120, 100)
      );
      tf.contents = userText;
      var red = new RGBColor(); red.red = 255; red.green = 0; red.blue = 0;
      tf.textRange.characterAttributes.fillColor = red;
      tf.textRange.characterAttributes.size = 36;
      try {
        tf.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName || "GmarketSans");
      } catch (e) {
        tf.textRange.characterAttributes.textFont = app.textFonts[0];
      }
      tf.paragraphs[0].paragraphAttributes.justification = Justification.CENTER;
    }

    var jOpt = new ExportOptionsJPEG();
    jOpt.qualitySetting = 100;
    jOpt.resolution = 600;
    jOpt.horizontalScale = jOpt.verticalScale = 100;
    jOpt.antiAliasing = true;
    jOpt.optimized = true;
    jOpt.artBoardClipping = true;

    tempDoc.exportFile(outFile, ExportType.JPEG, jOpt);
    tempDoc.close(SaveOptions.DONOTSAVECHANGES);
  }


  /* 7) 임시 PNG 삭제 & 종료 */
  try { tmpPng.remove(); } catch (e) {}
  try { siAnFile.remove(); } catch (e) {}
  // alert("✅ JPG 3종 저장 완료 (Multiply 반영)");

})();