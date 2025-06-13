/**
 * ① 0·1번 아트보드만 남김
 * ② 나머지 짝(2·3, 4·5 …) 디자인을 첫 짝 위치로 이동
 * ③ Artboard_1 레이어만 표시
 * ES3 ExtendScript
 */
(function () {

  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument,
      N   = doc.artboards.length;

  if (N < 2) { alert("2개 이상 아트보드가 필요합니다."); return; }

  var AB0 = doc.artboards[0].artboardRect;   // 첫 아트보드 [L,T,R,B]

  /* ── 1) 짝 2·3부터 디자인 이동 ───────────────────────── */
  for (var start = 2; start < N; start += 2) {

    var pairIdx = Math.floor(start / 2) + 1;          // 2·3 → 2, 4·5 → 3 …
    var layName = "Artboard_" + pairIdx;
    var lay;

    try { lay = doc.layers.getByName(layName); }
    catch (e) { continue; }                           // 해당 레이어 없으면 패스

    /* 이동 벡터 = (짝 첫 보드의 L,T) → (0번 보드의 L,T) */
    var ABi = doc.artboards[start].artboardRect;
    var dx  = AB0[0] - ABi[0];
    var dy  = AB0[1] - ABi[1];                        // Illustrator Y+:아래

    lay.locked = false;
    for (var p = 0; p < lay.pageItems.length; p++) {
      var it = lay.pageItems[p];
      if (it.locked) it.locked = false;
      it.translate(dx, dy);
    }
  }

  /* ── 2) 0·1번을 제외한 아트보드 삭제 (뒤에서부터) ───────── */
  for (var j = N - 1; j >= 2; j--) {
    doc.artboards.remove(j);
  }

  /* ── 3) 레이어 표시 제어 : Artboard_1만 보이기 ─────────── */
  for (var L = 0; L < doc.layers.length; L++) {
    var ly = doc.layers[L];
    ly.visible = (ly.name === "Artboard_1");
  }

  // alert("✔ 첫 두 아트보드만 남기고 나머지 디자인 합치기 완료!");

})();
