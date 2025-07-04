(function () {
  if (app.documents.length === 0) return;

  var doc = app.activeDocument;
  doc.selection = null;

  var found = false;

  for (var i = 0; i < doc.textFrames.length; i++) {
    var textItem = doc.textFrames[i];
    textItem.selected = true;
    found = true;
  }

  if (found) {
    alert("✅ 현재 문서에 텍스트가 포함되어 있습니다.");
  }
})();
