(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다"); return; }

  /* === 파라미터 === */
  var gap = 50;          // 아트보드 간 간격
  var detachTemplate = true; // 템플릿도 링크 끊어 세트0 유지

  /* === 템플릿 아트보드 === */
  var tplIdx = doc.artboards.getActiveArtboardIndex();
  var tplAB  = doc.artboards[tplIdx].artboardRect;  // [L,T,R,B]
  var abH    = tplAB[1] - tplAB[3];

  /* === 데이터 세트 존재? === */
  if (doc.dataSets.length === 0){
    alert("데이터 세트(Variables)가 없습니다"); return;
  }

  /* === 템플릿 오브젝트 수집 === */
  function inside(ab, item){
    var g=item.geometricBounds;
    return g[2]>=ab[0] && g[0]<=ab[2] && g[1]>=ab[3] && g[3]<=ab[1];
  }
  var tplItems=[];
  for (var i=0;i<doc.pageItems.length;i++){
    var it=doc.pageItems[i];
    if (!it.locked && !it.hidden && inside(tplAB,it)) tplItems.push(it);
  }
  if (tplItems.length===0){ alert("템플릿 내부 오브젝트가 없습니다"); return; }

  /* ---- 템플릿 링크도 끊어 세트0 고정 ---- */
  if (detachTemplate){
    for (var t=0;t<tplItems.length;t++){
      if (tplItems[t].contentVariable)    tplItems[t].contentVariable = null;
      if (tplItems[t].pageItemVariable)   tplItems[t].pageItemVariable = null;
      if (tplItems[t].visibilityVariable) tplItems[t].visibilityVariable = null;
    }
  }

  /* === 루프: 세트마다 복제 & 고정 === */
  var offsetY=0;
  for (var d=0; d<doc.dataSets.length; d++){

    doc.dataSets[d].display();          // ① 세트 적용

    /* 새 보드 + 복제 */
    if (d>0){
      offsetY -= (abH + gap);
      var newAB=[tplAB[0],tplAB[1]+offsetY,tplAB[2],tplAB[3]+offsetY];
      var abIdx = doc.artboards.add(newAB);

      for (var k=0;k<tplItems.length;k++){
        var dup = tplItems[k].duplicate();
        dup.position=[dup.position[0], dup.position[1]+offsetY];
        dup.artboard = abIdx;

        /* ③ 링크 끊기 → 고정 */
        if (dup.contentVariable)    dup.contentVariable = null;
        if (dup.pageItemVariable)   dup.pageItemVariable = null;
        if (dup.visibilityVariable) dup.visibilityVariable = null;
      }
    }
  }

  alert("데이터 세트 "+doc.dataSets.length+"개 → 아트보드 "+
        doc.artboards.length+"개 배치 완료!");
})();
