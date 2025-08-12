/**
 * ⚡ Illustrator 전체 레이어의 텍스트 프레임을 검사해
 *    "<br>"(소문자) 문자열을 줄바꿈(\r)으로 치환
 *    – 잠겨 있거나 숨겨진 텍스트는 건너뜀
 *    – ES3 ExtendScript 호환
 */
(function () {
  var doc = app.activeDocument;
  if (!doc) { alert("열린 문서가 없습니다."); return; }

  var changed = 0, skipped = 0;

  for (var i = 0; i < doc.textFrames.length; i++) {
    var tf = doc.textFrames[i];
    if (tf.locked || tf.hidden) { skipped++; continue; }

    var txt = tf.contents;
    if (txt && txt.indexOf("<Br>") !== -1) {
      tf.contents = txt.replace(/<Br>/g, "\r");   // Illustrator 줄바꿈 = "\r"
      changed++;
    }
  }

  // alert("✅ 변환 완료\n치환된 프레임: " + changed + "\n건너뛴 프레임: " + skipped);
})();