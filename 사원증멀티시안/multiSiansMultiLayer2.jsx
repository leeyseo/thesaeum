/*************************************************************************
  멀티 시안 – 데이터셋별 앞·뒷면(좌·우) 배치 + 그룹 평탄화 + 4-변 보정 (ES3)
*************************************************************************/
(function () {

  /* ───────────── 0) 기본 설정 & 검사 ───────────── */
  var GAP      = 20;     // 앞↔뒤·행↔행 간격(pt)
  var PER_ROW  = 20;      // 한 행(가로)당 데이터셋 개수
  var SHIFT_X  = -1000;   // 전체 시안 시작점 이동 (좌)
  var SHIFT_Y  =  1000;   //                          (상)

  if (app.documents.length === 0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument,
      DS  = doc.dataSets;
  if (DS.length === 0) { alert("데이터셋이 없습니다."); return; }

  /* 모든 레이어 표시·잠금 해제 */
  for (var i = 0; i < doc.layers.length; i++) {
    doc.layers[i].visible = true;
    doc.layers[i].locked  = false;
  }
  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");

  /* ──────────── 1) 변수 매핑 ──────────── */
  var imageVars = {}, layVar = null, varPairs = [];
  for (i = 0; i < doc.variables.length; i++) {
    var nm = doc.variables[i].name;
    if (nm === "레이어") layVar = doc.variables[i];
    else if (/^이미지_\d+$/.test(nm)) imageVars[nm] = doc.variables[i];
    else if (nm.indexOf("이름_") === 0) {
      var idx  = nm.substr(3),
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
  if (!layVar) { alert("❌ '레이어' 변수를 찾을 수 없습니다."); return; }

  /* ──────────── 2) 아트보드 초기화 ──────────── */

  var rect0 = doc.artboards[0].artboardRect;   // [L,T,R,B]
  var rect1 = doc.artboards[1].artboardRect;
  GAP = rect1[0] - rect0[2];                   // 뒤 보드 L − 앞 보드 R
  if (GAP < 0) GAP = 0;                        // (예외 보호)
  
  while (doc.artboards.length > 1) doc.artboards[1].remove();
  var AB0   = doc.artboards[0].artboardRect,         // [L,T,R,B]
      AB_W  = AB0[2] - AB0[0],
      AB_H  = AB0[1] - AB0[3];
  AB0 = [AB0[0] + SHIFT_X, AB0[1] + SHIFT_Y,
         AB0[2] + SHIFT_X, AB0[3] + SHIFT_Y];
  doc.artboards[0].artboardRect = AB0;

  /* 출력 레이어 재생성 */
  try { doc.layers.getByName("출력_디자인").remove(); } catch (_) {}
  var outLayer = doc.layers.add();  outLayer.name = "출력_디자인";

  /* ──────────── 헬퍼 함수 ──────────── */
  /* ① 클리핑 기준 바운드 */
  function getClipBounds(item) {
    var st = [item];
    while (st.length) {
      var it = st.pop();
      if (it.typename === "PathItem" && it.clipping) return it.geometricBounds;
      if (it.pageItems)
        for (var k = 0; k < it.pageItems.length; k++) st.push(it.pageItems[k]);
    }
    return item.visibleBounds;
  }
  /* ② 그룹 평탄화 */
  function flattenGroup(grp) {
    var p = grp.parent;
    while (grp.pageItems.length)
      grp.pageItems[0].move(p, ElementPlacement.PLACEATEND);
    grp.remove();
  }
  /* ③ 그룹 1차 정렬 (좌상 모서리) */
  function alignGroup(grp, abIdx) {
    var b  = getClipBounds(grp),
        ab = doc.artboards[abIdx].artboardRect;
    var dx = ab[0] - b[0],
        dy = ab[1] - b[1];
    grp.position = [grp.position[0] + dx, grp.position[1] + dy];
    try { grp.artboard = abIdx; } catch (_) {}
  }
  /* ④ 배열의 클리핑-바운드 합집합 */
  function unionClipBounds(arr) {
    var L =  1e9, T = -1e9, R = -1e9, B =  1e9;
    for (var u = 0; u < arr.length; u++) {
      var vb = getClipBounds(arr[u]);
      if (vb[0] < L) L = vb[0];
      if (vb[1] > T) T = vb[1];
      if (vb[2] > R) R = vb[2];
      if (vb[3] < B) B = vb[3];
    }
    return [L, T, R, B];
  }
  /* ⑤ 앞면: 좌·상 모서리 정렬 */
  function alignItemsFront(arr, abIdx) {
    if (arr.length === 0) return;
    var ub = unionClipBounds(arr),
        ab = doc.artboards[abIdx].artboardRect;
    var dx = ab[0] - ub[0],
        dy = ab[1] - ub[1];
    for (var u = 0; u < arr.length; u++) {
      arr[u].position = [
        arr[u].position[0] + dx,
        arr[u].position[1] + dy
      ];
      try { arr[u].artboard = abIdx; } catch (_) {}
    }
  }
  /* ⑥ 뒷면: 4-변 모두 정렬 */
  function alignItemsBack(arr, abIdx) {
    if (arr.length === 0) return;
    var ub = unionClipBounds(arr),
        ab = doc.artboards[abIdx].artboardRect;

    /* 좌·상 맞춤 → 이후 우·하 차이 계산 */
    var dx = ab[0] - ub[0],
        dy = ab[1] - ub[1];
    var widthDiff  = (ab[2] - ab[0]) - (ub[2] - ub[0]);
    var heightDiff = (ab[1] - ab[3]) - (ub[1] - ub[3]);

    dx += widthDiff;          // 오른쪽 맞춤
    dy -= heightDiff;         // 아래쪽 맞춤 (Y축 ↑)

    for (var u = 0; u < arr.length; u++) {
      arr[u].position = [
        arr[u].position[0] + dx,
        arr[u].position[1] + dy
      ];
      try { arr[u].artboard = abIdx; } catch (_) {}
    }
  }

  /* ──────────── 3) 데이터셋 루프 ──────────── */
  for (var d = 0; d < DS.length; d++) {

    DS[d].display(); $.sleep(30);

    /* 3-1) gIdx(레이어 번호) 찾기 – 기존 로직 유지 */
    var gIdx = null;
    try {
      var dv = DS[d].getVariableValue ? DS[d].getVariableValue(layVar) : null;
      gIdx = dv ? (dv.textualContents || dv.contents || dv) : null;
    } catch (_) {}
    if (!gIdx) try { gIdx = layVar.pageItems[0].contents; } catch (_) {}
    if (gIdx) gIdx = gIdx.replace(/\s+/g, "");
    if (!gIdx || gIdx === "Nan") {
      for (i = 0; i < varPairs.length; i++) {
        try {
          var vN = varPairs[i].nameVar.pageItems[0].contents,
              vT = varPairs[i].titleVar.pageItems[0].contents;
          if (vN !== "Nan" && vT !== "Nan") { gIdx = varPairs[i].idx; break; }
        } catch (_) {}
      }
    }
    if (!gIdx) { alert("DS" + (d + 1) + " : 레이어 판단 실패"); continue; }

    /* 3-2) 원본 레이어 */
    var srcLayer;
    try { srcLayer = doc.layers.getByName("Artboard_" + gIdx); }
    catch (_) { continue; }

    // /* 3-2) 원본 레이어(srcLayer) 얻은 직후 ─ 여기에 삽입 */
    // (function () {
    //     var used = {};                          // 중복 제거용 해시
    //     for (var k = 0; k < srcLayer.pageItems.length; k++)
    //         used[srcLayer.pageItems[k].artboard] = true;

    //     var abList = [];                        // 고유 아트보드 번호 배열
    //     for (var key in used) if (used.hasOwnProperty(key)) abList.push(+key);  // 숫자 변환

    //     abList.sort(function (a, b) { return a - b; });   // 보기 좋게 정렬

    //     alert(
    //         "DS #" + (d + 1) +
    //         "  |  사용된 아트보드: " + abList.join(", ") +
    //         "  (총 " + abList.length + "개)"
    //     );
    // })();


    /* 3-3) 앞/뒤 판별 */
    var frontAB =  9999, backAB = -9999;
    for (i = 0; i < srcLayer.pageItems.length; i++) {
      var aIdx = srcLayer.pageItems[i].artboard;
      if (aIdx < frontAB) frontAB = aIdx;
      if (aIdx > backAB)  backAB  = aIdx;
    }

    /* 3-4) 아트보드 Rect 계산 */
    var row   = d % PER_ROW,
        col   = Math.floor(d / PER_ROW);

    var pairW = AB_W * 2 + GAP;
    var baseX = col * (pairW + GAP),
        baseY = row * (AB_H  + GAP);

    var rectF = [AB0[0] + baseX,
                 AB0[1] - baseY,
                 AB0[2] + baseX,
                 AB0[3] - baseY];

    var rectB = [rectF[0] + AB_W + GAP,
                 rectF[1],
                 rectF[2] + AB_W + GAP,
                 rectF[3]];

    /* 3-5) 아트보드 생성/재사용 — ★ AOoC 방지 */
    var abFIdx;
    if (d === 0) {
      abFIdx = 0;
      doc.artboards[abFIdx].artboardRect = rectF; // 시작점 보정
    } else {
      try {
        doc.artboards.add(rectF);
      } catch (e) {
        // 캔버스 한계로 실패하면, 다음 열로 넘겨 재시도
        col += 1; row = 0;
        baseX = col * (pairW + GAP);
        baseY = 0;
        rectF = [AB0[0] + baseX, AB0[1] - baseY, AB0[2] + baseX, AB0[3] - baseY];
        doc.artboards.add(rectF);
      }
      abFIdx = doc.artboards.length - 1;
    }
    try {
      doc.artboards.add(rectB);
    } catch (e2) {
      // 뒷면도 동일하게 다음 열로
      col += 1; row = 0;
      baseX = col * (pairW + GAP);
      baseY = 0;
      rectB = [AB0[0] + baseX + AB_W + GAP, AB0[1] - baseY,
              AB0[2] + baseX + AB_W + GAP, AB0[3] - baseY];
      doc.artboards.add(rectB);
    }
    var abBIdx = doc.artboards.length - 1;


    // /* ── DEBUG: srcLayer 안 오브젝트의 artboard 분포 ── */
    // (function () {
    //     var cnt = {}, numNaN = 0;
    //     for (var k = 0; k < srcLayer.pageItems.length; k++) {
    //         var idx = srcLayer.pageItems[k].artboard;   // -1, 0, 1 …
    //         if (isNaN(idx)) { numNaN++; idx = "NaN"; }
    //         cnt[idx] = (cnt[idx] || 0) + 1;
    //     }
    //     var msg = "DS #" + (d+1) + "  artboard 분포\n";
    //     for (var key in cnt) msg += "  [" + key + "] ▶ " + cnt[key] + "\n";
    //     alert(msg);
    // })();

    /* 3-6) 앞·뒤 그룹 복제 + 아이템 배열 */
    var grpF = outLayer.groupItems.add(); grpF.name = "DS" + (d + 1) + "_" + gIdx + "_Front";
    var grpB = outLayer.groupItems.add(); grpB.name = "DS" + (d + 1) + "_" + gIdx + "_Back";

    var itemsF = [], itemsB = [];
    for (i = 0; i < srcLayer.pageItems.length; i++) {
      var pit = srcLayer.pageItems[i];
      if (pit.locked || pit.hidden) continue;

      if (pit.artboard === frontAB)
        itemsF.push( pit.duplicate(grpF, ElementPlacement.PLACEATEND) );
      else if (pit.artboard === backAB)
        itemsB.push( pit.duplicate(grpB, ElementPlacement.PLACEATEND) );
    }

    // if (itemsB.length === 0) {
    //   alert("⚠️  DS #" + (d + 1) + " : 뒷면 항목이 없습니다!");
    // }

    /* 3-7) 1차 정렬 → Ungroup → 2차(최종) 정렬 */
    alignGroup(grpF, abFIdx);
    alignGroup(grpB, abBIdx);

    flattenGroup(grpF);
    flattenGroup(grpB);

    alignItemsFront(itemsF, abFIdx);  // 앞면: 좌·상
    alignItemsBack(itemsB,  abBIdx);  // 뒷면: 4-변
  }

  /* ──────────── 4) 마무리 ──────────── */
  DS[0].display();
  for (i = 0; i < doc.layers.length; i++)
    doc.layers[i].visible = (doc.layers[i].name === "출력_디자인");

  // alert("✅ 앞·뒷면 모두 아트보드에 정확히 배치되었습니다!");

})();
