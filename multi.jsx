/* =================================================================================
   1) ensureLayerVariable()   : ① ‘레이어’ 변수 ↔ 더미 텍스트 매핑(없으면 생성)
   2) explodeDataSets()       : ② 모든 데이터셋을 레이어·아트보드로 전개
   -------------------------------------------------------------------------------
   저장:  single_script.jsx   (Illustrator 에서 한 번만 실행하면 두 단계가 연속 수행)
   ES3  /  CC~2024 테스트
   ================================================================================= */

(function () {

/* ---------- 공통 유틸 ---------- */
function unlockAndShowAll() {
  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");
}

/* =====================================================================
   1) ‘레이어’ 변수와 더미 텍스트 자동 매핑
   ===================================================================== */
function ensureLayerVariable(doc) {

  unlockAndShowAll();

  /* 1-1. 레이어 변수 확보 -------------------------------------------- */
  var layVar = null;
  for (var i = 0; i < doc.variables.length; i++) {
    if (doc.variables[i].name === "레이어") {
      layVar = doc.variables[i]; break;
    }
  }
  if (!layVar) {
    layVar      = doc.variables.add();
    layVar.name = "레이어";
    layVar.kind = VariableKind.TEXTUAL;
  }

  /* 이미 매핑돼 있으면 종료 */
  try { if (layVar.pageItems.length) return; } catch (_) {}

  /* 1-2. “레이어변수” 레이어 준비 ------------------------------------ */
  var hold;
  try { hold = doc.layers.getByName("레이어변수"); }
  catch (e) { hold = doc.layers.add(); hold.name = "레이어변수"; }

  hold.locked = false; hold.visible = true;

  /* 1-3. 더미 1-pt 텍스트 생성 & 변수 바인딩 -------------------------- */
  var AB = doc.artboards[0].artboardRect;
  var cx = (AB[0] + AB[2]) / 2,
      cy = (AB[1] + AB[3]) / 2;

  doc.activeLayer = hold;
  var tf = hold.textFrames.add();
  tf.contents = "";
  tf.textRange.characterAttributes.size = 1;
  tf.position = [cx, cy];

  try { tf.contentVariable = layVar; } catch (_) { tf.variable = layVar; }

  hold.visible = false;     // 다시 숨김
}

/* =====================================================================
   2) 데이터셋 → 각 레이어 복제 & 아트보드 배치
   ===================================================================== */
function explodeDataSets(doc) {

  if (doc.dataSets.length === 0) {
    alert("데이터셋이 없습니다."); return;
  }

  unlockAndShowAll();

  /* 2-1. 아트보드/출력_디자인 초기화 ---------------------------------- */
  while (doc.artboards.length > 1) doc.artboards[1].remove();

  var AB0  = doc.artboards[0].artboardRect,
      AB_H = AB0[1] - AB0[3],
      GAP  = 50;

  for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = false;
  try { doc.layers.getByName("출력_디자인").remove(); } catch (_) {}
  var outLayer = doc.layers.add(); outLayer.name = "출력_디자인";

  /* 2-2. 변수 참조 수집 ---------------------------------------------- */
  var layVar = null, varPairs = [];
  for (i = 0; i < doc.variables.length; i++) {
    var nm = doc.variables[i].name;
    if (nm === "레이어") layVar = doc.variables[i];
    if (nm.indexOf("이름_") === 0) {
      var idx = nm.substring(3), mate = "직책_" + idx;
      for (var j = 0; j < doc.variables.length; j++) {
        if (doc.variables[j].name === mate) {
          varPairs.push({ idx: idx,
                          nameVar  : doc.variables[i],
                          titleVar : doc.variables[j] }); break;
        }
      }
    }
  }
  if (!layVar) { alert("변수 '레이어' 가 없습니다."); return; }

  /* 2-3. 데이터셋 반복 ----------------------------------------------- */
  for (var d = 0; d < doc.dataSets.length; d++) {
    var ds = doc.dataSets[d]; ds.display(); $.sleep(60);

    /* 2-3-a. 어떤 Artboard_n 레이어를 쓸지 결정 */
    var gIdx = null, lyrVal;
    try {
      var dv = ds.getVariableValue ? ds.getVariableValue(layVar) : null;
      lyrVal = dv && (dv.textualContents || dv.contents || dv);
    } catch (_) {}
    if (!lyrVal) {          // 예: CS5 이하 fallback
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
    if (!gIdx) { alert("DS"+(d+1)+": 레이어를 판단할 수 없습니다."); continue; }

    var srcLayer;
    try { srcLayer = doc.layers.getByName("Artboard_" + gIdx); }
    catch (_) { alert("Artboard_" + gIdx + " 레이어가 없습니다."); continue; }

    /* 2-3-b. 아트보드 생성/선정 & 디자인 복제 */
    var dy   = -d * (AB_H + GAP),
        rect = [AB0[0], AB0[1] + dy, AB0[2], AB0[3] + dy],
        abIdx;

    if (d === 0) { abIdx = 0; }
    else { doc.artboards.add(rect); abIdx = doc.artboards.length - 1; }

    var grp = outLayer.groupItems.add();
    grp.name = "DS" + (d+1) + "_" + gIdx;

    for (i = 0; i < srcLayer.pageItems.length; i++) {
      var it = srcLayer.pageItems[i];
      if (!it.locked && !it.hidden) it.duplicate(grp, ElementPlacement.PLACEATEND);
    }

    /* 2-3-c. 위치 보정 */
    var bds = grp.visibleBounds, designL = bds[0], designT = bds[1];
    var abR = doc.artboards[abIdx].artboardRect, abL = abR[0], abT = abR[1];
    grp.translate(abL - designL, abT - designT);
    try { grp.artboard = abIdx; } catch (_) {}
  }

  doc.dataSets[0].display();     // 최초 데이터셋으로 복귀
}

/* =====================================================================
   >>> 메인 실행 순서 <<<
   ===================================================================== */
try {
  var doc = app.activeDocument;
  ensureLayerVariable(doc);   // ① 더미 텍스트 매핑 (필요 시)
  explodeDataSets(doc);      // ② 데이터셋 전개
//   alert("✅ 스크립트 완료!");
} catch (err) {
  alert("오류: " + err.message);
}

})();   /* IIFE 종료 */
