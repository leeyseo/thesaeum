// 스크립트 실행
(function () {
    // 1. 열린 문서가 있는지 확인
    if (app.documents.length === 0) {
        alert("열린 문서가 없습니다. 먼저 파일을 여세요.");
        return;
    }

    var doc = app.activeDocument;

    // 2. 보호어 목록 정의
    // 이곳에 검사하고 싶은 단어를 추가하거나 수정하세요.
    var PROTECT_VALUES = ["홍길동", "길동", "honggildong", "gildong", "사원증", "명함"];

    // 3. 텍스트 정규화 함수
    // 영문 소문자화, 한글/영문/숫자만 남기고 공백과 특수문자 제거
    function _normalize(s) {
        s = (s || "").toLowerCase();
        return s.replace(/[^0-9a-z\uac00-\ud7a3]+/g, "");
    }

    // 4. 문자열 공백 제거 함수
    function _trim(s) {
        return (s || "").replace(/^\s+|\s+$/g, "");
    }

    // 5. 검사 대상 텍스트 프레임인지 확인하는 함수
    // 숨겨져 있거나 잠긴 레이어/그룹의 텍스트는 제외
    function isScannableTextFrame(tf) {
        if (!tf) return false;

        // 텍스트 프레임 자체의 잠금/숨김 상태 확인
        if (tf.locked || tf.hidden) return false;

        // 소속 레이어의 상태 확인
        var lay = tf.layer;
        if (lay) {
            if (lay.locked) return false;
            if (lay.visible === false) return false;
        }

        // 상위 그룹의 상태 확인
        var p = tf.parent;
        while (p && p.typename && p.typename !== "Document") {
            if (p.locked || p.hidden) return false;
            p = p.parent;
        }
        return true;
    }

    // 6. 모든 텍스트 프레임 순회하며 보호어 검사
    var hits = []; // 발견된 텍스트 원문을 저장할 배열
    var i, j;
    
    // 보호어 목록을 정규화하여 검사 효율 높이기
    var normalizedTokens = [];
    for (i = 0; i < PROTECT_VALUES.length; i++) {
        normalizedTokens[normalizedTokens.length] = _normalize(PROTECT_VALUES[i]);
    }

    for (i = 0; i < doc.textFrames.length; i++) {
        var tf = doc.textFrames[i];
        
        // 검사 대상이 아니면 건너뛰기
        if (!isScannableTextFrame(tf)) continue;

        var rawContent = _trim(tf.contents);
        if (!rawContent) continue;

        var normalizedContent = _normalize(rawContent);
        var found = false;

        for (j = 0; j < normalizedTokens.length; j++) {
            var token = normalizedTokens[j];
            // 정규화된 텍스트에서 정규화된 보호어가 포함되어 있는지 검사
            if (token && normalizedContent.indexOf(token) !== -1) {
                found = true;
                break;
            }
        }
        
        // 보호어가 발견되면 원본 텍스트를 저장
        if (found) {
            hits[hits.length] = rawContent;
            if (hits.length >= 8) break; // 너무 많으면 일부만 표시
        }
    }

    // 7. 검사 결과에 따라 알림창 표시
    if (hits.length > 0) {
        var msg = "🚫 보호어(정규화 기준) 포함 텍스트가 발견되었습니다. 확인바랍니다.\n\n";
        for (i = 0; i < hits.length; i++) {
            var sample = hits[i];
            if (sample.length > 40) sample = sample.substring(0, 40) + "…";
            msg += "• " + sample + "\n";
        }
        alert(msg);
    } 
})();