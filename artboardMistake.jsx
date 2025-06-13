/**
 * ① 기존 아트보드 크기(폭·높이) 목록 저장
 * ② 아트보드 밖 디자인을 Bounding Box 단위로 병합
 * ③ 병합 결과가 기존 크기와 ±TOL 이내일 때만
 *      ─ 새 아트보드 생성 (+MARGIN)
 *      ─ 그 디자인을 matchedItems 에 추가
 * ④ 끝나면 matchedItems 만 선택 상태 유지
 * ES3 ExtendScript
 */
(function () {
  var MARGIN = 0;      // 새 아트보드 여백 pt
  var TOL    = 2;       // 크기 허용 오차 pt

  var doc = app.activeDocument;
  if (!doc) { alert("문서가 없습니다."); return; }

  /* ── 1. 기존 아트보드 크기 목록 ── */
  var ABs = [], ref = [];           // ref = [{w,h}]
  for (var i=0;i<doc.artboards.length;i++){
    var r = doc.artboards[i].artboardRect;          // [L,T,R,B]
    ABs.push(r);
    ref.push({ w: r[2]-r[0], h: r[1]-r[3] });
  }
  function sizeMatch(w,h){
    for (var k=0;k<ref.length;k++)
      if (Math.abs(w-ref[k].w)<=TOL && Math.abs(h-ref[k].h)<=TOL) return true;
    return false;
  }
  function intersects(a,b){
    return !(a[2]<b[0]||a[0]>b[2]||a[1]<b[3]||a[3]>b[1]);
  }
  function merge(a,b){
    return [Math.min(a[0],b[0]), Math.max(a[1],b[1]),
            Math.max(a[2],b[2]), Math.min(a[3],b[3])];
  }

  /* ── 2. 아트보드 밖 디자인 수집 ── */
  var rectPool=[], itemPool=[];
  for (i=0;i<doc.pageItems.length;i++){
    var it=doc.pageItems[i]; if(it.locked||it.hidden) continue;
    var bb=it.visibleBounds, on=false;
    for (var j=0;j<ABs.length;j++) if(intersects(bb,ABs[j])){ on=true; break; }
    if(!on){ rectPool.push(bb); itemPool.push(it); }
  }
  // if(!rectPool.length){ alert("대지 밖 디자인이 없습니다."); return; }

  /* ── 3. 겹침 병합 ── */
  var groups=[];
  while(rectPool.length){
    var cur=rectPool.pop(), m=false;
    for(i=0;i<groups.length;i++)
      if(intersects(cur,groups[i])){ groups[i]=merge(cur,groups[i]); m=true; break; }
    if(!m) groups.push(cur);
  }

  /* ── 4. 크기 매칭 그룹만 아트보드 생성 ── */
  var made=0, matchedSet={};                 // 객체 키를 ID 로 활용
  for(i=0;i<groups.length;i++){
    var g=groups[i], w=g[2]-g[0], h=g[1]-g[3];
    if(!sizeMatch(w,h)) continue;            // 크기 불일치 → 건너뜀

    var L=g[0]-MARGIN, T=g[1]+MARGIN,
        R=g[2]+MARGIN, B=g[3]-MARGIN;
    doc.artboards.add([L,T,R,B]);            // 새 아트보드
    made++;

    /* 그룹 영역에 포함된 아이템 → matchedSet */
    for (var p=0;p<itemPool.length;p++){
      var bb=itemPool[p].visibleBounds;
      if (bb[0]>=g[0]-0.1 && bb[2]<=g[2]+0.1 &&
          bb[3]>=g[3]-0.1 && bb[1]<=g[1]+0.1)
        matchedSet[itemPool[p].uuid || p]=itemPool[p]; // uuid가 없으면 인덱스
    }
  }

  /* ── 5. 최종 선택 = 매칭된 디자인만 ── */
  var matched=[];
  for (var key in matchedSet) matched.push(matchedSet[key]);
  doc.selection = matched;

  // alert("새 아트보드: "+made+"개\n선택된 디자인(크기 매칭): "+matched.length+"개");
})();
