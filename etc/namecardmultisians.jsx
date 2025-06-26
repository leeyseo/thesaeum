(function () {
  if (app.documents.length === 0) {
    alert("열린 문서가 없습니다.");
    return;
  }

  var doc = app.activeDocument;

  // 🔓 레이어 표시 + 잠금 해제
  for (var i = 0; i < doc.layers.length; i++) {
    doc.layers[i].visible = true;
    doc.layers[i].locked = false;
  }

  // "이미지" 변수 찾기
  var imageVar = null;
  for (var i = 0; i < doc.variables.length; i++) {
    if (doc.variables[i].name === "이미지") {
      imageVar = doc.variables[i];
      break;
    }
  }

  if (!imageVar) {
    alert("❌ 변수 '이미지'를 찾을 수 없습니다. 이미지 오브젝트에 '이미지'라는 이름으로 변수 바인딩하세요.");
    return;
  }

  // 이미지가 들어있는 폴더 선택
  var folder = Folder.selectDialog("📂 이미지가 들어있는 폴더를 선택하세요");
  if (!folder) {
    alert("❌ 폴더 선택이 취소되었습니다.");
    return;
  }

  // 모든 데이터셋 순회
  if (doc.dataSets.length === 0) {
    alert("❌ 데이터셋이 없습니다. CSV를 불러오셨나요?");
    return;
  }

  for (var d = 0; d < doc.dataSets.length; d++) {
    var ds = doc.dataSets[d];
    ds.display();  // 적용

    $.sleep(50);  // 잠깐 대기 (필수: 값 반영 대기)

    var item = imageVar.pageItems[0];
    if (!item || item.typename !== "PlacedItem") {
      alert("❌ '이미지' 변수는 PlacedItem(이미지 오브젝트)에 바인딩되어야 합니다.");
      return;
    }

    var fileName;
    try {
      fileName = decodeURI(item.file.name);  // 현재 데이터셋의 이미지 파일명
    } catch (e) {
      alert("❌ 이미지 파일명을 읽을 수 없습니다:\n" + e);
      continue;
    }

    var newFile = File(folder.fsName + "/" + fileName);
    if (!newFile.exists) {
      alert("❌ 이미지 파일을 찾을 수 없습니다:\n" + newFile.fsName);
      continue;
    }

    try {
      item.file = newFile;  // 이미지 교체
    } catch (e) {
      alert("❌ 이미지 교체 실패:\n" + e);
    }
  }

  alert("✅ 모든 데이터셋의 이미지가 자동으로 연결되었습니다.");
})();
