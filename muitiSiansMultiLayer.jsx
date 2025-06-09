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



(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다."); return; }

  var dsCount = doc.dataSets.length;
  if (dsCount === 0) { alert("데이터셋이 없습니다."); return; }

  // 기존 아트보드 정리
  while (doc.artboards.length > 1) doc.artboards[1].remove();
  var baseRect = doc.artboards[0].artboardRect;
  var abH = baseRect[1] - baseRect[3], GAP = 50;

  // 레이어 숨기기
  for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = false;

  // 출력 레이어 재생성
  try { doc.layers.getByName("출력_디자인").remove(); } catch(e){}
  var outLayer = doc.layers.add(); outLayer.name = "출력_디자인";

  // 이름-직책 변수쌍
  var varPairs = [];
  var 레이어변수 = null;
  for (i = 0; i < doc.variables.length; i++) {
    var n = doc.variables[i].name;

    if (n === "레이어") 레이어변수 = doc.variables[i];

    if (n.indexOf("이름_") === 0) {
      var idx = n.substring(3), t = "직책_" + idx;
      for (var j = 0; j < doc.variables.length; j++) {
        if (doc.variables[j].name === t) {
          varPairs.push({idx: idx, nameVar: doc.variables[i], titleVar: doc.variables[j]});
          break;
        }
      }
    }
  }

  // 데이터셋별 출력
  for (var d = 0; d < dsCount; d++) {
    var ds = doc.dataSets[d];
    ds.display(); $.sleep(80);

    // ── (1) 레이어 변수 우선 사용 ──
    var gIdx = null;
    if (레이어변수) {
      try {
        var layerValue = 레이어변수.pageItems[0].contents;
        if (layerValue && layerValue !== "Nan") {
          gIdx = layerValue;
        }
      } catch(e) {}
    }

    // ── (2) fallback: 이름/직책 기반 ──
    if (!gIdx) {
      for (i = 0; i < varPairs.length; i++) {
        try {
          var vN = varPairs[i].nameVar.pageItems[0].contents;
          var vT = varPairs[i].titleVar.pageItems[0].contents;
          if (vN !== "Nan" && vT !== "Nan") {
            gIdx = varPairs[i].idx;
            break;
          }
        } catch(e) {}
      }
    }

    if (!gIdx) {
      alert("데이터셋 " + (d+1) + " : 사용할 그룹을 판단할 수 없습니다.");
      continue;
    }

    // ── (3) 레이어 복사 ──
    var srcLayer;
    try {
      srcLayer = doc.layers.getByName("Artboard_" + gIdx);
    } catch(e) {
      alert("레이어 Artboard_" + gIdx + " 없음"); continue;
    }

    var dy = -d * (abH + GAP);
    var newRect = [baseRect[0], baseRect[1]+dy, baseRect[2], baseRect[3]+dy];
    var abIdx = (d === 0) ? 0 : doc.artboards.add(newRect).index;

    var grp = outLayer.groupItems.add();
    grp.name = "DS" + (d+1) + "_" + gIdx;

    for (i = 0; i < srcLayer.pageItems.length; i++) {
      var it = srcLayer.pageItems[i];
      if (!it.locked && !it.hidden)
        it.duplicate(grp, ElementPlacement.PLACEATEND);
    }

    grp.position = [grp.position[0], grp.position[1] + dy];
    try { grp.artboard = abIdx; } catch(e){}
  }

  doc.dataSets[0].display();
})();