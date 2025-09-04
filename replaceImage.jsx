(function () {

  /* 0) 기본 검사 */
  if (app.documents.length === 0) { alert("문서가 없습니다."); return; }
  var doc = app.activeDocument;
  if (doc.selection.length === 0) { alert("선택된 오브젝트가 없습니다."); return; }

  var imgFile = new File("C:/work/img/default.png");
  if (!imgFile.exists) { alert("이미지 파일 없음:\n" + imgFile.fsName); return; }

  /* 1) 선택 항목별 처리 */
  var cnt = 0;
  for (var i = doc.selection.length - 1; i >= 0; i--) {   // 뒤에서부터 안전 삭제
    var sel = doc.selection[i];
    var lay = sel.layer;

    /* 잠금 해제(필요 시) */
    var wasLocked = lay.locked;
    if (wasLocked) lay.locked = false;

    /* 바운드 계산 */
    var gb = sel.geometricBounds;         // [L, T, R, B]
    var left  = gb[0], top = gb[1];
    var boxW  = gb[2] - gb[0];
    var boxH  = gb[1] - gb[3];

    /* 1-1) 이미지 배치 (비율 유지, contain, 가운데 정렬) */
    var pic = lay.placedItems.add();
    pic.file = imgFile;           // 링크 상태(비임베드) → 나중에 변수 매핑 가능
    pic.name = "이미지_1";        // ★ 변수 패널에서 찾기 쉽게 이름 지정 (원하면 변경)

    app.redraw();                 // 원본 크기 읽기 안정화
    var iw = pic.width, ih = pic.height;

    // 비율 유지 스케일 (contain: 박스 안에 전부 보이게, 여백 가능)
    var sx = boxW / iw, sy = boxH / ih;
    var scale = Math.min(sx, sy);
    pic.resize(scale * 100, scale * 100);  // 퍼센트 값
    app.redraw();

    // 스케일 이후 실제 크기
    var pw = pic.width, ph = pic.height;

    // 가운데 배치 (좌상단 기준 좌표계 → y는 빼기)
    var posX = left + (boxW - pw) / 2;
    var posY = top  - (boxH - ph) / 2;
    pic.position = [posX, posY];

    /* 1-2) 원본 삭제 */
    try { sel.remove(); } catch (e) {}
    cnt++;

    /* 잠금 복구 */
    if (wasLocked) lay.locked = true;
  }

  // alert("✅ 비율 유지로 " + cnt + "개 오브젝트를 이미지로 대체 완료 (변수 매핑 가능)");
})();
