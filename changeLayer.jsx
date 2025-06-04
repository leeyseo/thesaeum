/**
 * ① 아트보드마다 새 레이어(Artboard_1 …)를 만들고
 * ② 모든 객체(잠금·숨김·Template·Guide 포함)를
 *    교차하는 모든 아트보드 레이어로 ‘복사+이동’
 * ③ 실행 전 존재했던 레이어는 전부 삭제
 *
 * ⚠️  되돌릴 수 없으니 먼저 파일을 저장(백업)하세요!
 */
(function () {
  if (app.documents.length === 0) { alert("열린 문서가 없습니다."); return; }

  var doc   = app.activeDocument,
      N_AB  = doc.artboards.length;

  /* 0) 시작 레이어 목록 저장 */
  var oldLayers = [];
  for (var L = 0; L < doc.layers.length; L++) oldLayers.push(doc.layers[L]);

  /* 1) 아트보드별 새 레이어 만들기 */
  var abLayer = [];
  for (var a = 0; a < N_AB; a++) {
    var lay = doc.layers.add();
    lay.name = "Artboard_" + (a + 1);
    abLayer.push(lay);
  }

  /* 2) 모든 PageItem ‘스냅샷’ (라이브 컬렉션 X) */
  var items = [];
  for (var i = 0; i < doc.pageItems.length; i++) items.push(doc.pageItems[i]);

  /* 3) 경계 교차 판단 함수 */
  function intersects(g, r) {
    return g[2] >= r[0] && g[0] <= r[2] && // 좌우
           g[1] >= r[3] && g[3] <= r[1];   // 상하 (AI 좌표계)
  }

  /* 4) 잠금·가이드·템플릿까지 임시 해제 후 이동 */
  function unlockAll(obj) {
    if (obj.locked)      obj.locked   = false;
    if (obj.guides)      obj.guides   = false;
    if (obj.parent && obj.parent.typename === 'Layer' && obj.parent.locked)
                        obj.parent.locked = false;
    if (obj.typename === 'PathItem' && obj.isGuides) obj.isGuides = false;
    // 템플릿 레이어는 Layer 속성 template 사용
    if (obj.parent && obj.parent.typename === 'Layer' && obj.parent.template)
                        obj.parent.template = false;
  }

  /* 5) 복사·배정 로직 */
  for (var k = 0; k < items.length; k++) {
    var it   = items[k];
    unlockAll(it);                     // 어떤 경우든 이동 가능하도록

    var g    = it.geometricBounds;     // [L,T,R,B]
    var hit  = 0;

    for (var aIdx = 0; aIdx < N_AB; aIdx++) {
      var r = doc.artboards[aIdx].artboardRect;

      if (intersects(g, r)) {
        hit++;

        // 첫 번째 교차는 원본을 그대로 이동,
        // 두 번째부터는 duplicate() 후 이동
        var target = (hit === 1) ? it : it.duplicate();
        target.move(abLayer[aIdx], ElementPlacement.PLACEATEND);
      }
    }
  }

  /* 6) 기존 레이어 통째 삭제 */
  var deleted = 0;
  for (var x = 0; x < oldLayers.length; x++) {
    try { oldLayers[x].remove(); deleted++; } catch(e){}
  }

  alert(
    "아트보드×레이어 완성!\n" +
    "복사 포함 모든 객체 이동, 삭제된 기존 레이어: " + deleted
  );
})();
