

(function () {

  /* 0) 기본 검사 */
  if (app.documents.length === 0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument;
  if (doc.selection.length === 0) { alert("선택된 오브젝트가 없습니다."); return; }

  var imgFile = new File("C:/work/img/default.png");
  if (!imgFile.exists) { alert("이미지 파일 없음:\n" + imgFile.fsName); return; }

  /* 1) 선택 항목별 처리 */
  var cnt = 0;
  for (var i = doc.selection.length - 1; i >= 0; i--) {   // 뒤에서부터 안전하게 삭제
    var sel = doc.selection[i];
    var lay = sel.layer;

    /* 잠금 해제(필요 시) */
    var wasLocked = lay.locked;
    if (wasLocked) lay.locked = false;

    /* 바운드 계산 */
    var gb = sel.geometricBounds;         // [L, T, R, B]
    var left  = gb[0], top = gb[1];
    var width = gb[2] - gb[0];
    var height= gb[1] - gb[3];

    /* 1-1) 이미지 배치 */
    var pic = lay.placedItems.add();
    pic.file = imgFile;
    pic.width  = width;
    pic.height = height;
    pic.position = [ left, top ];         // 좌상단 맞춤

    /* 1-2) 원본 삭제 */
    sel.remove();
    cnt++;

    /* 잠금 복구 */
    if (wasLocked) lay.locked = true;
  }

//   alert("✅ " + imgFile.name + "로 " + cnt + "개 오브젝트를 대체 완료");

})();
