(function () {
  var doc = app.activeDocument;
  if (!doc) {
    alert("열린 문서가 없습니다!");
    return;
  }

  // 오래된 환경 호환용 trim 함수
  function legacyTrim(str) {
    return str.replace(/^\s+|\s+$/g, '');
  }

  var count = 0;
  for (var i = doc.textFrames.length - 1; i >= 0; i--) {
    var tf = doc.textFrames[i];
    if (!tf.locked && !tf.hidden) {
      var text = legacyTrim(tf.contents);
      if (text === "Nan") {
        tf.remove();
        count++;
      }
    }
  }
})();
