
(function () {
  /* ───────────────── 기본 검사 ───────────────── */
  var GAP=200, PER_COL=20, SHIFT_X=-1000, SHIFT_Y=1000;
  if (app.documents.length===0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument, DS = doc.dataSets;
  if (DS.length===0) { alert("데이터셋이 없습니다."); return; }

  /* 모든 레이어 표시·잠금 해제 */
  for (var i=0; i<doc.layers.length; i++) { doc.layers[i].visible=true; doc.layers[i].locked=false; }
  app.executeMenuCommand("unlockAll"); app.executeMenuCommand("showAll");

  /* ───────── 변수 매핑 ───────── */
  var imageVars={}, layVar=null, varPairs=[];
  for (i=0;i<doc.variables.length;i++){
    var nm=doc.variables[i].name;
    if (nm==="레이어") layVar=doc.variables[i];
    else if (/^이미지_\d+$/.test(nm)) imageVars[nm]=doc.variables[i];
    else if (nm.indexOf("이름_")===0){
      var idx=nm.substr(3), mate="직책_"+idx;
      for (var j=0;j<doc.variables.length;j++)
        if (doc.variables[j].name===mate)
          { varPairs.push({idx:idx,nameVar:doc.variables[i],titleVar:doc.variables[j]}); break; }
    }
  }
  if (!layVar){ alert("❌ '레이어' 변수를 찾을 수 없습니다."); return; }

  /* ───────── 아트보드 초기화 ───────── */
  while (doc.artboards.length>1) doc.artboards[1].remove();
  var AB0 = doc.artboards[0].artboardRect,
      AB_W = AB0[2]-AB0[0], AB_H = AB0[1]-AB0[3];
  AB0 = [AB0[0]+SHIFT_X, AB0[1]+SHIFT_Y, AB0[2]+SHIFT_X, AB0[3]+SHIFT_Y];
  doc.artboards[0].artboardRect = AB0;

  /* 기존 출력 레이어 제거 후 새로 생성 */
  try{ doc.layers.getByName("출력_디자인").remove(); }catch(e){}
  var outLayer = doc.layers.add(); outLayer.name="출력_디자인";

  /* ───────── 헬퍼: 마스크 바운드 계산 ───────── */
  function getClipBounds(item){
    var stack=[item];
    while(stack.length){
      var it = stack.pop();
      if (it.typename==="PathItem" && it.clipping) return it.geometricBounds;
      if (it.pageItems){
        for (var k=0;k<it.pageItems.length;k++) stack.push(it.pageItems[k]);
      }
    }
    return item.visibleBounds;        // 마스크 없으면 기본값
  }

  /* ───────── 데이터셋 루프 ───────── */
  for (var d=0; d<DS.length; d++){
    DS[d].display(); $.sleep(30);

    /* 레이어 인덱스 판단 */
    var gIdx=null;
    try{
      var dv=DS[d].getVariableValue?DS[d].getVariableValue(layVar):null;
      gIdx=dv?(dv.textualContents||dv.contents||dv):null;
    }catch(_){}
    if (!gIdx) try{ gIdx=layVar.pageItems[0].contents; }catch(_){}
    if (gIdx) gIdx=gIdx.replace(/\s+/g,"");
    if (!gIdx||gIdx==="Nan") gIdx=null;

    if (!gIdx){
      for (i=0;i<varPairs.length;i++){
        try{
          var vN=varPairs[i].nameVar.pageItems[0].contents,
              vT=varPairs[i].titleVar.pageItems[0].contents;
          if (vN!=="Nan"&&vT!=="Nan"){ gIdx=varPairs[i].idx; break; }
        }catch(_){}
      }
    }
    if (!gIdx){ alert("DS"+(d+1)+" : 레이어 판단 실패"); continue; }

    /* 이미지 파일 재연결 */
    var imgVar=imageVars["이미지_"+gIdx];
    if (imgVar && imgVar.pageItems.length && imgVar.pageItems[0].typename==="PlacedItem"){
      var it=imgVar.pageItems[0];
      try{
        var abs=decodeURI(it.file.fullName), f=File(abs);
        if (f.exists) { it.file=f; $.writeln("✅ 이미지 재연결: "+abs); }
        else          { $.writeln("❌ 이미지 없음: "+abs); }
      }catch(e){ $.writeln("❌ 이미지 연결 실패: "+e); }
    }

    /* 원본 레이어 → 복제 */
    var srcLayer;
    try{ srcLayer=doc.layers.getByName("Artboard_"+gIdx); }catch(_){ continue; }

    /* 새 아트보드 배치 좌표 */
    var row=d%PER_COL, col=Math.floor(d/PER_COL);
    var dx=col*(AB_W+GAP), dy=row*(AB_H+GAP);
    var rect=[AB0[0]+dx, AB0[1]-dy, AB0[2]+dx, AB0[3]-dy];
    var abIdx=(d===0)?0:(doc.artboards.add(rect), doc.artboards.length-1);

    /* 그룹 복제 */
    var grp=outLayer.groupItems.add(); grp.name="DS"+(d+1)+"_"+gIdx;
    for (i=0;i<srcLayer.pageItems.length;i++){
      var it2=srcLayer.pageItems[i];
      if (!it2.locked&&!it2.hidden)
        it2.duplicate(grp, ElementPlacement.PLACEATEND);
    }

    /* ―― ▶ 위치 보정: 클리핑 마스크 기준 ―― */
    var b=getClipBounds(grp);               // [L,T,R,B] (마스크 없으면 visibleBounds)
    var designLeft=b[0], designTop=b[1];
    var abRect=doc.artboards[abIdx].artboardRect;
    var abLeft=abRect[0], abTop=abRect[1];
    grp.position=[grp.position[0]+(abLeft-designLeft),
                  grp.position[1]+(abTop -designTop)];

    try{ grp.artboard=abIdx; }catch(_){}
  }

  /* 첫 DS 표시 + 출력 레이어만 보이도록 */
  DS[0].display();
  for (i=0;i<doc.layers.length;i++)
    doc.layers[i].visible=(doc.layers[i].name==="출력_디자인");

  // alert("✅ 클리핑 마스크 제외하고 보이는 디자인 기준으로 배치 완료!");
})();
