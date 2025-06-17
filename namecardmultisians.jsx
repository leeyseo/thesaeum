(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // 🔓 모든 레이어 잠금 해제 + 표시
  for (var i = 0; i < doc.layers.length; i++) {
    doc.layers[i].locked = false;
    doc.layers[i].visible = true;
  }

  // 🔽 이미지 경로
  var imagePath = "C:/Users/leeyoonseo/Downloads/명찰주문_농협대학교 산학협력단_둔포농협/장수대학 명찰사진/1반/2025-1반-1번 권영복.jpg";
  var imageFile = new File(imagePath);

  if (!imageFile.exists) {
    alert("❌ 이미지 파일을 찾을 수 없습니다:\n" + imagePath);
    return;
  }

  try {
    // ✅ 이미지 배치
    var placed = doc.placedItems.add();
    placed.file = imageFile;
    placed.position = [0, 0];  // 필요 시 조정
    alert("✅ 이미지가 Illustrator에 성공적으로 배치되었습니다.");
  } catch (e) {
    alert("❌ 배치 실패:\n" + e);
  }
})();
