// (function () {
//   var doc = app.activeDocument;
//   if (!doc) { alert("문서가 없습니다."); return; }

//   /* ── 기본 설정 ─────────────────────────────────────────────── */
//   var dsCount = doc.dataSets.length;
//   if (dsCount === 0) { alert("데이터셋이 없습니다."); return; }

//   // 기존 아트보드 1개만 남기고 제거
//   while (doc.artboards.length > 1) doc.artboards[1].remove();
//   var baseRect = doc.artboards[0].artboardRect;
//   var abH = baseRect[1] - baseRect[3], GAP = 50;

//   // 모든 레이어 숨김
//   for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = false;

//   // 이전 출력 레이어 제거 후 새로 생성
//   try { doc.layers.getByName("출력_디자인").remove(); } catch(e){}
//   var outLayer = doc.layers.add();  outLayer.name = "출력_디자인";

//   /* ── 이름/직책 변수쌍 확보 ────────────────────────────────── */
//   var varPairs = [];            // {idx, nameVar, titleVar}
//   for (i = 0; i < doc.variables.length; i++){
//     var n = doc.variables[i].name;
//     if (n.indexOf("이름_") === 0){
//       var idx = n.substring(3), t = "직책_" + idx;
//       for (var j = 0; j < doc.variables.length; j++){
//         if (doc.variables[j].name === t){
//           varPairs.push({idx: idx, nameVar: doc.variables[i], titleVar: doc.variables[j]});
//           break;
//         }
//       }
//     }
//   }

//   /* ── 데이터셋별 처리 ──────────────────────────────────────── */
//   for (var d = 0; d < dsCount; d++){
//     var ds = doc.dataSets[d];
//     ds.display();       $.sleep(80);

//     /* 1) 정상 그룹 판정 */
//     var gIdx = null;
//     for (i = 0; i < varPairs.length; i++){
//       try{
//         var vN = varPairs[i].nameVar.pageItems[0].contents;
//         var vT = varPairs[i].titleVar.pageItems[0].contents;
//         if (vN !== "Nan" && vT !== "Nan"){ gIdx = varPairs[i].idx; break; }
//       }catch(e){}
//     }
//     if (!gIdx){ alert("데이터셋 "+(d+1)+" : 정상 그룹 없음"); continue; }

//     /* 2) 원본 레이어 확보 */
//     var srcLayer;
//     try { srcLayer = doc.layers.getByName("Artboard_" + gIdx); }
//     catch(e){ alert("레이어 Artboard_"+gIdx+" 없음"); continue; }

//     /* 3) 새 아트보드 생성 */
//     var dy = -d * (abH + GAP);
//     var newRect = [baseRect[0], baseRect[1]+dy, baseRect[2], baseRect[3]+dy];
//     var abIdx = (d===0)? 0 : doc.artboards.add(newRect).index;

//     /* 4) 출력 레이어 안에 데이터셋 전용 그룹 생성 */
//     var grp = outLayer.groupItems.add();
//     grp.name = "DS"+(d+1)+"_"+gIdx;    // 예: DS3_2

//     /* 5) 디자인 복사 → 그룹 */
//     for (i = 0; i < srcLayer.pageItems.length; i++){
//       var it = srcLayer.pageItems[i];
//       if (!it.locked && !it.hidden)
//         it.duplicate(grp, ElementPlacement.PLACEATEND);
//     }

//     /* 6) 그룹 위치·아트보드 지정 */
//     grp.position = [grp.position[0], grp.position[1] + dy];
//     try { grp.artboard = abIdx; } catch(e){}
//   }

//   /* ── 끝 ──────────────────────────────────────────────────── */
//   doc.dataSets[0].display();
//   // alert("✅ 모든 디자인 생성 완료!");
// })();




// (function () {
//   var doc = app.activeDocument;
//   if (!doc) { alert("문서가 없습니다."); return; }

//   var dsCount = doc.dataSets.length;
//   if (dsCount === 0) { alert("데이터셋이 없습니다."); return; }

//   // 기존 아트보드 정리
//   while (doc.artboards.length > 1) doc.artboards[1].remove();
//   var baseRect = doc.artboards[0].artboardRect;
//   var abH = baseRect[1] - baseRect[3], GAP = 50;

//   // 레이어 숨기기
//   for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = false;

//   // 출력 레이어 재생성
//   try { doc.layers.getByName("출력_디자인").remove(); } catch(e){}
//   var outLayer = doc.layers.add(); outLayer.name = "출력_디자인";

//   // 이름-직책 변수쌍
//   var varPairs = [];
//   var 레이어변수 = null;
//   for (i = 0; i < doc.variables.length; i++) {
//     var n = doc.variables[i].name;

//     if (n === "레이어") 레이어변수 = doc.variables[i];

//     if (n.indexOf("이름_") === 0) {
//       var idx = n.substring(3), t = "직책_" + idx;
//       for (var j = 0; j < doc.variables.length; j++) {
//         if (doc.variables[j].name === t) {
//           varPairs.push({idx: idx, nameVar: doc.variables[i], titleVar: doc.variables[j]});
//           break;
//         }
//       }
//     }
//   }

/**
 * 데이터셋마다 “레이어” 값으로 Artboard_N 레이어 선택 후 디자인 복제
 * 1) 레이어 변수 값(ds.getVariableValue) → gIdx
 * 2) 값이 Nan/빈값이면 이름·직책 쌍으로 대체
 * 3) 그래도 없으면 건너뜀
 * ES3 호환
 */
(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다."); return; }
  if (doc.dataSets.length === 0) { alert("데이터셋이 없습니다."); return; }

  /* ── 0. 초기화 ─────────────────────────────────────────── */
  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");

  while (doc.artboards.length > 1) doc.artboards[1].remove();
  var AB0  = doc.artboards[0].artboardRect,
      AB_H = AB0[1] - AB0[3],
      GAP  = 50;

  for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = false;
  try { doc.layers.getByName("출력_디자인").remove(); } catch (_) {}
  var outLayer = doc.layers.add(); outLayer.name = "출력_디자인";

  /* ── 1. 변수 테이블 스캔 ──────────────────────────────── */
  var layVar   = null,
      varPairs = [];               // {idx,nameVar,titleVar}

  for (i = 0; i < doc.variables.length; i++) {
    var nm = doc.variables[i].name;
    if (nm === "레이어") layVar = doc.variables[i];

    if (nm.indexOf("이름_") === 0) {
      var idx  = nm.substring(3),
          mate = "직책_" + idx;
      for (var j = 0; j < doc.variables.length; j++)
        if (doc.variables[j].name === mate) {
          varPairs.push({ idx: idx,
                          nameVar:  doc.variables[i],
                          titleVar: doc.variables[j] });
          break;
        }
    }
  }
  if (!layVar) { alert("변수 '레이어' 가 없습니다."); return; }

  /* ── 2. 데이터셋 루프 ────────────────────────────────── */
  for (var d = 0; d < doc.dataSets.length; d++) {
    var ds = doc.dataSets[d];
    ds.display(); $.sleep(60);

    /* 2-1) 레이어 변수 값 읽기 */
    var gIdx = null, lyrVal = null;
    try {
      // CS6+ : getVariableValue
      if (typeof ds.getVariableValue === "function") {
        var dv = ds.getVariableValue(layVar);
        lyrVal = dv.textualContents || dv.contents || dv;
      }
    } catch (_) {}

    // 구버전/호환: pageItems[0].contents
    if (lyrVal == null) {
      try { lyrVal = layVar.pageItems[0].contents; } catch (_) {}
    }

    if (lyrVal && lyrVal !== "Nan") gIdx = lyrVal;
    // alert("DS"+(d+1)+" → 레이어 값: "+ (lyrVal || "읽기 실패"));

    /* 2-2) fallback: 이름/직책 */
    if (!gIdx) {
      for (i = 0; i < varPairs.length; i++) {
        try {
          var vN = varPairs[i].nameVar.pageItems[0].contents,
              vT = varPairs[i].titleVar.pageItems[0].contents;
          if (vN !== "Nan" && vT !== "Nan") { gIdx = varPairs[i].idx; break; }
        } catch (_) {}
      }
    }

    if (!gIdx) {                // 최종 실패 시 건너뜀
      alert("DS"+(d+1)+" : 사용할 레이어를 판단할 수 없습니다.");
      continue;
    }

    /* ── 3. 원본 레이어 확보 & 복제 ────────────────────── */
    var srcLayer;
    try { srcLayer = doc.layers.getByName("Artboard_" + gIdx); }
    catch (_) {
      alert("Artboard_"+gIdx+" 레이어가 없습니다.");  continue;
    }

    var dy    = -d * (AB_H + GAP),
        rect  = [AB0[0], AB0[1]+dy, AB0[2], AB0[3]+dy],
        abIdx = (d === 0) ? 0 : doc.artboards.add(rect).index;

    var grp = outLayer.groupItems.add();
    grp.name = "DS"+(d+1)+"_"+gIdx;

    for (i = 0; i < srcLayer.pageItems.length; i++) {
      var it = srcLayer.pageItems[i];
      if (!it.locked && !it.hidden)
        it.duplicate(grp, ElementPlacement.PLACEATEND);
    }
    grp.position = [grp.position[0], grp.position[1] + dy];
    try { grp.artboard = abIdx; } catch (_) {}
  }

  /* ── 3. 끝 ──────────────────────────────────────────── */
  doc.dataSets[0].display();   // 원본 복귀
})();
