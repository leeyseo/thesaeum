/**
 * 데이터셋 행마다 새 아트보드 & 디자인 배치
 *   · 첫 아트보드 좌표를 (SHIFT_X, SHIFT_Y) 만큼 이동
 *   · 열당 PER_COL개씩 아래로 → 옆으로
 */
(function () {

  /* ── 조정 변수 ─────────────────────────── */
  var GAP      = 200;   // 보드 간 간격
  var PER_COL  = 20;    // 한 열에 몇 행
  var SHIFT_X  = -4000; // ← 왼쪽(-) / 오른쪽(+)
  var SHIFT_Y  =  5000; // ↑ 위(+ ) / 아래(−)

  /* ── 기본 검사 ─────────────────────────── */
  if (app.documents.length === 0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument, DS = doc.dataSets;
  if (DS.length === 0) { alert("데이터셋이 없습니다."); return; }

  /* ── 초기화 ─────────────────────────────── */
  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");
  while (doc.artboards.length > 1) doc.artboards[1].remove();

  var AB0  = doc.artboards[0].artboardRect,        // [L,T,R,B]
      AB_W = AB0[2] - AB0[0],
      AB_H = AB0[1] - AB0[3];

  /* 첫 아트보드 위치를 SHIFT 만큼 이동 */
  AB0 = [
    AB0[0] + SHIFT_X,
    AB0[1] + SHIFT_Y,
    AB0[2] + SHIFT_X,
    AB0[3] + SHIFT_Y
  ];
  doc.artboards[0].artboardRect = AB0;

  /* 출력 레이어 준비 */
  for (var i = 0; i < doc.layers.length; i++) doc.layers[i].visible = false;
  try { doc.layers.getByName("출력_디자인").remove(); } catch(e){}
  var outLayer = doc.layers.add(); outLayer.name = "출력_디자인";

  /* ── ‘레이어’ 변수 + fallback ─────────────────── */
  var layVar=null, varPairs=[];
  for (i=0;i<doc.variables.length;i++){
    var nm = doc.variables[i].name;
    if (nm==="레이어") layVar = doc.variables[i];
    if (nm.indexOf("이름_")===0){
      var idx=nm.substring(3), mate="직책_"+idx;
      for (var j=0;j<doc.variables.length;j++)
        if (doc.variables[j].name===mate){
          varPairs.push({idx:idx,nameVar:doc.variables[i],titleVar:doc.variables[j]}); break;
        }
    }
  }
  if(!layVar){ alert("'레이어' 변수가 없습니다."); return; }

  /* ── 데이터셋 루프 ──────────────────────── */
  for (var d = 0; d < DS.length; d++) {
    DS[d].display(); $.sleep(20);

    /* 1) gIdx 결정 */
    var gIdx=null;
    try{
      var dv = DS[d].getVariableValue ? DS[d].getVariableValue(layVar) : null;
      gIdx = dv ? (dv.textualContents||dv.contents||dv) : null;
    }catch(_){}
    if(!gIdx) try{ gIdx = layVar.pageItems[0].contents; }catch(_){}
    if(gIdx) gIdx = gIdx.replace(/\s+/g,"");
    if(!gIdx || gIdx==="Nan") gIdx=null;
    if(!gIdx){
      for(i=0;i<varPairs.length;i++){
        try{
          var vN = varPairs[i].nameVar.pageItems[0].contents,
              vT = varPairs[i].titleVar.pageItems[0].contents;
          if(vN!=="Nan" && vT!=="Nan"){ gIdx = varPairs[i].idx; break; }
        }catch(_){}
      }
    }
    if(!gIdx) continue;

    /* 2) 템플릿 레이어 */
    var srcLayer;
    try { srcLayer = doc.layers.getByName("Artboard_" + gIdx); }
    catch(_) { continue; }

    /* 3) 열·행 오프셋 */
    var row = d % PER_COL,
        col = Math.floor(d / PER_COL);
    var dx  = col * (AB_W + GAP),
        dy  = row * (AB_H + GAP);

    /* 4) 새 아트보드 rect (SHIFT 이미 포함된 AB0 기준) */
    var rect = [AB0[0] + dx, AB0[1] - dy,
                AB0[2] + dx, AB0[3] - dy];
    var abIdx = (d === 0) ? 0 : doc.artboards.add(rect).index;

    /* 5) 디자인 복제 & 위치 이동 (SHIFT 포함) */
    var grp = outLayer.groupItems.add();
    grp.name = "DS" + (d+1) + "_" + gIdx;
    for (i=0;i<srcLayer.pageItems.length;i++){
      var it = srcLayer.pageItems[i];
      if (!it.locked && !it.hidden)
        it.duplicate(grp, ElementPlacement.PLACEATEND);
    }
    grp.translate(SHIFT_X + dx, SHIFT_Y - dy);
    try { grp.artboard = abIdx; } catch(_) {}
  }

  DS[0].display();                  // 원본 복귀
})();
