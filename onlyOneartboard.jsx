/**
 * ① 0번 아트보드만 남기고 나머지 삭제
 * ② Artboard_2 … 레이어 안 객체를 0번 아트보드 위치로 평행 이동
 * ③ Artboard_1 레이어만 보이도록, 나머지 레이어는 전부 숨김
 */
(function () {

  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc  = app.activeDocument,
      AB0  = doc.artboards[0].artboardRect,   // [L, T, R, B]
      N_AB = doc.artboards.length;

  /* ─────────────────────────────────────────────
   * 1) 각 레이어를 돌며, Artboard_i → Artboard_1 로 좌표 이동
   *    (왼쪽·위 모서리 기준 평행 이동)
   * ───────────────────────────────────────────── */
  for (var i = 1; i < N_AB; i++) {

    /* 1-1. 원본 아트보드 좌표 */
    var ABi = doc.artboards[i].artboardRect;   // [L, T, R, B]

    /* 1-2. 이동 벡터(dx, dy)  ─ translate(dx, dy)는
       +x : 오른쪽, +y : 아래쪽(일러스트 좌표계) */
    var dx = AB0[0] - ABi[0];   // 왼쪽 기준
    var dy = AB0[1] - ABi[1];   // 위쪽 기준

    /* 1-3. 해당 번호 레이어가 있으면 객체 이동 */
    var layName = "Artboard_" + (i + 1);
    var lay;
    try { lay = doc.layers.getByName(layName); }
    catch(e) { continue; }                    // 없으면 건너뜀

    lay.locked = false;
    for (var k = 0; k < lay.pageItems.length; k++) {
      var it = lay.pageItems[k];
      if (it.locked) it.locked = false;
      it.translate(dx, dy);                   // 평행 이동
    }
  }

  /* ─────────────────────────────────────────────
   * 2) 0번을 제외한 아트보드 삭제 (뒤에서부터 제거)
   * ───────────────────────────────────────────── */
  for (var j = N_AB - 1; j >= 1; j--) {
    doc.artboards.remove(j);
  }

  /* ─────────────────────────────────────────────
   * 3) 레이어 표시 제어 – Artboard_1만 보이기
   * ───────────────────────────────────────────── */
  for (var L = 0; L < doc.layers.length; L++) {
    var ly = doc.layers[L];
    ly.visible = (ly.name === "Artboard_1");
  }

  alert(
    "✅ 처리 완료!\n" +
    "• 남은 아트보드 : 1개 (0번)\n" +
    "• Artboard_2~N   → 0번 위치로 이동\n" +
    "• Artboard_1 레이어만 표시, 나머지는 숨김"
  );

})();

