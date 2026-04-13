// TABI — Data Layer (전역 데이터 상수)
// styles.css, app.js 로드 순서: data.js → app.js

var PROXY='https://tabi-app-wheat.vercel.app';

// ── Bottom Sheet
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

var PLAT_LABELS={kl:'KLOOK',mr:'마이리얼트립',eat:'Eatery',bk:'Booking.com',ag:'Agoda'};
var LOGO_SVG={
  kl:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 28"><rect width="72" height="28" rx="6" fill="#FF6000"/><text x="36" y="19.5" font-family="Arial Black,Arial,sans-serif" font-size="14" font-weight="900" fill="white" text-anchor="middle" letter-spacing="-0.3">klook</text></svg>',
  mr:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 28"><rect width="80" height="28" rx="6" fill="#1EC8C8"/><text x="40" y="18" font-family="Arial,sans-serif" font-size="9.5" font-weight="800" fill="white" text-anchor="middle">마이리얼트립</text></svg>',
  bk:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 82 28"><rect width="82" height="28" rx="6" fill="#003580"/><text x="41" y="18.5" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="white" text-anchor="middle">Booking.com</text></svg>',
  ag:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 28"><rect width="68" height="28" rx="6" fill="#5392F9"/><text x="34" y="19.5" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="white" text-anchor="middle">agoda</text></svg>',
  eat:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 28"><rect width="64" height="28" rx="6" fill="#E84040"/><text x="32" y="19.5" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="white" text-anchor="middle">eatery</text></svg>'
};
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
document.getElementById('sheetGo').addEventListener('click',function(){window.open(_sheetUrl,'_blank');closeSheet();});
document.getElementById('sheetCancel').addEventListener('click',closeSheet);
document.getElementById('sheetX').addEventListener('click',closeSheet);
document.getElementById('sheetOverlay').addEventListener('click',closeSheet);

var CITIES=[
  {kr:'도쿄',en:'Tokyo Japan'},{kr:'오사카',en:'Osaka Japan'},
  {kr:'교토',en:'Kyoto Japan'},{kr:'후쿠오카',en:'Fukuoka Japan'},
  {kr:'삿포로',en:'Sapporo Japan'},{kr:'나라',en:'Nara Japan'},
  {kr:'가마쿠라',en:'Kamakura Japan'},{kr:'나고야',en:'Nagoya Japan'},
  {kr:'하코네',en:'Hakone Japan'},{kr:'히로시마',en:'Hiroshima Japan'},
  {kr:'요코하마',en:'Yokohama Japan'},{kr:'고베',en:'Kobe Japan'},
  {kr:'벳푸',en:'Beppu Japan'},{kr:'나가사키',en:'Nagasaki Japan'},
  {kr:'가나자와',en:'Kanazawa Japan'},{kr:'닛코',en:'Nikko Japan'}
];
var CATS=[
  {key:'tourist_attraction',label:'관광명소'},
  {key:'restaurant',label:'맛집'},
  {key:'cafe',label:'카페'},
  {key:'lodging',label:'숙박'},
  {key:'shopping_mall',label:'쇼핑'},
  {key:'park',label:'공원'},
  {key:'museum',label:'박물관'},
  {key:'amusement_park',label:'테마파크'},
  {key:'spa',label:'온천'}
];
var catLbl={};
CATS.forEach(function(c){catLbl[c.key]=c.label;});
var KLOOK_AFF='YOUR_KLOOK_ID';   // 클룩 파트너 ID 입력
var MRT_AFF='YOUR_MRT_ID';     // 마이리얼트립 파트너 ID 입력
var BOOKING_AFF='YOUR_BOOKING_ID'; // Booking.com 제휴 ID 입력
var AGODA_AFF='YOUR_AGODA_ID';     // Agoda 파트너 ID 입력
var EATERY_AFF='YOUR_EATERY_ID';   // 이터리 파트너 ID 입력
function aff(url,p){
  if(p==='kl'&&KLOOK_AFF!=='YOUR_KLOOK_ID')
    return 'https://affiliate.klook.com/redirect?aid='+KLOOK_AFF+'&url='+encodeURIComponent(url);
  if(p==='mr'&&MRT_AFF!=='YOUR_MRT_ID')
    return url+(url.indexOf('?')>=0?'&':'?')+'referral_code='+MRT_AFF;
  return url;
}
var KU={
  skytree:aff('https://www.klook.com/ko/activity/41352-tokyo-skytree/','kl'),
  teamlab:aff('https://www.klook.com/ko/activity/25300-teamlab-planets-toyosu-tokyo-ticket/','kl'),
  usj:aff('https://www.klook.com/ko/activity/3794-universal-studios-japan-ticket-osaka/','kl'),
  usj2:aff('https://www.klook.com/ko/activity/3407-universal-studios-japan-express-pass-osaka/','kl'),
  kyoto:aff('https://www.klook.com/ko/activity/83627-kyoto-bus-tour/','kl'),
  arashi:aff('https://www.klook.com/ko/activity/140184-kyoto-arashiyama-kiyomizu-dera-bus-tour-from-osaka/','kl'),
  kimono:aff('https://www.klook.com/ko/activity/117278-kimono-rental-arashiyama-togetukyo-kyoto-aiwafuki/','kl'),
  hakone:aff('https://www.klook.com/ko/activity/9943-narita-airport-limousine-bus-hakone-free-pass-tokyo/','kl')
};
function klc(c){
  var KLOOK_CITY={
    '도쿄':'tokyo-japan','오사카':'osaka-japan','교토':'kyoto-japan',
    '후쿠오카':'fukuoka-japan','삿포로':'sapporo-japan','나라':'nara-japan',
    '가마쿠라':'kamakura-japan','나고야':'nagoya-japan','하코네':'hakone-japan',
    '히로시마':'hiroshima-japan','요코하마':'yokohama-japan','고베':'kobe-japan',
    '벳푸':'beppu-japan','나가사키':'nagasaki-japan','가나자와':'kanazawa-japan','닛코':'nikko-japan'
  };
  var slug=KLOOK_CITY[c]||'tokyo-japan';
  return aff('https://www.klook.com/ko/experiences/list/'+slug+'/','kl');
}
function mrc(c){
  return aff('https://www.myrealtrip.com/offers?query='+encodeURIComponent(c+' 일본'),'mr');
}
var BKP={};
BKP['\ub3c4\ucfc4 \uc2a4\uce74\uc774\ud2b8\ub9ac']=[
  {cls:'kl',logo:'KLOOK',nm:'\ub3c4\ucfc4 \uc2a4\uce74\uc774\ud2b8\ub9ac \uc785\uc7a5\uad8c',dc:'\ubaa8\ubc14\uc77c \ud2f0\ucf13 \u00b7 \ud604\uc7a5 \ubc14\ub85c \uc785\uc7a5',pr:'38,000\uc6d0~',cm:'\ucd5c\ub300 8%',url:KU.skytree},
  {cls:'mr',logo:'MRT',nm:'\ub3c4\ucfc4 \uc2a4\uce74\uc774\ud2b8\ub9ac \ud22c\uc5b4',dc:'\ub9c8\uc774\ub9ac\uc5bc\ud2b8\ub9bd \ub3c4\ucfc4 \ucd94\ucc9c',pr:'35,000\uc6d0~',cm:'\ucd5c\ub300 5%',url:mrc('\ub3c4\ucfc4')}
];
BKP['\ud300\ub7a9 \ud50c\ub798\ub2db \ub3c4\ucfc4']=[
  {cls:'kl',logo:'KLOOK',nm:'\ud300\ub7a9 \ud50c\ub798\ub2db \uc785\uc7a5\uad8c',dc:'\ub0a0\uc9dc \uc9c0\uc815 \u00b7 \uc0ac\uc804\uc608\uc57d \ud544\uc218',pr:'36,000\uc6d0~',cm:'\ucd5c\ub300 8%',url:KU.teamlab}
];
BKP['\uc720\ub2c8\ubc84\uc124 \uc2a4\ud29c\ub514\uc624 \uc7ac\ud32c(USJ)']=[
  {cls:'kl',logo:'KLOOK',nm:'USJ 1\uc77c \uc785\uc7a5\uad8c',dc:'\ub2f9\uc77c QR\ucf54\ub4dc \u00b7 \uc989\uc2dc \uc785\uc7a5',pr:'98,000\uc6d0~',cm:'\ucd5c\ub300 8%',url:KU.usj},
  {cls:'kl',logo:'KLOOK',nm:'USJ \uc775\uc2a4\ud504\ub808\uc2a4 \ud328\uc2a4',dc:'\uc904 \uc5c6\uc774 \ud0d1\uc2b9',pr:'80,000\uc6d0~',cm:'\ucd5c\ub300 8%',url:KU.usj2}
];
BKP['\uae30\uc694\ubbf8\uc988\ub370\ub77c']=[
  {cls:'kl',logo:'KLOOK',nm:'\uad50\ud1a0 \uc77c\uc77c \ubc84\uc2a4 \ud22c\uc5b4',dc:'\uae30\uc694\ubbf8\uc988\u00b7\uc774\ub098\ub9ac \ud3ec\ud568',pr:'45,000\uc6d0~',cm:'\ucd5c\ub300 8%',url:KU.kyoto},
  {cls:'mr',logo:'MRT',nm:'\uad50\ud1a0 \ud22c\uc5b4 \uc804\uccb4 \ubcf4\uae30',dc:'\ub9c8\uc774\ub9ac\uc5bc\ud2b8\ub9bd \uad50\ud1a0',pr:'40,000\uc6d0~',cm:'\ucd5c\ub300 5%',url:mrc('\uad50\ud1a0')}
];
BKP['\uc544\ub77c\uc2dc\uc57c\ub9c8 \ub300\ub098\ubb34 \uc22b']=[
  {cls:'kl',logo:'KLOOK',nm:'\uc544\ub77c\uc2dc\uc57c\ub9c8 \ubc84\uc2a4 \ud22c\uc5b4',dc:'\uc624\uc0ac\uce74 \ucd9c\ubc1c \ub2f9\uc77c \uad50\ud1a0',pr:'38,000\uc6d0~',cm:'\ucd5c\ub300 8%',url:KU.arashi}
];
BKP['\ud558\ucf54\ub124 \uc624\ud508\uc5d0\uc5b4 \ubba4\uc9c0\uc5c4']=[
  {cls:'kl',logo:'KLOOK',nm:'\ud558\ucf54\ub124 \ud504\ub9ac\ud328\uc2a4+\ub9ac\ubb34\uc9c4',dc:'\ub098\ub9ac\ud0c0 \ucd9c\ubc1c 2\uc77c \ud328\uc2a4',pr:'65,000\uc6d0~',cm:'\ucd5c\ub300 8%',url:KU.hakone},
  {cls:'mr',logo:'MRT',nm:'\ud558\ucf54\ub124 \ud22c\uc5b4 \uc804\uccb4 \ubcf4\uae30',dc:'\ub9c8\uc774\ub9ac\uc5bc\ud2b8\ub9bd \ud558\ucf54\ub124',pr:'80,000\uc6d0~',cm:'\ucd5c\ub300 5%',url:mrc('\ud558\ucf54\ub124')}
];

// ─── 제휴 데이터 확장 (Phase 3) ───────────────────
// 도쿄
BKP['아사쿠사 센소지']=[
  {cls:'kl',logo:'KLOOK',nm:'아사쿠사·센소지 인력거 투어',dc:'현지 인력거꾼과 함께하는 감성 코스',pr:'25,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=아사쿠사+센소지+인력거','kl')},
  {cls:'mr',logo:'MRT',nm:'아사쿠사 도보 투어',dc:'한국인 가이드 동행',pr:'18,000원~',cm:'최대 5%',url:mrc('아사쿠사')}
];
BKP['메이지 신궁']=[
  {cls:'kl',logo:'KLOOK',nm:'도쿄 신주쿠·하라주쿠 투어',dc:'메이지 신궁 포함 반나절 코스',pr:'22,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=메이지+신궁','kl')},
  {cls:'mr',logo:'MRT',nm:'도쿄 신사·공원 반나절',dc:'마이리얼트립 인기 코스',pr:'20,000원~',cm:'최대 5%',url:mrc('메이지 신궁')}
];
BKP['시부야 스크램블 교차로']=[
  {cls:'kl',logo:'KLOOK',nm:'도쿄 야경 버스 투어',dc:'시부야·신주쿠·도쿄 타워',pr:'35,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=도쿄+야경+버스','kl')},
  {cls:'mr',logo:'MRT',nm:'시부야 스트리트 투어',dc:'숨은 명소 로컬 가이드',pr:'28,000원~',cm:'최대 5%',url:mrc('시부야')}
];
BKP['도쿄 디즈니랜드']=[
  {cls:'kl',logo:'KLOOK',nm:'도쿄 디즈니랜드 1일 입장권',dc:'모바일 티켓·당일 입장 가능',pr:'88,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=도쿄+디즈니랜드','kl')},
  {cls:'mr',logo:'MRT',nm:'디즈니랜드 패키지',dc:'마이리얼트립 특가',pr:'85,000원~',cm:'최대 5%',url:mrc('도쿄 디즈니랜드')}
];
BKP['도쿄 디즈니씨']=[
  {cls:'kl',logo:'KLOOK',nm:'도쿄 디즈니씨 1일 입장권',dc:'성인·어린이 모바일 티켓',pr:'88,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=도쿄+디즈니씨','kl')},
  {cls:'mr',logo:'MRT',nm:'디즈니씨 패키지',dc:'마이리얼트립 특가',pr:'85,000원~',cm:'최대 5%',url:mrc('도쿄 디즈니씨')}
];
BKP['롯폰기 힐즈']=[
  {cls:'kl',logo:'KLOOK',nm:'도쿄 시티 뷰 전망대 입장권',dc:'롯폰기 힐즈 52층 전망대',pr:'18,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=롯폰기+힐즈+전망대','kl')},
  {cls:'mr',logo:'MRT',nm:'도쿄 전망대 투어',dc:'마이리얼트립 야경 코스',pr:'22,000원~',cm:'최대 5%',url:mrc('롯폰기')}
];
BKP['오다이바']=[
  {cls:'kl',logo:'KLOOK',nm:'오다이바 팀랩 디지털아트',dc:'가족 여행 최적 코스',pr:'36,000원~',cm:'최대 8%',url:KU.teamlab},
  {cls:'mr',logo:'MRT',nm:'오다이바 반나절 투어',dc:'레인보우 브릿지·쇼핑',pr:'20,000원~',cm:'최대 5%',url:mrc('오다이바')}
];
// 오사카
BKP['도톤보리']=[
  {cls:'kl',logo:'KLOOK',nm:'오사카 나이트 스트리트 투어',dc:'도톤보리·신사이바시 야경',pr:'28,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=도톤보리+투어','kl')},
  {cls:'mr',logo:'MRT',nm:'오사카 먹거리 투어',dc:'타코야키·오코노미야키 현지 체험',pr:'35,000원~',cm:'최대 5%',url:mrc('도톤보리')}
];
BKP['오사카성']=[
  {cls:'kl',logo:'KLOOK',nm:'오사카성 입장권 + 오디오가이드',dc:'QR코드 즉시 입장',pr:'12,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=오사카성','kl')},
  {cls:'mr',logo:'MRT',nm:'오사카 성 & 역사 투어',dc:'한국어 가이드 동행',pr:'25,000원~',cm:'최대 5%',url:mrc('오사카성')}
];
BKP['신사이바시']=[
  {cls:'kl',logo:'KLOOK',nm:'오사카 쇼핑 투어',dc:'신사이바시·아메리카무라',pr:'22,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=신사이바시','kl')},
  {cls:'mr',logo:'MRT',nm:'오사카 쇼핑 가이드',dc:'현지인 추천 쇼핑 코스',pr:'18,000원~',cm:'최대 5%',url:mrc('신사이바시')}
];
BKP['덴덴타운']=[
  {cls:'kl',logo:'KLOOK',nm:'오사카 아니메 & 게임 투어',dc:'덴덴타운 깊숙이 탐방',pr:'20,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=덴덴타운','kl')},
  {cls:'mr',logo:'MRT',nm:'오사카 서브컬처 투어',dc:'마이리얼트립 오타쿠 코스',pr:'25,000원~',cm:'최대 5%',url:mrc('덴덴타운')}
];
// 교토
BKP['후시미 이나리 타이샤']=[
  {cls:'kl',logo:'KLOOK',nm:'교토 후시미 이나리 조기 투어',dc:'새벽 인파 없이 붉은 도리이',pr:'32,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=후시미+이나리','kl')},
  {cls:'mr',logo:'MRT',nm:'교토 신사 전문 투어',dc:'마이리얼트립 소규모 가이드',pr:'30,000원~',cm:'최대 5%',url:mrc('후시미 이나리')}
];
BKP['킨카쿠지 (금각사)']=[
  {cls:'kl',logo:'KLOOK',nm:'교토 황금 일일 투어',dc:'금각사·니조성·철학의 길',pr:'45,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=금각사','kl')},
  {cls:'mr',logo:'MRT',nm:'교토 핵심 사찰 투어',dc:'마이리얼트립 반나절 코스',pr:'38,000원~',cm:'최대 5%',url:mrc('금각사')}
];
BKP['기온 거리']=[
  {cls:'kl',logo:'KLOOK',nm:'기온 마이코·기모노 체험',dc:'전통 기모노 + 사진 촬영',pr:'55,000원~',cm:'최대 8%',url:KU.kimono},
  {cls:'mr',logo:'MRT',nm:'기온 야간 투어',dc:'마이코 문화 + 저녁 야경',pr:'40,000원~',cm:'최대 5%',url:mrc('기온')}
];
BKP['니시키 시장']=[
  {cls:'kl',logo:'KLOOK',nm:'교토 미식 도보 투어',dc:'니시키 시장 + 시식 투어',pr:'38,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=니시키+시장','kl')},
  {cls:'mr',logo:'MRT',nm:'교토 시장 음식 투어',dc:'현지인 즐겨 찾는 코스',pr:'35,000원~',cm:'최대 5%',url:mrc('니시키 시장')}
];
// 후쿠오카
BKP['다자이후 텐만구']=[
  {cls:'kl',logo:'KLOOK',nm:'후쿠오카 다자이후 반나절 투어',dc:'학문의 신·매화 명소',pr:'28,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=다자이후','kl')},
  {cls:'mr',logo:'MRT',nm:'다자이후 역사 투어',dc:'마이리얼트립 후쿠오카',pr:'25,000원~',cm:'최대 5%',url:mrc('다자이후')}
];
BKP['캐널 시티 하카타']=[
  {cls:'kl',logo:'KLOOK',nm:'후쿠오카 시내 투어',dc:'캐널 시티·나카스 야경',pr:'22,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=캐널+시티+후쿠오카','kl')},
  {cls:'mr',logo:'MRT',nm:'후쿠오카 쇼핑+맛집 투어',dc:'현지인 추천 코스',pr:'20,000원~',cm:'최대 5%',url:mrc('후쿠오카 캐널시티')}
];
// 삿포로
BKP['오도리 공원']=[
  {cls:'kl',logo:'KLOOK',nm:'삿포로 시내 반나절 투어',dc:'오도리 공원·시계탑·라멘 횡정',pr:'25,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=삿포로+투어','kl')},
  {cls:'mr',logo:'MRT',nm:'삿포로 핵심 코스',dc:'마이리얼트립 북해도',pr:'22,000원~',cm:'최대 5%',url:mrc('삿포로')}
];
BKP['삿포로 맥주 박물관']=[
  {cls:'kl',logo:'KLOOK',nm:'삿포로 맥주 박물관 입장권',dc:'무료 견학 + 유료 시음 세트',pr:'8,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=삿포로+맥주','kl')},
  {cls:'mr',logo:'MRT',nm:'북해도 음식 투어',dc:'게·스프카레·맥주',pr:'35,000원~',cm:'최대 5%',url:mrc('삿포로 맥주')}
];
// 나라
BKP['나라 공원']=[
  {cls:'kl',logo:'KLOOK',nm:'나라 사슴 공원 반나절 투어',dc:'오사카 출발 편리한 당일치기',pr:'20,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=나라+공원','kl')},
  {cls:'mr',logo:'MRT',nm:'나라 역사 투어',dc:'마이리얼트립 관서 코스',pr:'22,000원~',cm:'최대 5%',url:mrc('나라')}
];
// 하코네
BKP['하코네 신사']=[
  {cls:'kl',logo:'KLOOK',nm:'하코네 당일 투어',dc:'신사·아시노코·로프웨이',pr:'55,000원~',cm:'최대 8%',url:KU.hakone},
  {cls:'mr',logo:'MRT',nm:'하코네 온천 + 관광',dc:'료칸 체험 포함',pr:'80,000원~',cm:'최대 5%',url:mrc('하코네')}
];
BKP['아시노코']=[
  {cls:'kl',logo:'KLOOK',nm:'하코네 해적선 + 로프웨이',dc:'아시노코 해적선 크루즈',pr:'45,000원~',cm:'최대 8%',url:aff('https://www.klook.com/ko/search/?query=하코네+해적선','kl')},
  {cls:'mr',logo:'MRT',nm:'하코네 자연 투어',dc:'후지산 조망 명소',pr:'50,000원~',cm:'최대 5%',url:mrc('아시노코')}
];

var CBK={};
CBK['\ub3c4\ucfc4']=[
  {cls:'kl',nm:'\uc2a4\uce74\uc774\ud2b8\ub9ac \uc785\uc7a5\uad8c',pr:'38,000\uc6d0~',url:KU.skytree},
  {cls:'kl',nm:'\ud300\ub7a9 \ud50c\ub798\ub2db',pr:'36,000\uc6d0~',url:KU.teamlab},
  {cls:'mr',nm:'\ub3c4\ucfc4 \uc778\uae30 \ud22c\uc5b4',pr:'20,000\uc6d0~',url:mrc('\ub3c4\ucfc4')}
];
CBK['\uc624\uc0ac\uce74']=[
  {cls:'kl',nm:'USJ 1\uc77c \uc785\uc7a5\uad8c',pr:'98,000\uc6d0~',url:KU.usj},
  {cls:'kl',nm:'USJ \uc775\uc2a4\ud504\ub808\uc2a4',pr:'80,000\uc6d0~',url:KU.usj2},
  {cls:'mr',nm:'\uc624\uc0ac\uce74 \uc778\uae30 \ud22c\uc5b4',pr:'20,000\uc6d0~',url:mrc('\uc624\uc0ac\uce74')}
];
CBK['\uad50\ud1a0']=[
  {cls:'kl',nm:'\uad50\ud1a0 \ubc84\uc2a4 \ud22c\uc5b4',pr:'45,000\uc6d0~',url:KU.kyoto},
  {cls:'kl',nm:'\uae30\ubaa8\ub178 \ub80c\ud0c8',pr:'22,000\uc6d0~',url:KU.kimono},
  {cls:'mr',nm:'\uad50\ud1a0 \uc778\uae30 \ud22c\uc5b4',pr:'25,000\uc6d0~',url:mrc('\uad50\ud1a0')}
];
CBK['\ud558\ucf54\ub124']=[
  {cls:'kl',nm:'\ud558\ucf54\ub124 \ud504\ub9ac\ud328\uc2a4',pr:'65,000\uc6d0~',url:KU.hakone},
  {cls:'mr',nm:'\ud558\ucf54\ub124 \uc778\uae30 \ud22c\uc5b4',pr:'50,000\uc6d0~',url:mrc('\ud558\ucf54\ub124')}
];
var PINFO={};
PINFO['\ub3c4\ucfc4 \uc2a4\uce74\uc774\ud2b8\ub9ac']={ic:'\ud83d\uddfc',tp:'\uc804\ub9dd\ub300',cm:'\ub9d1\uc740 \ub0a0\uc5d4 \ud6c4\uc9c0\uc0b0\uae4c\uc9c0 \ubcf4\uc5ec\uc694! \uc57c\uacbd\ub3c4 \ud658\uc0c1\uc801'};
PINFO['\uc544\uc0ac\ucfe0\uc0ac \uc13c\uc18c\uc9c0']={ic:'\u26e9\ufe0f',tp:'\uc2e0\uc0ac',cm:'\uc544\uce68 \uc77c\uc801 \uc624\uba74 \uc778\ud30c \uc5c6\uc774 \uc2e0\ube44\ub85c\uc6b4 \ubd84\uc704\uae30'};
PINFO['\uba54\uc774\uc9c0 \uc2e0\uad81']={ic:'\ud83c\udf32',tp:'\uc2e0\uc0ac\u00b7\uacf5\uc6d0',cm:'70\ub9cc \uadf8\ub8e8 \ub098\ubb34\ub85c \ub458\ub7ec\uc2f8\uc778 \ub3c4\uc2ec \ud790\ub9c1 \uacf5\uac04'};
PINFO['\uc2dc\ubd80\uc57c \uc2a4\ud06c\ub7a8\ube14 \uad50\ucc28\ub85c']={ic:'\ud83d\udea6',tp:'\ub79c\ub4dc\ub9c8\ud06c',cm:'\uc2a4\ud0c0\ubc85\uc2a4 2\uce35\uc5d0\uc11c \ub0b4\ub824\ub2e4\ubcf4\ub294 \ubdf0\uac00 \ucd5c\uace0'};
PINFO['\ud300\ub7a9 \ud50c\ub798\ub2db \ub3c4\ucfc4']={ic:'\ud83c\udf0a',tp:'\ubbf8\ub514\uc5b4\uc544\ud2b8',cm:'\ubb3c \uc704\ub97c \uac78\ub294 \ubab0\uc785\ud615 \ub514\uc9c0\ud138 \uc544\ud2b8, \uc0ac\uc804 \uc608\uc57d \ud544\uc218!'};
PINFO['\uc624\uc0ac\uce74\uc131']={ic:'\ud83c\udff0',tp:'\uc131\u00b7\uc5ed\uc0ac',cm:'8\uce35 \uc804\ub9dd\ub300\uc5d0\uc11c \uc624\uc0ac\uce74 \uc804\uacbd\uc744 \ud55c\ub208\uc5d0'};
PINFO['\ub3c4\ud1a4\ubcf4\ub9ac']={ic:'\ud83e\udd9e',tp:'\uba39\uac70\ub9ac',cm:'\uae00\ub9ac\ucf54 \uac04\ud310 \uc778\uc99d\uc0f7 \ud544\uc218! \ub2e4\ucf54\uc57c\ud0a4\u00b7\uc624\ucf54\ub178\ubbf8\uc57c\ud0a4'};
PINFO['\uc720\ub2c8\ubc84\uc124 \uc2a4\ud29c\ub514\uc624 \uc7ac\ud32c(USJ)']={ic:'\ud83c\udfa2',tp:'\ud14c\ub9c8\ud30c\ud06c',cm:'\ub2cc\ud150\ub3c4 \uc6d4\ub4dc\u00b7\ud574\ub9ac\ud3ec\ud130 \uad6c\uc5ed, \ud3c9\uc77c \uc624\uc804 \ucd94\ucc9c'};
PINFO['\ud6c4\uc2dc\ubbf8 \uc774\ub098\ub9ac \ub300\uc0ac']={ic:'\u26e9\ufe0f',tp:'\uc2e0\uc0ac',cm:'\uc0c8\ubcbd\uc5d0 \uc624\uba74 \uc548\uac1c \uc18d \ubd89\uc740 \ub3c4\ub9ac\uc774\ub97c \ud63c\uc790 \ub3c5\uc810!'};
PINFO['\uc544\ub77c\uc2dc\uc57c\ub9c8 \ub300\ub098\ubb34 \uc22b']={ic:'\ud83c\udf8b',tp:'\uc790\uc5f0\u00b7\uc0b0\ucc45',cm:'\uc544\uce68 7\uc2dc \uc774\uc804 \ubc29\ubb38\ud558\uba74 \uac70\uc758 \ud63c\uc790 \uc990\uae38 \uc218 \uc788\uc5b4\uc694'};
PINFO['\ud0a8\uce74\ucfe0\uc9c0']={ic:'\ud83c\udfdb',tp:'\uc808\u00b7\uc138\uacc4\uc720\uc0b0',cm:'\uc5f0\ubabb\uc5d0 \ud669\uae08\ube5b \ubc18\uc601, \uc624\uc804 \ud587\uc0b4\uc774 \ucd5c\uace0'};
PINFO['\uae30\uc628 \uac70\ub9ac']={ic:'\ud83c\udf19',tp:'\uc5ed\uc0ac\uc9c0\uad6c',cm:'\uc800\ub141 6~8\uc2dc\uc5d0 \ub9c8\uc774\ucf54\u00b7\uac8c\uc774\uc0e4\ub97c \uc2e4\uc81c\ub85c \ub9cc\ub0a0 \uc218 \uc788\uc5b4\uc694'};
PINFO['\uae30\uc694\ubbf8\uc988\ub370\ub77c']={ic:'\ud83d\uded5',tp:'\uc808\u00b7\uc138\uacc4\uc720\uc0b0',cm:'\ub098\ubb34 \ubb34\ub300\uc5d0\uc11c \ubc14\ub77c\ubcf4\ub294 \uad50\ud1a0 \uc2dc\uac00\uc9c0 \uc804\ub9dd\uc774 \uc808\uacbd'};
PINFO['\ub098\ub77c \uacf5\uc6d0']={ic:'\ud83e\udd8c',tp:'\uacf5\uc6d0\u00b7\uc0ac\uc2b4',cm:'1,200\ub9c8\ub9ac \uc0ac\uc2b4\uc774 \uc790\uc720\ub86d\uac8c! \uc0ac\uc2b4 \uc804\ubcd1 \ud544\uc218'};
PINFO['\ub3c4\ub2e4\uc774\uc9c0']={ic:'\ud83c\udfdb',tp:'\uc808\u00b7\uad6d\ubcf4',cm:'\uc138\uacc4 \ucd5c\ub300 \ubaa9\uc870 \uac74\ubb3c, \ub192\uc774 15m \uccad\ub3d9 \ub300\ubd88'};
PINFO['\uac00\ub9c8\ucfe0\ub77c \ub300\ubd88']={ic:'\ud83d\ude4f',tp:'\ub300\ubd88\u00b7\uad6d\ubcf4',cm:'\ub192\uc774 11m \uccad\ub3d9 \ub300\ubd88, \ub0b4\ubd80 \uc785\uc7a5 \uac00\ub2a5(20\uc5d4)'};
PINFO['\ud558\ucf54\ub124 \uc624\ud508\uc5d0\uc5b4 \ubba4\uc9c0\uc5c4']={ic:'\ud83d\uddc3\ufe0f',tp:'\uc57c\uc678 \ubbf8\uc220\uad00',cm:'\uc790\uc5f0 \uc18d \uc138\uacc4\uc801 \uc870\uac01 \uc791\ud488\ub4e4, \uc871\uc695\ud0d5\ub3c4 \uc788\uc5b4\uc694'};
PINFO['\ud788\ub85c\uc2dc\ub9c8 \ud3c9\ud654 \uae30\ub150\uad00']={ic:'\ud83d\udd4a\ufe0f',tp:'\uc5ed\uc0ac\u00b7\uae30\ub150\uad00',cm:'\uc804\uc7c1\uc758 \ube44\uadf9\uc744 \uae30\uc5b5\ud558\ub294 \uc138\uacc4\ubb38\ud654\uc720\uc0b0'};
function gpi(nm){
  var ks=Object.keys(PINFO),i,k;
  for(i=0;i<ks.length;i++){k=ks[i];if(nm===k||nm.indexOf(k)>=0||k.indexOf(nm)>=0)return PINFO[k];}
  return{ic:'\ud83d\udccd',tp:'\uad00\uad11\uba85\uc18c',cm:'\uaefc \ubc29\ubb38\ud574\ubcfc \ub9cc\ud55c \ucd94\ucc9c \uc7a5\uc18c\uc5d0\uc694'};
}
var COORDS={
  '\ub3c4\ucfc4':{lat:35.6762,lng:139.6503},'\uc624\uc0ac\uce74':{lat:34.6937,lng:135.5023},
  '\uad50\ud1a0':{lat:35.0116,lng:135.7681},'\ud6c4\ucfe0\uc624\uce74':{lat:33.5904,lng:130.4017},
  '\uc0b3\ud3ec\ub85c':{lat:43.0618,lng:141.3545},'\ub098\ub77c':{lat:34.6851,lng:135.8049},
  '\uac00\ub9c8\ucfe0\ub77c':{lat:35.3197,lng:139.5507},'\ub098\uace0\uc57c':{lat:35.1815,lng:136.9066},
  '\ud558\ucf54\ub124':{lat:35.2323,lng:139.1069},'\ud788\ub85c\uc2dc\ub9c8':{lat:34.3853,lng:132.4553},
  '\uc694\ucf54\ud558\ub9c8':{lat:35.4437,lng:139.6380},'\uace0\ubca0':{lat:34.6913,lng:135.1830},
  '\ubcb3\ud478':{lat:33.2840,lng:131.4910}
};
var PIN_C=['#00c896','#ff4757','#3742fa','#f0a500','#a55eea'];
var AI_DB={};
AI_DB['\ub3c4\ucfc4']=[
  {label:'\uc804\ud1b5\uacfc \ud604\ub300 \u2014 \uc785\ubb38',places:[
    {name:'\uc544\uc0ac\ucfe0\uc0ac \uc13c\uc18c\uc9c0',time:'08:30',tip:'\uac1c\uc7a5 \uc804 \ub3c4\uc0b0\ud558\uba74 \uc778\ud30c \uc5c6\uc774 \uc870\uc6a9\ud788 \uac10\uc0c1 \uac00\ub2a5'},
    {name:'\ub3c4\ucfc4 \uc2a4\uce74\uc774\ud2b8\ub9ac',time:'11:00',tip:'\ub0a0\uc528 \uc88b\uc73c\uba74 \ud6c4\uc9c0\uc0b0 \uc870\ub9dd, 350m \uc804\ub9dd\ub371'},
    {name:'\uc544\ud0a4\ud558\ubc14\ub77c',time:'14:00',tip:'\uc560\ub2c8\u00b7\uac8c\uc784\u00b7\ud53c\uaddc\uc5b4\u00b7\uc804\uc790\uc81c\ud488\uc758 \uccad\uad6d'},
    {name:'\uc2dc\ubd80\uc57c \uc2a4\ud06c\ub7a8\ube14 \uad50\ucc28\ub85c',time:'18:00',tip:'\uc2a4\ud0c0\ubc85\uc2a4 2\uce35\uc5d0\uc11c \ud53c\ud06c\ud0c0\uc784 \uad50\ucc28\ub85c \uc870\ub9dd'}
  ]},
  {label:'\uc790\uc5f0\u00b7\ubb38\ud654 \ud0d0\ubc29',places:[
    {name:'\uba54\uc774\uc9c0 \uc2e0\uad81',time:'08:00',tip:'70\ub9cc \uadf8\ub8e8 \uc22b, \uc774\ub978 \uc544\uce68 \uc0b0\ucc45\uc774 \ucd5c\uace0'},
    {name:'\uc2e0\uc8fc\ucfe0 \uad50\uc5d4',time:'12:00',tip:'\ub3c4\uc2dc\ub77d \ud53d\ub2c8, 3\ub300 \ubcda\uaf43 \uba85\uc18c'},
    {name:'\ud300\ub7a9 \ud50c\ub798\ub2db \ub3c4\ucfc4',time:'15:00',tip:'\ubab0\uc785\ud615 \ub514\uc9c0\ud138 \uc544\ud2b8, \uc0ac\uc804 \uc608\uc57d \ud544\uc218!'},
    {name:'\uc624\ub2e4\uc774\ubc14 \ud574\ubcc0\uacf5\uc6d0',time:'19:00',tip:'\ub808\uc778\ubcf4\uc6b0 \ube0c\ub9ac\uc9c0 \uc57c\uacbd'}
  ]},
  {label:'\ub85c\ucec8 \ub9db\uc9d1\u00b7\uc1fc\ud551',places:[
    {name:'\uce20\ud0a4\uc9c0 \uc7a5\uc678\uc2dc\uc7a5',time:'07:00',tip:'\uc798\uce58\ub36e\ubc25\uc73c\ub85c \uc544\uce68 \uc2dd\uc0ac'},
    {name:'\uae34\uc790',time:'10:00',tip:'\uba85\ud488\u00b7\ubc31\ud654\uc810\u00b7\uc560\ud50c\uc2a4\ud1a0\uc5b4 \uc9d1\uacb0\uc9c0'},
    {name:'\uc6b0\uc5d0\ub178 \uacf5\uc6d0',time:'13:00',tip:'\uad6d\ub9bd\ubc15\ubb3c\uad00 \uad6d\ubcf4 89\uc810'},
    {name:'\uc544\uba54\uc694\ucf54 \uc2dc\uc7a5',time:'15:30',tip:'\ud65c\uae30\ucc2c \uc7ac\ub798\uc2dc\uc7a5'}
  ]},
  {label:'\uadfc\uad50 \uac00\ub9c8\ucfe0\ub77c',places:[
    {name:'\uac00\ub9c8\ucfe0\ub77c \ub300\ubd88',time:'09:00',tip:'\ub192\uc774 11m \uad6d\ubcf4 \uccad\ub3d9 \ub300\ubd88, \ub0b4\ubd80 \uc785\uc7a5 \uac00\ub2a5'},
    {name:'\uc5d0\ub178\uc2dc\ub9c8 \uc12f',time:'12:00',tip:'\uc2dc\ub77c\uc2a4 \ub36e\ubc25\uc774 \uba85\ubb3c'},
    {name:'\uc4f0\ub8e8\uac00\uc624\uce74 \ud558\uce58\ub9cc\uad6c',time:'16:00',tip:'\uac00\ub9c8\ucfe0\ub77c\uc758 \uc0c1\uc9d5 \uc2e0\uc0ac'}
  ]}
];
AI_DB['\uc624\uc0ac\uce74']=[
  {label:'\uba39\uace0 \uc990\uae30\uae30',places:[
    {name:'\uad6c\ub85c\ubab0 \uc2dc\uc7a5',time:'09:00',tip:'\uc624\uc0ac\uce74\uc758 \ubd80\uc5c2, \uc2e0\uc120\ud55c \ud574\uc0b0\ubb3c'},
    {name:'\ub3c4\ud1a4\ubcf4\ub9ac',time:'11:00',tip:'\uae00\ub9ac\ucf54 \uac04\ud310 \uc778\uc99d\uc0f7 \ud544\uc218'},
    {name:'\uc2e0\uc0ac\uc774\ubc14\uc2dc',time:'13:30',tip:'600m \uc544\ucf00\uc774\ub4dc \uc1fc\ud551'},
    {name:'\uc624\uc0ac\uce74\uc131',time:'16:00',tip:'8\uce35 \uc804\ub9dd\ub300\uc5d0\uc11c \uc624\uc0ac\uce74 \uc804\uacbd'}
  ]},
  {label:'USJ \uc644\uc804 \uc815\ubcf5',places:[
    {name:'\uc720\ub2c8\ubc84\uc124 \uc2a4\ud29c\ub514\uc624 \uc7ac\ud32c(USJ)',time:'08:30',tip:'\uac1c\uc7a5 \uc804 \ub3c4\uc0b0 \ud544\uc218, \ub2cc\ud150\ub3c4 \uc6d4\ub4dc \uc0ac\uc804 \uc608\uc57d'},
    {name:'\uc288\ud37c \ub2cc\ud150\ub3c4 \uc6d4\ub4dc',time:'10:00',tip:'\ub9c8\ub9ac\uc624 \uc5d0\ub108\uc9c0 \ubc34\ub4dc\ub85c \ucf54\uc778 \ubaa8\uc73c\uae30'},
    {name:'\ud574\ub9ac\ud3ec\ud130 \uad6c\uc5ed',time:'13:00',tip:'\ubc84\ud130\ube44\uc5b4\uc640 \uc62c\ub9ac\ubc34\ub354 \uc9c0\ud321\uc774 \uccb4\ud5d8'}
  ]}
];
AI_DB['\uad50\ud1a0']=[
  {label:'\uc2e0\uc0ac\uc640 \uc790\uc5f0 \u2014 \uc0c8\ubcbd',places:[
    {name:'\ud6c4\uc2dc\ubbf8 \uc774\ub098\ub9ac \ub300\uc0ac',time:'06:30',tip:'\uc0c8\ubcbd \uc548\uac1c \uc18d \ubd89\uc740 \ub3c4\ub9ac\uc774'},
    {name:'\uae30\uc694\ubbf8\uc988\ub370\ub77c',time:'10:30',tip:'\ub098\ubb34 \ubb34\ub300\uc5d0\uc11c \uad50\ud1a0 \uc804\ub9dd'},
    {name:'\uc0b0\ub113\uc790\uce74\u00b7\ub2c8\ub123\uc790\uce74',time:'12:30',tip:'\ub3cc\uae38\uacfc \uae30\ub150\ud488 \uac70\ub9ac'},
    {name:'\uae30\uc628 \uac70\ub9ac',time:'17:00',tip:'\uc800\ub141 6~8\uc2dc \ub9c8\uc774\ucf54 \ub9c8\uc8fc\uce60 \ud655\ub960 \ucd5c\uace0'}
  ]},
  {label:'\ud669\uae08\ube5b \uc0ac\uc6d0 \uc21c\ub840',places:[
    {name:'\ud0a8\uce74\ucfe0\uc9c0 (\uae08\uac01\uc0ac)',time:'09:00',tip:'\uc624\ud508 \uc9c1\ud6c4 \uc5f0\ubabb \ubc18\uc601 \uc0ac\uc9c4'},
    {name:'\uc544\ub77c\uc2dc\uc57c\ub9c8 \ub300\ub098\ubb34 \uc22b',time:'14:00',tip:'\uc624\uc804\u00b7\uc624\ud6c4 \ubaa8\ub450 \uc544\ub984\ub2e4\uc6cc'},
    {name:'\ud150\ub958\uc9c0 \uc815\uc6d0',time:'15:30',tip:'\uc138\uacc4\uc720\uc0b0 \uc9c0\ucc9c\ud68c\uc720\uc2dd \uc815\uc6d0'}
  ]}
];
AI_DB['\ud6c4\ucfe0\uc624\uce74']=[{label:'\ud575\uc2ec \ucf54\uc2a4',places:[
  {name:'\ub2e4\uc790\uc774\ud6c4 \ud150\ub9cc\uad81',time:'09:00',tip:'\ud559\ubb38\uc758 \uc2e0 \uc218\ud5d8\uc0dd \uc131\uc9c0'},
  {name:'\ucf90\ub110\uc2dc\ud2f0 \ud558\uce74\ud0c0',time:'14:00',tip:'\ubd84\uc218\uc1fc\uc640 \ub0b4\ubd80 \uc6b4\ud558'},
  {name:'\ub098\uce74\uc2a4 \uc57c\ud0c0\uc774 \uac70\ub9ac',time:'19:00',tip:'\ub3fc\uc9c0\ubfc8 \ub77c\uba58\u00b7\ubaa8\uce20\ub098\ubca0'}
]}];
AI_DB['\uc0b3\ud3ec\ub85c']=[{label:'\uc2dc\ub0b4 \ud575\uc2ec',places:[
  {name:'\uc624\ub3c4\ub9ac \uacf5\uc6d0',time:'09:00',tip:'\uc5ec\ub984 \ub9e5\uc8fc \ucd95\uc81c\u00b7\uaca8\uc6b8 \ub208 \ucd95\uc81c'},
  {name:'\ud648\uce74\uc774\ub3c4 \uc2e0\uad81',time:'10:30',tip:'\ubd04 \ubcda\uaf43\u00b7\uac00\uc744 \ub2e8\ud48d'},
  {name:'\uc0b3\ud3ec\ub85c \ub9e5\uc8fc \ubc15\ubb3c\uad00',time:'13:00',tip:'무료 견학 후 시음'}
]}];
AI_DB['\ub098\ub77c']=[{label:'\uc0ac\uc2b4\uacfc \ub300\ubd88',places:[
  {name:'\ub098\ub77c \uacf5\uc6d0',time:'09:00',tip:'1,200\ub9c8\ub9ac \uc790\uc720 \uc0ac\uc2b4'},
  {name:'\ub3c4\ub2e4\uc774\uc9c0',time:'10:00',tip:'\uc138\uacc4 \ucd5c\ub300 \ubaa9\uc870 \uac74\ubb3c, 15m \ub300\ubd88'},
  {name:'\uac00\uc2a4\uac00 \ub300\uc0ac',time:'13:00',tip:'3,000\uac1c \ub4f1\ubd88\ub85c \uc720\uba85'},
  {name:'\ub098\ub77c\ub9c8\uce58 \uace8\ubaa9',time:'15:00',tip:'\uc5d0\ub3c4 \uc2dc\ub300 \uc0c1\uc778 \ub9c8\uc744'}
]}];
AI_DB['\uac00\ub9c8\ucfe0\ub77c']=[{label:'1\uc77c \uc644\uc804 \ucf54\uc2a4',places:[
  {name:'\uac00\ub9c8\ucfe0\ub77c \ub300\ubd88',time:'09:00',tip:'\ub192\uc774 11m \uad6d\ubcf4 \uccad\ub3d9 \ub300\ubd88'},
  {name:'\ud558\uc138\ub370\ub77c',time:'10:30',tip:'6\uc6d4 \uc218\uad6d \uc808\uacbd'},
  {name:'\uc5d0\ub178\uc2dc\ub9c8 \uc12f',time:'13:00',tip:'\uc2dc\ub77c\uc2a4 \ub36e\ubc25 \uba85\ubb3c'},
  {name:'\uc4f0\ub8e8\uac00\uc624\uce74 \ud558\uce58\ub9cc\uad6c',time:'16:30',tip:'\ub2e8\ud48d \uc2dc\uc820 \uc808\uacbd'}
]}];
AI_DB['\ud558\ucf54\ub124']=[{label:'\uc628\uccad\u00b7\uc790\uc5f0',places:[
  {name:'\ud558\ucf54\ub124 \uc624\ud508\uc5d0\uc5b4 \ubba4\uc9c0\uc5c4',time:'09:30',tip:'\uc790\uc5f0 \uc18d \uc870\uac01\u00b7\uc871\uc695\ud0d5'},
  {name:'\uc544\uc2dc\ub178\ud638',time:'13:30',tip:'\ub9d1\uc740 \ub0a0 \ud6c4\uc9c0\uc0b0 \ubc18\uc601'},
  {name:'\uc624\uc640\ucfe0\ub2e4\ub2c8',time:'16:30',tip:'\uac80\uc740 \uacc4\ub780 \uaf2d \uba39\uc5b4\ubcf4\uae30'}
]}];
AI_DB['\ud788\ub85c\uc2dc\ub9c8']=[{label:'\ud3c9\ud654\uc640 \uc5ed\uc0ac',places:[
  {name:'\ud788\ub85c\uc2dc\ub9c8 \ud3c9\ud654 \uae30\ub150\uad00',time:'09:00',tip:'\uc6d0\ud3ed \ub3c4\uc640 \ud568\uaed8 2\uc2dc\uac04 \uad00\ub78c'},
  {name:'\ubbf8\uc57c\uc9c0\ub9c8 \uc12f',time:'15:00',tip:'\ud398\ub9ac 15\ubd84, \uc0ac\uc2b4\uacfc \ub3c4\ub9ac\uc774'},
  {name:'\uc774\uce20\ucfe0\uc2dc\ub9c8 \uc2e0\uc0ac',time:'16:00',tip:'\ub9cc\uc870 \ub54c \ubc14\ub2e4 \uc704\uc5d0 \ub728\ub294 \ub3c4\ub9ac\uc774'}
]}];
AI_DB['\uc694\ucf54\ud558\ub9c8']=[{label:'\ud56d\uad6c \ub3c4\uc2dc',places:[
  {name:'\uc694\ucf54\ud558\ub9c8 \ucc28\uc774\ub098\ud0c0\uc6b4',time:'10:00',tip:'\uc77c\ubcf8 \ucd5c\ub300 \ucc28\uc774\ub098\ud0c0\uc6b4'},
  {name:'\ubbf8\ub098\ud1a0\ubbf8\ub77c\uc774 21',time:'15:30',tip:'\ub79c\ub4dc\ub9c8\ud06c \ud0c0\uc6cc \uc1fc\ud551'},
  {name:'\uc624\uc0b0\ubc14\uc2dc \uc5ec\uac1d\ud130\ubbf8\ub110',time:'17:30',tip:'\ubaa9\uc81c \ub370\ud06c \uc11d\uc591 \uac10\uc0c1'}
]}];
AI_DB['\uace0\ubca0']=[{label:'\ub099\ub9cc \ud56d\uad6c',places:[
  {name:'\uae30\ud0c0\ub178 \uc774\uc9c4\uce78',time:'09:30',tip:'\uc774\uad6d\uc801 \uc11c\uc591 \uad00\uc800 \uac70\ub9ac'},
  {name:'\ub09c\ucf08\ub9c8\uce58',time:'12:00',tip:'\uace0\ubca0\uc2dd \uc911\ud654\uc694\ub9ac'},
  {name:'\uace0\ubca0 \ud558\ubc84\ub79c\ub4dc',time:'15:30',tip:'\uc57c\uacbd\uc758 \ud575\uc2ec'}
]}];
AI_DB['\ub098\uace0\uc57c']=[{label:'\ub098\uace0\uc57c \ud575\uc2ec',places:[
  {name:'\ub098\uace0\uc57c\uc131',time:'09:00',tip:'\uae08 \uc0e4\uce58\ud638\ucf54\ub85c \uc720\uba85'},
  {name:'\uc544\uce20\ud0c0 \uc2e0\uad81',time:'11:30',tip:'\uc77c\ubcf8 3\ub300 \uc2e0\uad81'},
  {name:'\uc624\uc2a4 \uc0c1\uc810\uac00',time:'14:00',tip:'\ud78b\ud55c \uce74\ud398 \ud63c\uc7ac'}
]}];
AI_DB['\ubcb3\ud478']=[{label:'\uc628\uccad \uccad\uad6d',places:[
  {name:'\uc9c0\uc625 \uc628\uccad \uc21c\ub840',time:'09:00',tip:'8\uac1c \uc9c0\uc625 \uc628\uccad, \uc57d 2\uc2dc\uac04'},
  {name:'\ub2e4\ucf00\uac00\uc640\ub77c \uc628\uccad',time:'11:30',tip:'1879\ub144 \uac1c\uc5c5 \ub808\ud2b8\ub85c \uc628\uccad'},
  {name:'\ubcb3\ud478 \ub85c\ud504\uc6e8\uc774',time:'17:00',tip:'\uc628\uccad \ub3c4\uc2dc \uc804\uacbd\uacfc \uc11d\uc591'}
]}];


// ── 음식 서브 카테고리
var FOOD_LABELS=[
  {key:'all',label:'전체'},{key:'ramen',label:'라멘'},{key:'sushi',label:'스시·회'},
  {key:'izakaya',label:'이자카야'},{key:'tonkatsu',label:'돈카츠'},{key:'yakitori',label:'야키토리'},
  {key:'yakiniku',label:'야키니쿠'},{key:'udon',label:'우동·소바'},{key:'nabe',label:'나베'},
  {key:'shabu',label:'샤부샤부'},{key:'oden',label:'오뎅'},{key:'kushikatsu',label:'꼬치'},{key:'gyoza',label:'교자'}
];
function getFoodLabel(k){for(var i=0;i<FOOD_LABELS.length;i++)if(FOOD_LABELS[i].key===k)return FOOD_LABELS[i].label;return k;}
