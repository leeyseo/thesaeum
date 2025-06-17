/**
 * ● 각 아트보드에서
 *      ① selectallinartboard 로 보이는 오브젝트 선택
 *      ② 선택된 오브젝트의 layer 이름에 "칼선"이 없으면
 *         stroked → false   (또는 strokeColor = NoColor)
 *
 * ES3 ExtendScript  |  Illustrator CS3+
 */
(function () {

  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }

  var doc   = app.activeDocument,
      noCol = new NoColor(),
      ABs   = doc.artboards,
      changed = 0;

  /* 잠금·숨김·가이드 해제 & 복구용 헬퍼 -------------------------- */
  function unlockChain(lay){
    var arr = [], cur = lay;
    while (cur){
      arr.push({layer:cur, locked:cur.locked, visible:cur.visible, template:cur.template});
      cur.locked=false; cur.visible=true; cur.template=false;
      cur = (cur.parent && cur.parent.typename==="Layer") ? cur.parent : null;
    }
    return arr;
  }
  function restore(arr){
    for (var i=0;i<arr.length;i++){
      var s = arr[i];
      s.layer.locked=s.locked; s.layer.visible=s.visible; s.layer.template=s.template;
    }
  }

  /* ── 아트보드별 루프 ───────────────────────── */
  for (var a = 0; a < ABs.length; a++) {

    /* 1) 해당 보드 활성 & 선택 */
    doc.selection = null;
    doc.artboards.setActiveArtboardIndex(a);
    app.executeMenuCommand("selectallinartboard");
    if (doc.selection.length === 0) continue;          // 비어 있으면 skip

    /* 2) 선택 항목 처리 */
    var sel = doc.selection;
    for (var i = 0; i < sel.length; i++) {

      /* 2-A. 레이어가 '칼선' 인가? */
      var lay = sel[i].layer,
          isCut = (lay.name.indexOf("칼선") !== -1);

      if (isCut) continue;                             // 건너뜀

      /* 2-B. 잠금/숨김 레이어면 잠시 해제 */
      var saved = unlockChain(lay);

      /* 2-C. 실제 stroke 제거 */
      try {
        if (sel[i].stroked) {
          sel[i].strokeColor = noCol;                  // 또는 sel[i].stroked=false;
          changed++;
        }
      } catch (_) {}

      restore(saved);
    }
  }

  doc.selection = null;
  // alert("투명으로 바꾼 테두리: "+changed+"개");

})();
