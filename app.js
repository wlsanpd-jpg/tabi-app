// TABI — Application Logic
// 의존성: data.js 먼저 로드
(function(){
'use strict';

var _sheetUrl='';

// ── Analytics (경량 이벤트 트래킹) ─────────────────
var _anonId=(function(){var k='tabi_aid';var v=localStorage.getItem(k);if(!v){v=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem(k,v);}return v;})();
function track(event,data){
  try{
    var payload={event:event,data:data||{},ts:Date.now(),ua:navigator.userAgent,sid:_anonId};
    fetch(PROXY+'/api/analytics',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      keepalive:true
    }).catch(function(){});  // fire and forget
  }catch(e){}
}

// ── 햅틱 피드백 (모바일 촉각 UX)
// buzz(8) → 단일 8ms  |  buzz([12,60,12]) → 패턴 진동
function buzz(ms){
  try{if(navigator.vibrate)navigator.vibrate(ms||8);}catch(e){}
}

// ── 일정 공유 (Web Share API → 클립보드 폴백)
function shareTri(){
  if(!_tdays||!_tdays.length)return;
  var lines=_tdays.map(function(d,i){
    var rows=d.places.map(function(p){return '  '+(p.time?p.time+' ':'')+p.name+(p.tip?' — '+p.tip:'');});
    return '[Day '+(i+1)+' · '+d.label+']\n'+rows.join('\n');
  });
  var text='\u2708\ufe0f TABI \u00b7 '+_tcity+' \uc5ec\ud589\uc77c\uc815\n\n'+lines.join('\n\n')+'\n\n\ubb34\ub8cc AI \uc77c\uc815\ud45c \ub9cc\ub4e4\uae30 \u2192 tabi-app-wheat.vercel.app';
  if(navigator.share){
    buzz(10);
    navigator.share({title:'TABI \u2014 '+_tcity+' \uc5ec\ud589\uc77c\uc815',text:text}).catch(function(){});
    track('share_itinerary',{city:_tcity});
  } else {
    navigator.clipboard.writeText(text)
      .then(function(){showToast('\uc77c\uc815\uc774 \ubcf5\uc0ac\ub418\uc5c8\uc5b4\uc694! \ud83c\udf8a');buzz(8);}  )
      .catch(function(){});
  }
}

function mkLogoImg(cls,h){
  var svg=LOGO_SVG[cls];
  if(!svg){var d=mk('div','plat-fallback');d.textContent=PLAT_LABELS[cls]||cls;return d;}
  var img=document.createElement('img');
  img.src='data:image/svg+xml,'+encodeURIComponent(svg);
  img.className=h&&h>24?'sheet-badge-img':'dbr-logo-img';
  img.alt=PLAT_LABELS[cls]||cls;
  return img;
}
function showSheet(nm,url,cls,pr,dc,hdTtl){
  _sheetUrl=url;
  track('affiliate_click',{platform:cls,name:nm,cat:cat,city:city});
  document.getElementById('sheetHdTtl').textContent=hdTtl||'예약 상품';
  var badge=document.getElementById('sheetBadge');
  badge.innerHTML='';badge.className='sheet-badge-wrap';
  badge.appendChild(mkLogoImg(cls,32));
  document.getElementById('sheetPlatLbl').textContent='';
  document.getElementById('sheetNm').textContent=nm||'';
  document.getElementById('sheetDc').textContent=dc||'';
  var prEl=document.getElementById('sheetPr');
  prEl.textContent=pr||'';prEl.style.display=pr?'':'none';
  document.getElementById('sheet').classList.add('open');
  document.getElementById('sheetOverlay').classList.add('open');
}
function closeSheet(){
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('sheetOverlay').classList.remove('open');
}

// ════════════════════════════════════════════════════
// STATE — 앱 전역 상태 (단일 진실 소스)
// ════════════════════════════════════════════════════
var city=CITIES[0].kr,cityEn=CITIES[0].en,cat=CATS[0].key;
var foodSubCat='all';
var sortBy='none';
var onlyOpen=false;
var saved=JSON.parse(localStorage.getItem('tabi_saved')||'[]');
var _places=[],_tdays=null,_tcity='';
var _flt={foodSub:'all',sort:'none',open:false};  // 필터 드로어 드래프트
var _itinDays=3;
var _itinAssign=JSON.parse(localStorage.getItem('tabi_itin')||'{}');

// ── 엘리먼트 캐시 (반복 getElementById 최소화)
var _el={};
function $e(id){return _el[id]||(_el[id]=document.getElementById(id));}

// ════════════════════════════════════════════════════
// DOM HELPERS
// ════════════════════════════════════════════════════
function mk(tag,cls,txt){
  var e=document.createElement(tag);
  if(cls)e.className=cls;
  if(txt!==undefined)e.textContent=txt;
  return e;
}
function on(id,ev,fn){document.getElementById(id).addEventListener(ev,fn);}

// ── Init
window.addEventListener('DOMContentLoaded',function(){
  buildCityTabs();buildCatTabs();buildAiSelect();bindAll();
  var fb=$e('filterBar');if(fb)fb.style.display='flex';
  updateFilterBar();
  load();updateBadge();
});

function buildCityTabs(){
  var row=document.getElementById('cityRow');
  row.innerHTML='';
  CITIES.forEach(function(c,i){
    var btn=mk('button','city-btn'+(i===0?' on':''),c.kr);
    btn.addEventListener('click',function(){
      row.querySelectorAll('.city-btn').forEach(function(b){b.classList.remove('on');});
      btn.classList.add('on');city=c.kr;cityEn=c.en;track('city_change',{city:c.kr});load();
    });
    row.appendChild(btn);
  });
}
function buildCatTabs(){
  var row=document.getElementById('catRow');
  row.innerHTML='';
  CATS.forEach(function(c,i){
    var btn=mk('button','cat-btn'+(i===0?' on':''),c.label);
    btn.addEventListener('click',function(){
      row.querySelectorAll('.cat-btn').forEach(function(b){b.classList.remove('on');});
      btn.classList.add('on');cat=c.key;
      // 필터 상태 초기화
      foodSubCat='all';sortBy='none';onlyOpen=false;
      _flt={foodSub:'all',sort:'none',open:false};
      // 필터 바 표시
      var fb=document.getElementById('filterBar');
      if(fb)fb.style.display='flex';
      updateFilterBar();
      load();
    });
    row.appendChild(btn);
  });
}
function buildAiSelect(){
  var sel=document.getElementById('aiCity');
  sel.innerHTML='';
  CITIES.forEach(function(c){
    var o=document.createElement('option');
    o.value=c.kr;o.textContent=c.kr;sel.appendChild(o);
  });
}
function bindAll(){
  on('btnSrch','click',function(){
    var bar=document.getElementById('srchBar');
    bar.classList.toggle('off');
    if(!bar.classList.contains('off'))
      setTimeout(function(){document.getElementById('srchInput').focus();},50);
  });
  on('btnSrchGo','click',doSearch);
  on('btnSrchX','click',function(){document.getElementById('srchBar').classList.add('off');});
  document.getElementById('srchInput').addEventListener('keydown',function(e){
    if(e.key==='Enter')doSearch();
  });
  on('nav-explore','click',function(){switchPage('explore');});
  on('nav-ai','click',function(){switchPage('ai');});
  on('nav-saved','click',function(){switchPage('saved');});
  on('btnGen','click',genItinerary);
  document.getElementById('chips').addEventListener('click',function(e){
    var c=e.target.closest('.ai-chip');if(c)c.classList.toggle('on');
  });
  on('btnClearAll','click',clearAll);
  on('btnBack','click',closeDetail);
  // 필터 드로어
  on('btnFilterOpen','click',openFilterDrawer);
  on('fltOv','click',closeFilterDrawer);
  on('fltReset','click',resetFilters);
  on('fltApply','click',applyFilters);
  // 일정표
  on('btnMakeItin','click',openItin);
  on('btnItinBack','click',closeItin);
  on('btnItinCopy','click',copyItinerary);
  // 바텀 시트
  on('sheetGo','click',function(){window.open(_sheetUrl,'_blank');closeSheet();});
  on('sheetCancel','click',closeSheet);
  on('sheetX','click',closeSheet);
  on('sheetOverlay','click',closeSheet);
}

function switchPage(p){
  document.querySelectorAll('.page').forEach(function(x){x.classList.remove('active');});
  document.querySelectorAll('.nav-it').forEach(function(x){x.classList.remove('on');});
  document.getElementById('page-'+p).classList.add('active');
  document.getElementById('nav-'+p).classList.add('on');
  if(p==='saved')renderSaved();
}

// ── Fetch
function doSearch(){
  var q=document.getElementById('srchInput').value.trim();if(!q)return;
  fetchPlaces(q+' Japan',null);
  document.getElementById('srchBar').classList.add('off');
}
function load(){
  // 5번: 맛집 세부탭별 검색어
  var FOOD_QUERIES={
    all:      cityEn+' restaurant',
    ramen:    cityEn+' 라멘 ramen',
    sushi:    cityEn+' 스시 회 sushi seafood',
    izakaya:  cityEn+' 이자카야 izakaya',
    tonkatsu: cityEn+' 돈카츠 tonkatsu',
    yakitori: cityEn+' 야키토리 yakitori',
    yakiniku: cityEn+' 야키니쿠 yakiniku',
    udon:     cityEn+' 우동 소바 udon soba',
    nabe:     cityEn+' 나베 나베요리 nabe hot pot',
    shabu:    cityEn+' 샤부샤부 shabu shabu',
    oden:     cityEn+' 오뎅 oden',
    kushikatsu: cityEn+' 꼬치 쿠시카츠 kushikatsu yakitori skewer',
    gyoza:    cityEn+' 교자 gyoza dumpling'
  };
  if(cat==='restaurant'){
    fetchPlaces(FOOD_QUERIES[foodSubCat]||FOOD_QUERIES.all,'restaurant');
  } else {
    fetchPlaces(cityEn+' '+catLbl[cat],cat);
  }
}
async function fetchPlaces(query,type){
  showMsg('loading');
  try{
    var p=new URLSearchParams({query:query,language:'ko'});
    if(type)p.append('type',type);
    var res=await fetch(PROXY+'/api/places?'+p);
    var d=await res.json();
    // 5번: 맛집은 최대 60개 (pagetoken으로 추가 요청)
    if(type==='restaurant'&&d.next_page_token){
      try{
        await new Promise(function(r){setTimeout(r,2000);}); // pagetoken 활성화 대기
        var p2=new URLSearchParams({pagetoken:d.next_page_token,language:'ko'});
        var res2=await fetch(PROXY+'/api/places?'+p2);
        var d2=await res2.json();
        if(d2.results)d.results=(d.results||[]).concat(d2.results);
        if(d2.next_page_token){
          await new Promise(function(r){setTimeout(r,2000);});
          var p3=new URLSearchParams({pagetoken:d2.next_page_token,language:'ko'});
          var res3=await fetch(PROXY+'/api/places?'+p3);
          var d3=await res3.json();
          if(d3.results)d.results=d.results.concat(d3.results);
        }
      }catch(e){console.warn('pagetoken fetch failed',e);}
    }
    if(!d.results||!d.results.length){showMsg('empty');return;}
    var raw=d.results.map(function(r){
      return{
        name:r.name,addr:r.formatted_address,rating:r.rating,cnt:r.user_ratings_total,
        open:r.opening_hours&&r.opening_hours.open_now,
        types:(r.types||[]).slice(0,3),
        photo_ref:r.photos&&r.photos[0]&&r.photos[0].photo_reference,
        photo_refs:r.photos?r.photos.slice(0,5).map(function(ph){return ph.photo_reference;}):null,
        place_id:r.place_id,
        url:r.place_id?('https://maps.google.com/maps?place_id='+r.place_id):null,
        editorial_summary:r.editorial_summary&&r.editorial_summary.overview||null
      };
    });
    // 1번: 리뷰 50개 미만 + 평점 3.5 미만 필터
    var minCnt=['삳포로','나라','가마쿠라','나고야','하코네','히로시마','요코하마','고베','벳푸','나가사키','가나자와','닛코'].indexOf(city)>=0?30:100;
    _places=raw.filter(function(r){return(r.cnt||0)>=minCnt&&(r.rating||0)>=3.5;});
    if(!_places.length){showMsg('empty');return;}
    renderList(_places);
  }catch(e){console.error(e);showMsg('error');}
}
function photoUrl(ref,size){
  return ref?PROXY+'/api/photo?photo_reference='+ref+'&maxwidth='+(size||400):null;
}
function showMsg(type){
  var mc=$e('mainContent');mc.innerHTML='';
  if(type==='loading'){
    // 스켈레톤 카드 4장 — 스피너보다 체감 속도 훨씬 빠름
    var list=mk('div','place-list');
    for(var i=0;i<4;i++){
      var skc=mk('div','sk-card');
      skc.appendChild(mk('div','sk-img'));
      var skb=mk('div','sk-body');
      skb.appendChild(mk('div','sk sk-line h14 w100'));
      skb.appendChild(mk('div','sk sk-line h11 w75'));
      var skm=mk('div','sk-meta');
      skm.appendChild(mk('div','sk sk-line h10 w40'));
      skm.appendChild(mk('div','sk sk-line h10 w55'));
      skb.appendChild(skm);
      skc.appendChild(skb);list.appendChild(skc);
    }
    mc.appendChild(list);return;
  }
  var w=mk('div','empty-state');
  if(type==='error'){
    var ic=mk('div','empty-icon','\u26a0\ufe0f');
    w.appendChild(ic);
    w.appendChild(mk('div','empty-ttl','\ub370\uc774\ud130\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694'));
    w.appendChild(mk('div','empty-sub','\ub124\ud2b8\uc6cc\ud06c\ub97c \ud655\uc778\ud558\uace0\n\ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.'));
    var rb=mk('button','empty-retry','\ub2e4\uc2dc \uc2dc\ub3c4');
    rb.addEventListener('click',load);
    w.appendChild(rb);
  } else {
    w.appendChild(mk('div','empty-icon','\ud83d\udd0d'));
    w.appendChild(mk('div','empty-ttl',city+' '+catLbl[cat]+' \uacb0\uacfc\uac00 \uc5c6\uc5b4\uc694'));
    w.appendChild(mk('div','empty-sub','\ub2e4\ub978 \uce74\ud14c\uace0\ub9ac\ub97c\n\uc120\ud0dd\ud574\ubcf4\uc138\uc694.'));
  }
  mc.appendChild(w);
}

// ── Stars
function mkStars(r,cls){
  var w=mk('div',cls||'pc-stars');
  if(!r){w.appendChild(mk('span','pc-rcnt','\ud3c9\uc810\uc5c6\uc74c'));return w;}
  for(var i=0;i<5;i++)w.appendChild(mk('span','pc-star'+(r>=i+1?' on':''),'\u2605'));
  return w;
}

// ════════════════════════════════════════════════════
// BOOKING & CTA — 제휴 예약 스트립 · 버튼
// ════════════════════════════════════════════════════
function mkBkStrip(data){
  if(!data||!data.length)return null;
  var strip=mk('div','bk-strip'),hd=mk('div','bk-hd');
  hd.appendChild(mk('span','bk-lbl','\uc608\uc57d \ucd94\ucc9c'));
  hd.appendChild(mk('span','bk-badge','\uc81c\ud734 \ud560\uc778'));
  strip.appendChild(hd);
  var list=mk('div','bk-list');
  data.forEach(function(b){
    var card=mk('div','bk-card');
    var img=mk('div','bk-img');
    img.appendChild(mk('span','bk-plat '+b.cls,b.logo));
    var body=mk('div','bk-body');
    body.appendChild(mk('div','bk-nm',b.nm));
    body.appendChild(mk('div','bk-pr',b.pr));
    card.appendChild(img);card.appendChild(body);
    card.addEventListener('click',function(){window.open(b.url,'_blank');});
    list.appendChild(card);
  });
  strip.appendChild(list);return strip;
}

// ── CTA
function mkCTA(p){
  var cta=mk('div','pc-cta');
  // 2번: place_id 있으면 정확한 장소로, 없으면 검색어로
  var gurl=p.place_id
    ?('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.name)+'&query_place_id='+p.place_id)
    :('https://maps.google.com/?q='+encodeURIComponent(p.name+' '+city));
  var nurl='https://map.naver.com/v5/search/'+encodeURIComponent(p.name+' '+city);
  var bk=BKP[p.name];
  if(bk&&bk.length){
    bk.slice(0,2).forEach(function(b){
      (function(bb){
        var btn=mk('button',null);
        btn.appendChild(mkLogoImg(bb.cls,22));
        btn.addEventListener('click',function(e){
          e.stopPropagation();
          showSheet(bb.nm,bb.url,bb.cls,bb.pr||'',bb.dc||'',PLAT_LABELS[bb.cls]+' 예약');
        });
        cta.appendChild(btn);
      })(b);
    });
    var gmb=mk('a',null,'🗺 지도');gmb.href=gurl;gmb.target='_blank';
    cta.appendChild(gmb);
  } else if(cat==='lodging'){
    (function(){
      var hotelQ=encodeURIComponent(p.name);
      var bkUrl='https://www.booking.com/search.html?ss='+hotelQ;
      var agUrl='https://www.agoda.com/search?q='+hotelQ;
      var bkBtn=mk('button',null);bkBtn.appendChild(mkLogoImg('bk',22));
      (function(bu){bkBtn.addEventListener('click',function(e){e.stopPropagation();showSheet(p.name+' 숙소 예약',bu,'bk','','Booking.com에서 숙소 예약하기','숙소 예약');});})(bkUrl);
      var agBtn=mk('button',null);agBtn.appendChild(mkLogoImg('ag',22));
      (function(au){agBtn.addEventListener('click',function(e){e.stopPropagation();showSheet(p.name+' 숙소 예약',au,'ag','','Agoda에서 숙소 예약하기','숙소 예약');});})(agUrl);
      var gm=mk('a',null,'🗺 지도');gm.href=gurl;gm.target='_blank';
      cta.appendChild(bkBtn);cta.appendChild(agBtn);cta.appendChild(gm);
    })();
  } else {
    var a1=mk('a',null,'🗺 Google 지도');a1.href=gurl;a1.target='_blank';
    var a2=mk('a',null,'📍 네이버');a2.href=nurl;a2.target='_blank';
    cta.appendChild(a1);cta.appendChild(a2);
  }
  return cta;
}

// ── Place card
function mkCard(p,idx){
  var isSaved=saved.some(function(s){return s.name===p.name;});
  var card=mk('div','pc');
  card.style.setProperty('--delay',((idx%8)*0.05)+'s');
  var imgW=mk('div','pc-img');
  var pUrl=photoUrl(p.photo_ref,idx===0?600:400);
  if(pUrl){
    var img=document.createElement('img');
    img.alt=p.name;img.loading='lazy';
    img.addEventListener('error',function(){this.style.display='none';});
    img.src=pUrl;
    imgW.appendChild(img);
  }
  imgW.appendChild(mk('div','pc-grad'));
  imgW.appendChild(mk('div','pc-rank','#'+(idx+1)));
  imgW.appendChild(mk('div','pc-badge',(p.types||[catLbl[cat]])[0]||''));
  var heart=mk('button','pc-heart'+(isSaved?' on':''),isSaved?'\u2665':'\u2661');
  heart.addEventListener('click',function(e){e.stopPropagation();buzz(10);toggleSC(p.name,heart,idx);});
  imgW.appendChild(heart);
  var info=mk('div','pc-info');
  info.appendChild(mk('div','pc-name',p.name));
  info.appendChild(mk('div','pc-addr',p.addr||''));
  var meta=mk('div','pc-meta');
  meta.appendChild(mkStars(p.rating));
  meta.appendChild(mk('span','pc-rnum',p.rating?String(p.rating):'—'));
  if(p.cnt)meta.appendChild(mk('span','pc-rcnt','('+p.cnt.toLocaleString()+'\uac74)'));
  if(p.open===true){meta.appendChild(mk('span','pc-sep'));meta.appendChild(mk('span','pc-open','\u25cf \uc601\uc5c5\uc911'));}
  if(p.open===false){meta.appendChild(mk('span','pc-sep'));meta.appendChild(mk('span','pc-closed','\u25cf \uc601\uc5c5\uc885\ub8cc'));}
  info.appendChild(meta);
  card.appendChild(imgW);card.appendChild(info);card.appendChild(mkCTA(p));
  card.addEventListener('click',function(e){
    if(!e.target.closest('a')&&!e.target.closest('.pc-heart'))openDetail(idx);
  });
  return card;
}

// ════════════════════════════════════════════════════
// RENDER — 리스트 · 카드 · 상세 화면
// ════════════════════════════════════════════════════
function renderList(places){
  var mc=$e('mainContent');mc.innerHTML='';
  if(!places.length){showMsg('empty');return;}
  // 6번: 영업중 필터
  var shown=onlyOpen?places.filter(function(p){return p.open===true;}):places.slice();
  // 6번: 평점 정렬
  if(sortBy==='rating_desc')shown.sort(function(a,b){return(b.rating||0)-(a.rating||0);});
  else if(sortBy==='cnt_desc')shown.sort(function(a,b){return(b.cnt||0)-(a.cnt||0);});
  if(!shown.length){showMsg('empty');return;}
  var strip=mkBkStrip(CBK[city]);
  if(strip)mc.appendChild(strip);
  var hd=mk('div','sec-hd');
  hd.appendChild(mk('span','sec-ttl',city+' '+catLbl[cat]));
  hd.appendChild(mk('span','sec-cnt',shown.length+'곳'));
  mc.appendChild(hd);
  var list=mk('div','place-list');
  shown.forEach(function(p,i){list.appendChild(mkCard(p,i));});
  mc.appendChild(list);
}

// ── Save
function toggleSC(name,btn,idx){
  var place=_places[idx]||{name:name};
  var i=saved.findIndex(function(s){return s.name===name;});
  if(i===-1){saved.push({name:name,city:city,cat:cat,data:place});btn.textContent='\u2665';btn.classList.add('on');track('place_save',{name:name,city:city,cat:cat});showToast('\u2665 '+name+' \uc800\uc7a5\ub428');}
  else{saved.splice(i,1);btn.textContent='\u2661';btn.classList.remove('on');showToast(name+' \uc800\uc7a5 \ucde8\uc18c');}
  localStorage.setItem('tabi_saved',JSON.stringify(saved));updateBadge();
}
function toggleSD(name){
  var i=saved.findIndex(function(s){return s.name===name;});
  var btn=document.getElementById('dHeartBtn');
  if(i===-1){
    var place=_places.find(function(p){return p.name===name;})||{name:name};
    saved.push({name:name,city:city,cat:cat,data:place});
    if(btn){btn.textContent='\u2665 \uc800\uc7a5\ub428';btn.classList.add('on');}
  } else {
    saved.splice(i,1);
    if(btn){btn.textContent='\u2661 \uc800\uc7a5\ud558\uae30';btn.classList.remove('on');}
  }
  localStorage.setItem('tabi_saved',JSON.stringify(saved));updateBadge();
}
function clearAll(){
  if(!saved.length)return;
  if(confirm('\uc800\uc7a5\ud55c \ubaa8\ub4e0 \uc7a5\uc18c\ub97c \uc0ad\uc81c\ud560\uae4c\uc694?')){
    saved=[];localStorage.setItem('tabi_saved',JSON.stringify(saved));updateBadge();renderSaved();
  }
}
function updateBadge(){
  var b=document.getElementById('savedBadge');
  if(saved.length>0){b.textContent=saved.length;b.classList.add('show');}
  else b.classList.remove('show');
}

// ── Saved page
function renderSaved(){
  var el2=document.getElementById('savedContent');el2.innerHTML='';
  if(!saved.length){
    var w=mk('div','saved-empty');
    var ic=mk('div','saved-empty-ic');ic.textContent='\ud83d\uddfa';
    w.appendChild(ic);
    w.appendChild(mk('div','saved-empty-tx','\uc544\uc9c1 \uc800\uc7a5\ud55c \uc7a5\uc18c\uac00 \uc5c6\uc5b4\uc694.\n\ud0d0\uc0c9 \ud0ed\uc5d0\uc11c \u2661 \ubc84\ud2bc\uc744 \ub208\ub7ec \uc800\uc7a5\ud574\ubcf4\uc138\uc694!'));
    el2.appendChild(w);return;
  }
  var groups={};
  saved.forEach(function(s){var k=s.city||'\uae30\ud0c0';if(!groups[k])groups[k]=[];groups[k].push(s);});
  Object.keys(groups).forEach(function(c){
    el2.appendChild(mk('span','saved-city-lbl',c));
    var list=mk('div','place-list');
    groups[c].forEach(function(s){
      var p=s.data||{name:s.name};
      var card=mk('div','pc');
      var imgW=mk('div','pc-img');
      var pUrl=photoUrl(p.photo_ref,400);
      if(pUrl){
        var img=document.createElement('img');
        img.alt=p.name;img.loading='lazy';
        img.addEventListener('error',function(){this.style.display='none';});
        img.src=pUrl;imgW.appendChild(img);
      }
      imgW.appendChild(mk('div','pc-grad'));
      var heart=mk('button','pc-heart on','\u2665');
      heart.addEventListener('click',function(e){e.stopPropagation();removeSaved(s.name);});
      imgW.appendChild(heart);
      var info=mk('div','pc-info');
      info.appendChild(mk('div','pc-name',p.name));
      info.appendChild(mk('div','pc-addr',p.addr||''));
      var meta=mk('div','pc-meta');
      meta.appendChild(mkStars(p.rating));
      meta.appendChild(mk('span','pc-rnum',p.rating?String(p.rating):'—'));
      info.appendChild(meta);
      card.appendChild(imgW);card.appendChild(info);card.appendChild(mkCTA(p));
      card.addEventListener('click',function(e){
        if(!e.target.closest('a')&&!e.target.closest('.pc-heart')){
          _places=[p];
          city=s.city||city;cityEn=(CITIES.find(function(c){return c.kr===city;})||{en:cityEn}).en;
          cat=s.cat||cat;
          openDetail(0);
        }
      });
      list.appendChild(card);
    });
    el2.appendChild(list);
  });
}
function removeSaved(name){
  var i=saved.findIndex(function(s){return s.name===name;});
  if(i!==-1){saved.splice(i,1);localStorage.setItem('tabi_saved',JSON.stringify(saved));}
  updateBadge();renderSaved();
}

// ════════════════════════════════════════════════════
// DETAIL PANEL — 장소 상세 화면
// ════════════════════════════════════════════════════
function openDetail(idx){
  var p=_places[idx];if(!p)return;
  track('detail_open',{name:p.name,cat:cat,city:city});
  document.getElementById('dTitle').textContent=p.name;
  var hero=document.getElementById('dHero');hero.innerHTML='';hero.style.fontSize='';
  hero.appendChild(mk('div','d-hero-fade'));
  // 2번: Wikipedia 사진 우선, Google 사진 스와이프
  var heroImgs=[];
  var currentHeroIdx=0;
  var _heroAnimating=false;
  function showHeroImg(nextIdx,dir){
    if(!heroImgs.length||_heroAnimating)return;
    _heroAnimating=true;
    var existing=hero.querySelector('img.hero-img');
    var img=document.createElement('img');
    img.className='hero-img';
    img.alt=p.name;
    var fromX=dir===0?'0%':(dir>0?'100%':'-100%');
    img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:translateX('+fromX+');transition:transform .32s cubic-bezier(.25,.46,.45,.94);will-change:transform;';
    img.src=heroImgs[nextIdx];
    img.addEventListener('error',function(){
      heroImgs.splice(nextIdx,1);_heroAnimating=false;
      if(heroImgs.length)showHeroImg(Math.min(currentHeroIdx,heroImgs.length-1),0);
      else{hero.style.fontSize='80px';hero.textContent=gpi(p.name).ic;}
    });
    hero.insertBefore(img,hero.firstChild);
    // 인디케이터 업데이트
    var dots=hero.querySelectorAll('.hero-dot');
    dots.forEach(function(d,i){d.classList.toggle('on',i===nextIdx);});
    if(dir!==0&&existing){
      existing.style.transition='transform .32s cubic-bezier(.25,.46,.45,.94)';
      existing.style.willChange='transform';
    }
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        img.style.transform='translateX(0)';
        if(dir!==0&&existing){
          existing.style.transform='translateX('+(dir>0?'-100%':'100%')+')';
        }
        setTimeout(function(){
          if(existing&&existing.parentNode)existing.remove();
          _heroAnimating=false;
        },340);
      });
    });
  }
  function buildHeroWithImgs(imgs){
    heroImgs=imgs;currentHeroIdx=0;
    if(!imgs.length){hero.style.fontSize='80px';hero.textContent=gpi(p.name).ic;return;}
    showHeroImg(0,0);
    if(imgs.length>1){
      var dotsWrap=mk('div','hero-dots');
      imgs.forEach(function(_,i){
        var dot=mk('div','hero-dot'+(i===0?' on':''));
        dot.addEventListener('click',function(){
          if(i===currentHeroIdx)return;
          var d=i>currentHeroIdx?1:-1;currentHeroIdx=i;showHeroImg(i,d);
        });
        dotsWrap.appendChild(dot);
      });
      hero.appendChild(dotsWrap);
      // 좌우 화살표
      var arL=mk('button','hero-arr hero-arr-l','‹');
      var arR=mk('button','hero-arr hero-arr-r','›');
      arL.addEventListener('click',function(){if(_heroAnimating)return;currentHeroIdx=(currentHeroIdx-1+heroImgs.length)%heroImgs.length;showHeroImg(currentHeroIdx,-1);});
      arR.addEventListener('click',function(){if(_heroAnimating)return;currentHeroIdx=(currentHeroIdx+1)%heroImgs.length;showHeroImg(currentHeroIdx,1);});
      hero.appendChild(arL);hero.appendChild(arR);
      // 스와이프
      var startX=0,startY=0;
      hero.addEventListener('touchstart',function(e){startX=e.touches[0].clientX;startY=e.touches[0].clientY;},{passive:true});
      hero.addEventListener('touchend',function(e){
        var dx=e.changedTouches[0].clientX-startX;
        var dy=e.changedTouches[0].clientY-startY;
        if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){
          var dir=dx<0?1:-1;
          currentHeroIdx=(currentHeroIdx+dir+heroImgs.length)%heroImgs.length;
          showHeroImg(currentHeroIdx,dir);
        }
      },{passive:true});
    }
  }
  // Google Places 사진 여러 장 + Wikipedia 썸네일
  var imgs=[];
  if(p.photo_refs&&p.photo_refs.length){
    p.photo_refs.forEach(function(ref){var u=photoUrl(ref,800);if(u)imgs.push(u);});
  } else if(p.photo_ref){
    imgs.push(photoUrl(p.photo_ref,800));
  }
  fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(p.name))
    .then(function(r){return r.json();})
    .then(function(w){
      var allImgs=imgs.slice();
      if(w.thumbnail&&w.thumbnail.source&&allImgs.indexOf(w.thumbnail.source)<0)
        allImgs.push(w.thumbnail.source);
      buildHeroWithImgs(allImgs.slice(0,6));
    })
    .catch(function(){buildHeroWithImgs(imgs);});
  var body=document.getElementById('dBody');body.innerHTML='';
  var ts=mk('div','d-title-sec');
  ts.appendChild(mk('div','d-name',p.name));
  ts.appendChild(mk('div','d-type',(p.types||[]).join(' \u00b7 ')));
  body.appendChild(ts);
  // 세부 설명: editorial_summary 우선, 없으면 한국어 Wikipedia 검색
  var descSec=mk('div','d-desc-sec');
  var descTxt=mk('p','d-desc-txt');
  descSec.appendChild(descTxt);
  body.appendChild(descSec);
  if(p.editorial_summary){
    descTxt.textContent=p.editorial_summary;
  } else {
    descTxt.textContent='설명을 불러오는 중...';
    // 한국어 Wikipedia → 영어 Wikipedia 순으로 fallback
    function fetchWikiExtract(name){
      // 1단계: 한국어 직접 검색
      return fetch('https://ko.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(name)+'?redirect=true')
        .then(function(r){return r.ok?r.json():null;})
        .then(function(w){
          if(w&&w.extract&&w.extract.length>10)return w.extract;
          // 2단계: 한국어 키워드 검색 (검색어로 정확한 문서 타이틀 찾기)
          return fetch('https://ko.wikipedia.org/w/api.php?action=query&list=search&srsearch='+encodeURIComponent(name)+'&srlimit=1&format=json&origin=*')
            .then(function(r){return r.json();})
            .then(function(d){
              var hit=d&&d.query&&d.query.search&&d.query.search[0];
              if(!hit)return null;
              return fetch('https://ko.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(hit.title))
                .then(function(r){return r.ok?r.json():null;})
                .then(function(w2){return w2&&w2.extract&&w2.extract.length>10?w2.extract:null;});
            });
        })
        .then(function(extract){
          if(extract)return extract;
          // 3단계: 영어 Wikipedia fallback
          return fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(name)+'?redirect=true')
            .then(function(r){return r.ok?r.json():null;})
            .then(function(w){return w&&w.extract&&w.extract.length>10?w.extract:null;});
        });
    }
    fetchWikiExtract(p.name)
      .then(function(extract){
        if(extract){
          var maxLen=300;
          descTxt.textContent=extract.slice(0,maxLen)+(extract.length>maxLen?'…':'');
        } else {
          descSec.style.display='none';
        }
      })
      .catch(function(){descSec.style.display='none';});
  }
  if(p.rating){
    var rs=mk('div','d-rating-sec');
    rs.appendChild(mk('div','d-big',String(p.rating)));
    var rr=mk('div');
    var dstars=mkStars(p.rating,'d-stars');
    dstars.querySelectorAll('.pc-star').forEach(function(s){s.className=s.className.replace('pc-star','d-star');});
    rr.appendChild(dstars);
    rr.appendChild(mk('div','d-rcnt','\ub9ac\ubf70 '+(p.cnt||0).toLocaleString()+'\uac74 \u00b7 Google \uae30\uc900'));
    rs.appendChild(rr);body.appendChild(rs);
  }
  var is=mk('div','d-info-sec');
  is.appendChild(mk('div','d-info-lbl','\uae30\ubcf8 \uc815\ubcf4'));
  var g=mk('div','d-grid');
  var c1=mk('div','d-cell');
  c1.appendChild(mk('div','d-cell-lbl','\ud83d\udccd \uc8fc\uc18c'));
  c1.appendChild(mk('div','d-cell-val',p.addr||'\uc815\ubcf4\uc5c6\uc74c'));
  var c2=mk('div','d-cell');
  c2.appendChild(mk('div','d-cell-lbl','\ud83d\udd50 \uc601\uc5c5'));
  var cv=mk('div','d-cell-val');
  if(p.open===true){cv.textContent='\ud83d\udfe2 \uc601\uc5c5\uc911';cv.style.color='var(--ac)';}
  else if(p.open===false){cv.textContent='\ud83d\udd34 \uc601\uc5c5\uc885\ub8cc';cv.style.color='var(--red)';}
  else cv.textContent='\uc815\ubcf4\uc5c6\uc74c';
  c2.appendChild(cv);
  g.appendChild(c1);g.appendChild(c2);is.appendChild(g);body.appendChild(is);
  var bk=BKP[p.name];
  if(bk&&bk.length){
    var bs=mk('div','d-bk-sec'),bh=mk('div','d-bk-hd');
    bh.appendChild(mk('span','d-bk-title','\uc608\uc57d \uc0c1\ud488'));
    bh.appendChild(mk('span','d-bk-sub','\ucee4\ubbf8\uc158 \uc81c\ud718'));
    bs.appendChild(bh);
    bk.forEach(function(b){
      var row=mk('button','d-bk-row');
      var L=mk('div','dbr-l');
      L.appendChild(mkLogoImg(b.cls,24));
      var txt=mk('div');
      txt.appendChild(mk('div','dbr-nm',b.nm));
      txt.appendChild(mk('div','dbr-dc',b.dc));
      L.appendChild(txt);
      var R=mk('div');R.style.cssText='display:flex;align-items:center;gap:6px';
      var rr=mk('div');
      rr.appendChild(mk('div','dbr-price',b.pr));
      rr.appendChild(mk('div','dbr-comm',b.cm));
      var arr=mk('span');arr.textContent='\u203a';arr.style.cssText='color:var(--bd2);font-size:18px';
      R.appendChild(rr);R.appendChild(arr);
      row.appendChild(L);row.appendChild(R);
      (function(bb){row.addEventListener('click',function(){showSheet(bb.nm,bb.url,bb.cls,bb.pr,bb.dc,'예약 상품');});})(b);
      bs.appendChild(row);
    });
    body.appendChild(bs);
  }
  // 1번: 클룩/마이리얼트립 검색 링크
  var klookSearchUrl=aff('https://www.klook.com/ko/search/?query='+encodeURIComponent(p.name),'kl');
  var mrtSearchUrl=aff('https://www.myrealtrip.com/offers?query='+encodeURIComponent(p.name),'mr');
  var bkSearch=mk('div','d-bk-sec');
  var bkSearchHd=mk('div','d-bk-hd');
  bkSearchHd.appendChild(mk('span','d-bk-title','관련 상품'));
  bkSearchHd.appendChild(mk('span','d-bk-sub','제휴 서비스'));
  bkSearch.appendChild(bkSearchHd);
  var klRow=mk('button','d-bk-row');
  var klL=mk('div','dbr-l');
  klL.appendChild(mkLogoImg('kl',24));
  var klTxt=mk('div');klTxt.appendChild(mk('div','dbr-nm',p.name+' 관련 상품'));klTxt.appendChild(mk('div','dbr-dc','클룩에서 예약 가능한 상품 보기'));
  klL.appendChild(klTxt);var klArr=mk('span');klArr.textContent='›';klArr.style.cssText='color:var(--bd2);font-size:18px';
  klRow.appendChild(klL);klRow.appendChild(klArr);
  klRow.addEventListener('click',function(){showSheet(p.name+' 관련 상품',klookSearchUrl,'kl','','클룩에서 예약 가능한 상품 보기','관련 상품');});
  bkSearch.appendChild(klRow);
  var mrRow=mk('button','d-bk-row');
  var mrL=mk('div','dbr-l');
  mrL.appendChild(mkLogoImg('mr',24));
  var mrTxt=mk('div');mrTxt.appendChild(mk('div','dbr-nm',p.name+' 관련 상품'));mrTxt.appendChild(mk('div','dbr-dc','마이리얼트립에서 투어·티켓 보기'));
  mrL.appendChild(mrTxt);var mrArr=mk('span');mrArr.textContent='›';mrArr.style.cssText='color:var(--bd2);font-size:18px';
  mrRow.appendChild(mrL);mrRow.appendChild(mrArr);
  mrRow.addEventListener('click',function(){showSheet(p.name+' 관련 상품',mrtSearchUrl,'mr','','마이리얼트립에서 투어·티켓 보기','관련 상품');});
  bkSearch.appendChild(mrRow);
  // 숙박이면 Booking/Agoda 로우
  if(cat==='lodging'){
    var bkDetailUrl='https://www.booking.com/search.html?ss='+encodeURIComponent(p.name);
    var agDetailUrl='https://www.agoda.com/search?q='+encodeURIComponent(p.name);
    var bkRow2=mk('button','d-bk-row');
    var bkL2=mk('div','dbr-l');
    bkL2.appendChild(mkLogoImg('bk',24));
    var bkTxt2=mk('div');bkTxt2.appendChild(mk('div','dbr-nm',p.name+' 숙소 예약'));bkTxt2.appendChild(mk('div','dbr-dc','Booking.com에서 숙소 예약하기'));
    bkL2.appendChild(bkTxt2);var bkArr2=mk('span');bkArr2.textContent='›';bkArr2.style.cssText='color:var(--bd2);font-size:18px';
    bkRow2.appendChild(bkL2);bkRow2.appendChild(bkArr2);
    (function(u){bkRow2.addEventListener('click',function(){showSheet(p.name+' 숙소 예약',u,'bk','','Booking.com에서 숙소 예약하기','숙소 예약');});})(bkDetailUrl);
    bkSearch.appendChild(bkRow2);
    var agRow2=mk('button','d-bk-row');
    var agL2=mk('div','dbr-l');
    agL2.appendChild(mkLogoImg('ag',24));
    var agTxt2=mk('div');agTxt2.appendChild(mk('div','dbr-nm',p.name+' 숙소 예약'));agTxt2.appendChild(mk('div','dbr-dc','Agoda에서 숙소 예약하기'));
    agL2.appendChild(agTxt2);var agArr2=mk('span');agArr2.textContent='›';agArr2.style.cssText='color:var(--bd2);font-size:18px';
    agRow2.appendChild(agL2);agRow2.appendChild(agArr2);
    (function(u){agRow2.addEventListener('click',function(){showSheet(p.name+' 숙소 예약',u,'ag','','Agoda에서 숙소 예약하기','숙소 예약');});})(agDetailUrl);
    bkSearch.appendChild(agRow2);
  }
  // 8번: 맛집이면 이터리 예약 링크
  if(cat==='restaurant'){
    var eateryUrl='https://eatery.jp/search?q='+encodeURIComponent(p.name)+(EATERY_AFF!=='YOUR_EATERY_ID'?'&ref='+EATERY_AFF:'');
    var eatRow=mk('button','d-bk-row');
    var eatL=mk('div','dbr-l');
    eatL.appendChild(mkLogoImg('eat',24));
    var eatTxt=mk('div');eatTxt.appendChild(mk('div','dbr-nm',p.name+' 예약'));eatTxt.appendChild(mk('div','dbr-dc','이터리에서 레스토랑 예약하기'));
    eatL.appendChild(eatTxt);var eatArr=mk('span');eatArr.textContent='›';eatArr.style.cssText='color:var(--bd2);font-size:18px';
    eatRow.appendChild(eatL);eatRow.appendChild(eatArr);
    (function(eu){eatRow.addEventListener('click',function(){showSheet(p.name+' 예약',eu,'eat','','이터리에서 레스토랑 예약하기','레스토랑 예약');});})(eateryUrl);
    bkSearch.appendChild(eatRow);
  }
  body.appendChild(bkSearch);
  var acts=mk('div','d-actions');
  var isSaved=saved.some(function(s){return s.name===p.name;});
  var hb=mk('button','d-btn h'+(isSaved?' on':''),isSaved?'\u2665 \uc800\uc7a5\ub428':'\u2661 \uc800\uc7a5\ud558\uae30');
  hb.id='dHeartBtn';
  hb.addEventListener('click',function(){toggleSD(p.name);});
  // 2번: place_id 있으면 정확한 장소로, 없으면 검색어로
  var gurl=p.place_id
    ?('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.name)+'&query_place_id='+p.place_id)
    :('https://maps.google.com/?q='+encodeURIComponent(p.name+' '+city));
  var nurl='https://map.naver.com/v5/search/'+encodeURIComponent(p.name+' '+city);
  var gb=mk('button','d-btn p','\ud83d\uddfa Google \uc9c0\ub3c4\uc5d0\uc11c \ubcf4\uae30');
  gb.addEventListener('click',function(){window.open(gurl,'_blank');});
  var nb=mk('button','d-btn s','\ud83d\udccd \ub124\uc774\ubc84 \uc9c0\ub3c4 \uac80\uc0c9');
  nb.addEventListener('click',function(){window.open(nurl,'_blank');});
  acts.appendChild(hb);acts.appendChild(gb);acts.appendChild(nb);
  // ── 지도 섹션 (Google Maps embed — API 키 불필요)
  var mapSec=mk('div','d-map-sec');
  var mapHd=mk('div','d-map-hd');
  mapHd.appendChild(mk('span','d-map-ttl','📍 위치 지도'));
  var mapLink=mk('a','d-map-open','Google 지도에서 보기');
  mapLink.href=gurl;mapLink.target='_blank';
  mapHd.appendChild(mapLink);
  mapSec.appendChild(mapHd);
  var mapQ=p.place_id
    ?('place_id:'+p.place_id)
    :(p.name+' '+city+' Japan');
  var mapSrc='https://maps.google.com/maps?q='+encodeURIComponent(mapQ)+'&output=embed&hl=ko&z=16';
  var mapFrame=document.createElement('iframe');
  mapFrame.className='d-map-frame';
  mapFrame.title='장소 지도';
  mapFrame.loading='lazy';
  mapFrame.allowFullscreen=false;
  mapFrame.referrerPolicy='no-referrer-when-downgrade';
  mapFrame.src=mapSrc;
  mapSec.appendChild(mapFrame);
  body.appendChild(mapSec);

  body.appendChild(acts);
  document.getElementById('detailPanel').classList.add('open');
}
function closeDetail(){document.getElementById('detailPanel').classList.remove('open');}

// ── AI 일정 루트 지도 (mkMap: Day 일정의 장소들 경로 표시)
function mkMap(places,cityName){
  if(!places||!places.length)return null;
  var wrap=mk('div','tri-map');
  var hd=mk('div','tri-map-hd');
  hd.appendChild(mk('span','tri-map-ttl','🗺 이동 경로'));
  // Google Maps 방향 URL (경유지 최대 5곳)
  var pts=places.slice(0,5).map(function(pl){return encodeURIComponent(pl.name+' '+(cityName||_tcity)+' Japan');});
  var dirUrl='https://www.google.com/maps/dir/'+pts.join('/');
  var mapExtLink=mk('a','tri-map-link','구글맵에서 열기');
  mapExtLink.href=dirUrl;mapExtLink.target='_blank';
  hd.appendChild(mapExtLink);wrap.appendChild(hd);
  // 출발지→도착지 embed
  var origin=encodeURIComponent(places[0].name+' '+(cityName||_tcity)+' Japan');
  var dest=encodeURIComponent(places[places.length-1].name+' '+(cityName||_tcity)+' Japan');
  var src='https://maps.google.com/maps?saddr='+origin+'&daddr='+dest+'&output=embed&hl=ko';
  var frame=document.createElement('iframe');
  frame.title='이동 경로';frame.loading='lazy';frame.src=src;frame.referrerPolicy='no-referrer-when-downgrade';
  wrap.appendChild(frame);
  return wrap;
}

function mkPlaces(di){
  var d=_tdays[di];
  var wrap=mk('div','tri-places');wrap.id='triPlaces';
  var hd=mk('div','tri-day-hd');
  var dot=mk('div','tri-day-dot',String(di+1));dot.style.background=d.col;
  hd.appendChild(dot);hd.appendChild(mk('div','tri-day-lbl',d.label));
  wrap.appendChild(hd);
  // 지도 (출발→도착 경로)
  var mapEl=mkMap(d.places,_tcity);
  if(mapEl)wrap.appendChild(mapEl);
  d.places.forEach(function(pl,pi){
    var info=gpi(pl.name);
    var row=mk('div','tri-place-row');row.id='tpi-'+di+'-'+pi;
    row.appendChild(mk('div','tri-place-ic',info.ic));
    var body=mk('div','tri-place-body');
    body.appendChild(mk('div','tri-place-name',pl.name));
    body.appendChild(mk('div','tri-place-tp',info.tp));
    body.appendChild(mk('div','tri-place-cm',pl.tip||info.cm));
    if(pl.time)body.appendChild(mk('div','tri-place-time','\u23f0 '+pl.time));
    row.appendChild(body);wrap.appendChild(row);
  });
  return wrap;
}
function switchTD(di){
  if(!_tdays)return;
  document.querySelectorAll('.tri-daytab').forEach(function(t,i){t.classList.toggle('on',i===di);});
  var op=document.getElementById('triPlaces');if(op)op.replaceWith(mkPlaces(di));
}
function copyTri(){
  var lines=(_tdays||[]).map(function(d,i){
    var rows=d.places.map(function(p){return '  '+(p.time||'')+' '+p.name;});
    return['[DAY '+(i+1)+' - '+d.label+']'].concat(rows).join('\n');
  });
  navigator.clipboard.writeText(lines.join('\n\n'))
    .then(function(){alert('\uc77c\uc815\uc774 \ubcf5\uc0ac\ub418\uc5c8\uc5b4\uc694!');})
    .catch(function(){alert('\ubcf5\uc0ac\uc5d0 \uc2e4\ud328\ud588\uc5b4\uc694.');});
}
function buildTriResult(days,aiCity,aiDays,aiStyle,aiPeople){
  var total=parseInt(aiDays)+1;
  _tdays=days.map(function(d,i){
    return{label:d.label,col:PIN_C[i%PIN_C.length],places:d.places.map(function(p){return Object.assign({},p);})};
  });
  _tcity=aiCity;
  var result=document.getElementById('aiResult');result.innerHTML='';
  var wrap=mk('div','tri-wrap'),card=mk('div','tri-card');
  var top=mk('div','tri-top');
  top.appendChild(mk('div','tri-em',aiCity.charAt(0)));
  top.appendChild(mk('div','tri-title',aiCity+' '+aiDays+'\ubc15'+total+'\uc77c \ub9de\ucda4\uc77c\uc815'));
  top.appendChild(mk('div','tri-sub',aiPeople+' '+aiStyle+' \ucf54\uc2a4 \u00b7 Claude AI \uc124\uacc4'));
  card.appendChild(top);
  
  var tabs=mk('div','tri-daytabs');
  days.forEach(function(_,i){
    var btn=mk('button','tri-daytab'+(i===0?' on':''),'Day '+(i+1));
    btn.addEventListener('click',function(){switchTD(i);});
    tabs.appendChild(btn);
  });
  card.appendChild(tabs);
  card.appendChild(mkPlaces(0));
  var footer=mk('div','tri-footer');
  var tip=mk('div','tri-tip');
  tip.appendChild(mk('div','tri-tip-h','\ud83d\udca1 \uc5ec\ud589 \uaffc\ud301'));
  tip.appendChild(mk('div','tri-tip-p','\u00b7 IC\uce74\ub4dc(Suica/ICOCA) \ubbf8\ub9ac \ucda9\uc804 - \uad50\ud1b5\u00b7\ud3b8\uc758\uc810 \uacb0\uc81c \ubaa8\ub450 \uac00\ub2a5'));
  tip.appendChild(mk('div','tri-tip-p','\u00b7 \uc778\uae30 \uc2dd\ub2f9\uc740 \uad6c\uae00\ub9f5 \uc0ac\uc804 \uc608\uc57d or \uac1c\uc810 30\ubd84 \uc804 \uc904\uc11c\uae30'));
  tip.appendChild(mk('div','tri-tip-p','\u00b7 100\uc5d4 \uc49b(\ub2e4\uc774\uc18c\u00b7\uc138\ub9ac\uc544) \uae30\ub150\ud488 - \uac00\uc131\ube44 \ucd5c\uace0!'));
  footer.appendChild(tip);
  var bud=mk('div','tri-budget');
  var budVal=aiStyle==='\uac00\uc131\ube44'?'8,000~12,000\uc5d4':aiStyle==='\ub7ed\uc154\ub9ac'?'30,000~60,000\uc5d4':'15,000~25,000\uc5d4';
  bud.appendChild(mk('span','tri-bud-l','\uc608\uc0c1 \ud558\ub8e8 \uc608\uc0b0 (\uc219\ubc15 \ubcc4\ub3c4)'));
  bud.appendChild(mk('span','tri-bud-r','\uc57d '+budVal+'/\uc778'));
  footer.appendChild(bud);
  // 공유 버튼 (Web Share API → 클립보드 폴백)
  var shareBtn=mk('button','tri-share-btn','\ud83d\udce4 \uc77c\uc815 \uacf5\uc720\ud558\uae30');
  shareBtn.addEventListener('click',shareTri);
  footer.appendChild(shareBtn);
  var acts=mk('div','tri-acts tri-act-row');
  var copyBtn=mk('button','tri-act s','\ud83d\udccb \ud14d\uc2a4\ud2b8 \ubcf5\uc0ac');
  copyBtn.addEventListener('click',copyTri);
  var explBtn=mk('button','tri-act p','\ud83d\uddfa \uc7a5\uc18c \ud0d0\uc0c9');
  explBtn.addEventListener('click',function(){switchPage('explore');});
  acts.appendChild(copyBtn);acts.appendChild(explBtn);
  footer.appendChild(acts);
  card.appendChild(footer);wrap.appendChild(card);result.appendChild(wrap);
}

// ════════════════════════════════════════════════════
// AI ITINERARY — Claude API 일정 생성
// ════════════════════════════════════════════════════
async function genItinerary(){
  var btn=document.getElementById('btnGen');
  var aiCity=document.getElementById('aiCity').value;
  var aiDays=document.getElementById('aiDays').value;
  var aiStyle=document.getElementById('aiStyle').value;
  var aiPeople=document.getElementById('aiPeople').value;
  var interests=[];
  document.querySelectorAll('.ai-chip.on').forEach(function(c){interests.push(c.textContent.trim());});
  var total=parseInt(aiDays)+1;
  btn.disabled=true;btn.textContent='\uc0dd\uc131 \uc911...';buzz(12);
  var result=document.getElementById('aiResult');result.innerHTML='';
  var wrap=mk('div','tri-wrap'),card=mk('div','tri-card'),loading=mk('div','tri-loading');
  var dots=mk('div','tri-dots');
  dots.appendChild(mk('span'));dots.appendChild(mk('span'));dots.appendChild(mk('span'));
  loading.appendChild(dots);
  loading.appendChild(mk('div','tri-ltxt','Claude AI\uac00 '+aiCity+' '+aiDays+'\ubc15'+total+'\uc77c \uc77c\uc815\uc744 \uc124\uacc4\ud558\uace0 \uc788\uc5b4\uc694... (\ub300\ub7b218~30\ucd08)'));
  card.appendChild(loading);wrap.appendChild(card);result.appendChild(wrap);
  // 서버 프록시 호출 (API 키 보안)
  track('ai_generate',{city:aiCity,days:aiDays,style:aiStyle,people:aiPeople});
  try{
    var res=await fetch(PROXY+'/api/itinerary',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({city:aiCity,days:aiDays,style:aiStyle,people:aiPeople,interests:interests})
    });
    var data=await res.json();
    if(!res.ok)throw new Error(data.error||'서버 오류 ('+res.status+')');
    if(data.error)throw new Error(data.error);
    var days=data.days;
    if(days&&days.length){buildTriResult(days,aiCity,aiDays,aiStyle,aiPeople);buzz([12,60,12]);}
    else throw new Error('empty days');
  }catch(e){
    console.error('AI error:',e.message);
    // 에러 UI 표시
    var errWrap=document.getElementById('aiResult');errWrap.innerHTML='';
    var errBox=mk('div','tri-wrap');
    var errCard=mk('div','tri-card');
    var errBody=mk('div',null);
    errBody.style.cssText='padding:32px 20px;text-align:center;';
    var errIc=mk('div',null,'\u26a0\ufe0f');errIc.style.cssText='font-size:40px;margin-bottom:14px;';
    var errTtl=mk('div',null,'\uc77c\uc815 \uc0dd\uc131 \uc2e4\ud328');errTtl.style.cssText='font-size:16px;font-weight:900;color:var(--tx);margin-bottom:8px;';
    var errMsg=mk('div',null,e.message||'\uc11c\ubc84 \uc5f0\uacb0 \uc624\ub958');errMsg.style.cssText='font-size:12px;color:var(--tx3);margin-bottom:20px;line-height:1.6;';
    var retryBtn=mk('button',null,'\ub2e4\uc2dc \uc2dc\ub3c4');retryBtn.style.cssText='background:var(--ac);color:#fff;border:none;border-radius:12px;padding:12px 28px;font-size:14px;font-weight:800;cursor:pointer;font-family:var(--f);';
    retryBtn.addEventListener('click',genItinerary);
    errBody.appendChild(errIc);errBody.appendChild(errTtl);errBody.appendChild(errMsg);errBody.appendChild(retryBtn);
    errCard.appendChild(errBody);errBox.appendChild(errCard);errWrap.appendChild(errBox);
  }
  btn.disabled=false;btn.textContent='AI \ub9de\ucda4 \uc77c\uc815 \uc0dd\uc131\ud558\uae30';
}

// ── Filter drawer ──────────────────────────────
function openFilterDrawer(){
  _flt.foodSub=foodSubCat;_flt.sort=sortBy;_flt.open=onlyOpen;
  buildFilterDrawerContent();
  document.getElementById('fltDw').classList.add('open');
  document.getElementById('fltOv').classList.add('open');
}
function closeFilterDrawer(){
  document.getElementById('fltDw').classList.remove('open');
  document.getElementById('fltOv').classList.remove('open');
}
function resetFilters(){
  _flt={foodSub:'all',sort:'none',open:false};
  buildFilterDrawerContent();
}
function applyFilters(){
  var needLoad=(cat==='restaurant'&&_flt.foodSub!==foodSubCat);
  track('filter_apply',{foodSub:_flt.foodSub,sort:_flt.sort,open:_flt.open,cat:cat,city:city});
  foodSubCat=_flt.foodSub;sortBy=_flt.sort;onlyOpen=_flt.open;
  closeFilterDrawer();
  updateFilterBar();
  if(needLoad)load();else renderList(_places);
}
function buildFilterDrawerContent(){
  var body=document.getElementById('fltBody');body.innerHTML='';
  // Food section (restaurant only)
  if(cat==='restaurant'){
    var foodSec=mk('div','flt-dw-sec');
    foodSec.appendChild(mk('div','flt-dw-sec-ttl','음식 종류'));
    var chips=mk('div','flt-dw-chips');
    FOOD_LABELS.forEach(function(fl){
      var chip=mk('button','flt-dw-chip'+(_flt.foodSub===fl.key?' on':''),fl.label);
      (function(k){chip.addEventListener('click',function(){
        body.querySelectorAll('.flt-dw-chip').forEach(function(c){c.classList.remove('on');});
        chip.classList.add('on');_flt.foodSub=k;
      });})(fl.key);
      chips.appendChild(chip);
    });
    foodSec.appendChild(chips);body.appendChild(foodSec);
  }
  // Sort section
  var sortSec=mk('div','flt-dw-sec');
  sortSec.appendChild(mk('div','flt-dw-sec-ttl','정렬'));
  var sortBtns=mk('div','flt-dw-sort');
  [{key:'rating_desc',label:'⭐ 평점 높은순'},{key:'cnt_desc',label:'📊 리뷰수 높은순'}].forEach(function(s){
    var btn=mk('button','flt-dw-sort-btn'+(_flt.sort===s.key?' on':''));
    btn.appendChild(mk('span',null,s.label));
    var chk=mk('span','flt-dw-sort-check',_flt.sort===s.key?'✓':'');
    btn.appendChild(chk);
    (function(k){btn.addEventListener('click',function(){
      _flt.sort=(_flt.sort===k)?'none':k;
      buildFilterDrawerContent();
    });})(s.key);
    sortBtns.appendChild(btn);
  });
  sortSec.appendChild(sortBtns);body.appendChild(sortSec);
  // Open toggle section
  var togSec=mk('div','flt-dw-sec');
  var togRow=mk('div','flt-dw-toggle-row');
  togRow.appendChild(mk('span','flt-dw-toggle-lbl','🟢 영업중만 보기'));
  var tog=mk('button','flt-dw-toggle'+(_flt.open?' on':''));
  tog.addEventListener('click',function(){_flt.open=!_flt.open;tog.classList.toggle('on');});
  togRow.appendChild(tog);togSec.appendChild(togRow);body.appendChild(togSec);
}
function updateFilterBar(){
  var cnt=0;
  var row=document.getElementById('filterActiveRow');if(row)row.innerHTML='';
  if(foodSubCat!=='all'){cnt++;if(row){row.appendChild(mkFilterTag(getFoodLabel(foodSubCat),function(){foodSubCat='all';_flt.foodSub='all';updateFilterBar();load();}));}}
  if(sortBy!=='none'){cnt++;var sl=sortBy==='rating_desc'?'평점순':'리뷰수순';if(row){row.appendChild(mkFilterTag(sl,function(){sortBy='none';_flt.sort='none';updateFilterBar();renderList(_places);}));}}
  if(onlyOpen){cnt++;if(row){row.appendChild(mkFilterTag('영업중',function(){onlyOpen=false;_flt.open=false;updateFilterBar();renderList(_places);}));}}
  var badge=document.getElementById('filterCntBadge');
  if(badge){badge.textContent=cnt;badge.style.display=cnt>0?'flex':'none';}
  var fbtn=document.getElementById('btnFilterOpen');
  if(fbtn)fbtn.classList.toggle('active',cnt>0);
}
function mkFilterTag(label,removeFn){
  var tag=mk('span','filter-tag');
  tag.appendChild(mk('span',null,label));
  var x=mk('button','filter-tag-x','×');
  x.addEventListener('click',function(e){e.stopPropagation();removeFn();});
  tag.appendChild(x);return tag;
}

// ── Itinerary builder ──────────────────────────
function openItin(){
  renderItin();
  document.getElementById('itinPanel').classList.add('open');
}
function closeItin(){
  document.getElementById('itinPanel').classList.remove('open');
}
function renderItin(){
  var scroll=document.getElementById('itinScroll');scroll.innerHTML='';
  // Hero
  var hero=mk('div','itin-hero');
  hero.appendChild(mk('div','itin-hero-ttl','내 여행 일정표'));
  hero.appendChild(mk('div','itin-hero-sub',saved.length+'개 장소 · '+_itinDays+'일 여행'));
  scroll.appendChild(hero);
  // Day selector
  var daysRow=mk('div','itin-days-row');
  for(var d=1;d<=5;d++){
    (function(day){
      var btn=mk('button','itin-day-btn'+(day===_itinDays?' on':''),day+'일');
      btn.addEventListener('click',function(){_itinDays=day;renderItin();});
      daysRow.appendChild(btn);
    })(d);
  }
  scroll.appendChild(daysRow);
  // Day sections
  var byDay={};
  Object.keys(_itinAssign).forEach(function(nm){
    var d=_itinAssign[nm];
    if(d>=1&&d<=_itinDays){if(!byDay[d])byDay[d]=[];byDay[d].push(nm);}
  });
  for(var d2=1;d2<=_itinDays;d2++){
    var places2=byDay[d2]||[];
    var sec=mk('div','itin-day-section');
    var hd=mk('div','itin-day-hd');
    hd.appendChild(mk('span','itin-day-lbl','Day '+d2));
    hd.appendChild(mk('span','itin-day-cnt',places2.length+'곳'));
    sec.appendChild(hd);
    if(places2.length){
      places2.forEach(function(nm2,i){
        var row=mk('div','itin-assigned-item');
        row.appendChild(mk('span','itin-num',String(i+1)));
        var info=mk('div','itin-item-info');
        info.appendChild(mk('div','itin-item-nm',nm2));
        var sv=saved.find(function(s){return s.name===nm2;});
        info.appendChild(mk('div','itin-item-ct',sv?sv.city||'':''));
        row.appendChild(info);
        var rm=mk('button','itin-item-rm','×');
        (function(n){rm.addEventListener('click',function(e){e.stopPropagation();delete _itinAssign[n];localStorage.setItem('tabi_itin',JSON.stringify(_itinAssign));renderItin();});})(nm2);
        row.appendChild(rm);
        sec.appendChild(row);
      });
    } else {
      sec.appendChild(mk('div','itin-day-empty','장소를 아래에서 탭하여 추가하세요'));
    }
    scroll.appendChild(sec);
  }
  // Saved places list
  var savedSec=mk('div','itin-saved-sec');
  var savedHd=mk('div','itin-saved-hd');
  savedHd.appendChild(mk('div','itin-saved-ttl','저장한 장소 — 탭하면 날짜 지정'));
  savedSec.appendChild(savedHd);
  if(!saved.length){
    var emp=mk('div',null,'저장한 장소가 없어요. 탐색 탭에서 ♡을 눌러 저장하세요!');
    emp.style.cssText='padding:24px 16px;font-size:13px;color:var(--tx3);text-align:center;';
    savedSec.appendChild(emp);
  } else {
    saved.forEach(function(s){
      var assigned=_itinAssign[s.name];
      var row2=mk('div','itin-place-row');
      var ic=mk('div','itin-place-ic',gpi(s.name).ic);
      var info2=mk('div','itin-place-info');
      info2.appendChild(mk('div','itin-place-nm',s.name));
      info2.appendChild(mk('div','itin-place-ct',s.city||''));
      row2.appendChild(ic);row2.appendChild(info2);
      if(assigned){
        row2.appendChild(mk('span','itin-place-day-badge','Day '+assigned));
      }
      (function(nm3){row2.addEventListener('click',function(){
        var cur=_itinAssign[nm3]||0;
        var next=(cur>=_itinDays)?0:cur+1;
        if(next===0)delete _itinAssign[nm3]; else _itinAssign[nm3]=next;
        localStorage.setItem('tabi_itin',JSON.stringify(_itinAssign));
        renderItin();
      });})(s.name);
      savedSec.appendChild(row2);
    });
  }
  scroll.appendChild(savedSec);
}
function copyItinerary(){
  track('itinerary_copy',{days:_itinDays,places:Object.keys(_itinAssign).length});
  var lines=['📅 내 일본 여행 일정표 (TABI)',''];
  var byDay2={};
  Object.keys(_itinAssign).forEach(function(nm){
    var d=_itinAssign[nm];
    if(d>=1&&d<=_itinDays){if(!byDay2[d])byDay2[d]=[];byDay2[d].push(nm);}
  });
  for(var d3=1;d3<=_itinDays;d3++){
    lines.push('[ Day '+d3+' ]');
    var pl=byDay2[d3]||[];
    if(pl.length)pl.forEach(function(n,i){lines.push('  '+(i+1)+'. '+n);});
    else lines.push('  (미정)');
    lines.push('');
  }
  var txt=lines.join('\n');
  if(navigator.clipboard){
    navigator.clipboard.writeText(txt).then(function(){showToast('일정표가 클립보드에 복사되었어요!');});
  } else {
    var ta=document.createElement('textarea');ta.value=txt;
    document.body.appendChild(ta);ta.select();document.execCommand('copy');
    document.body.removeChild(ta);showToast('일정표가 복사되었어요!');
  }
}
function showToast(msg){
  var t=mk('div','toast',msg);document.body.appendChild(t);
  setTimeout(function(){t.classList.add('show');},10);
  setTimeout(function(){t.classList.remove('show');setTimeout(function(){if(t.parentNode)t.remove();},300);},2500);
}


})();
