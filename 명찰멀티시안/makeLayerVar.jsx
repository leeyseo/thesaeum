/**
 * ▸ “레이어” 변수 ←→ 더미 텍스트 1개 자동 매핑
 * ▸ 더미 텍스트는 **단 하나의** 레이어 “레이어변수” 안에 생성
 * ▸ 이미 레이어와 매핑이 있으면 새로 만들지 않음
 * ES3 ExtendScript
 */
(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다."); return; }



  /* ── 0. 전역 잠금·숨김 해제 ── */
  app.executeMenuCommand("unlockAll");
  app.executeMenuCommand("showAll");

  /* ── 1. ‘레이어’ 변수 확보 ── */
  var layVar = null, i;
  for (i = 0; i < doc.variables.length; i++)
    if (doc.variables[i].name === "레이어") { layVar = doc.variables[i]; break; }

  if (!layVar) {
    layVar = doc.variables.add();
    layVar.name = "레이어";
    layVar.kind = VariableKind.TEXTUAL;
  }

  /* 이미 매핑돼 있으면 아무것도 하지 않음 */
  try { if (layVar.pageItems.length > 0) { ; return; } }
  catch (_) {}   // 일부 버전 예외 무시

  /* ── 2. 레이어 “레이어변수” 준비 (중복 생성 X) ── */
  var holdLayer;
  try { holdLayer = doc.layers.getByName("레이어변수"); }
  catch (e) { holdLayer = doc.layers.add(); holdLayer.name = "레이어변수"; }

  holdLayer.locked   = false;   // 수정 가능
  holdLayer.template = false;
  holdLayer.visible  = true;    // 생성·확인 시 잠깐 보이도록

  /* ── 3. 더미 텍스트를 아트보드 중앙에 생성 ── */
  var AB = doc.artboards[0].artboardRect;   // [L, T, R, B]
  var cx = (AB[0] + AB[2]) / 2;
  var cy = (AB[1] + AB[3]) / 2;

  doc.activeLayer = holdLayer;
  var tf = holdLayer.textFrames.add();
  tf.contents = "";
  tf.textRange.characterAttributes.size = 1;  // 1 pt
  tf.position = [cx, cy];                     // 중앙

  /* ── 4. 변수와 바인딩 ── */
  try { tf.contentVariable = layVar; }        // CS6+
  catch (e) { tf.variable = layVar; }         // 구버전

  /* ── 5. 레이어 숨김 처리 ── */
  holdLayer.visible = false;

  // alert("✅ 더미 텍스트가 '레이어' 변수에 매핑되었습니다.\n(레이어 '레이어변수'는 숨김 처리됨)");
})();
