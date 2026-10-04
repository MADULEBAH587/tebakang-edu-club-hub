import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, limit, doc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig),db=getFirestore(app),$=s=>document.querySelector(s);
let matches=[],players=[],events=[],media=[],albums=[],settings={},seasonFilter="ALL",nextKickoff=0,scoreMemory=new Map(),goalTimer=null,selectedPublicMatchId="",viewerPhotos=[],viewerIndex=0,viewerStartX=0;

onSnapshot(collection(db,"matches"),snap=>{
  const fresh=snap.docs.map(d=>({id:d.id,...d.data()})).filter(m=>m.publicVisible!==false).sort((a,b)=>ms(b.kickoff)-ms(a.kickoff));
  const live=fresh.find(m=>["LIVE","HT"].includes(m.status));
  if(live){const old=scoreMemory.get(live.id);if(old&&Number(live.homeScore)>Number(old.home))showGoal(live);}
  scoreMemory=new Map(fresh.map(m=>[m.id,{home:m.homeScore||0,away:m.awayScore||0}]));
  matches=fresh;
  if(selectedPublicMatchId&&!matches.some(m=>m.id===selectedPublicMatchId))selectedPublicMatchId="";
  renderAll();
},e=>console.warn("matches",e.code||e.message));
onSnapshot(collection(db,"players"),snap=>{players=snap.docs.map(d=>({id:d.id,...d.data()})).sort(playerSort);renderAll();},e=>console.warn("players",e.code||e.message));
onSnapshot(collection(db,"events"),snap=>{events=snap.docs.map(d=>({id:d.id,...d.data()}));renderAll();},e=>console.warn("events",e.code||e.message));
onSnapshot(query(collection(db,"media"),orderBy("createdAt","desc"),limit(120)),snap=>{media=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.visible!==false);renderGallery();},e=>console.warn("media",e.code||e.message));
onSnapshot(collection(db,"albums"),snap=>{albums=snap.docs.map(d=>({id:d.id,...d.data()})).filter(a=>a.visible!==false).sort((a,b)=>albumTime(b)-albumTime(a));renderGallery();},e=>console.warn("albums",e.code||e.message));
onSnapshot(doc(db,"settings","public"),snap=>{settings=snap.exists()?snap.data():{};renderAll();},()=>{});

$("#seasonFilter")?.addEventListener("change",e=>{seasonFilter=e.target.value;renderArchive();});

function renderAll(){
  renderVisibility();renderSeasons();renderMainMatch();renderNext();renderForm();renderArchive();renderH2H();renderSquad();renderClubStats();renderGallery();renderTicker();
  const season=currentSeason();if($("#heroSeason"))$("#heroSeason").textContent=season;if($("#squadSeason"))$("#squadSeason").textContent=season;if($("#statsSeason"))$("#statsSeason").textContent=season;
}
function renderVisibility(){
  $("#squad")?.classList.toggle("public-hidden",settings.showSquad===false);
  $("#stats")?.classList.toggle("public-hidden",settings.showStats===false);
  $("#h2h")?.classList.toggle("public-hidden",settings.showH2H===false);
  $("#media")?.classList.toggle("public-hidden",settings.showMedia===false);
  $("#matches")?.classList.toggle("public-hidden",settings.showArchive===false);
}
function currentSeason(){return String(settings.currentSeason||matches.map(m=>String(m.season||"")).filter(Boolean).sort().reverse()[0]||"2026");}
function activeMatch(){const chosen=matches.find(m=>m.id===selectedPublicMatchId);if(chosen)return chosen;const live=matches.find(m=>["LIVE","HT","MATCHDAY"].includes(m.status));if(live)return live;const ft=matches.find(m=>m.status==="FT");if(ft)return ft;const now=Date.now();return [...matches].filter(m=>ms(m.kickoff)>=now).sort((a,b)=>ms(a.kickoff)-ms(b.kickoff))[0]||matches[0];}

function renderMainMatch(){
  const m=activeMatch(),empty=$("#matchEmptyState");
  if(!m){
    if(empty)empty.hidden=false;
    setText("#matchHeading","Match Centre");setText("#mainStatusBadge","TBA");setText("#matchStatusMini","TBA");setText("#scoreCaption","NO MATCH");
    setText("#matchTypeTop","NO MATCH");setText("#matchDateTop","TBA");setText("#awayNameMain","TBA");setText("#awayCodeMain","OPP");
    const logo=$("#awayLogoMain");if(logo)logo.removeAttribute("src");
    setText("#homeScoreMain","—");setText("#awayScoreMain","—");setText("#metaType","⚽ Match TBA");setText("#metaVenue","🏟️ Venue TBA");setText("#metaMatchday","🏁 Club Match");
    setText("#overviewResult","—");setText("#overviewOpponent","No match selected");setText("#overviewStatus","TBA");setText("#overviewMotm","—");setText("#overviewSeason","Season "+currentSeason());
    $("#publicTimeline").innerHTML='<p class="empty-state">Tiada event direkodkan.</p>';clearPitch();$("#publicBench").innerHTML="";
    return;
  }
  if(empty)empty.hidden=true;
  const live=["LIVE","HT","MATCHDAY"].includes(m.status),upcoming=!live&&m.status!=="FT";
  setText("#matchHeading",live?"Match Centre":upcoming?"Next Match":"Latest Result");setText("#mainStatusBadge",statusText(m.status));setText("#matchStatusMini",m.status||"UPCOMING");setText("#scoreCaption",statusText(m.status));
  setText("#matchTypeTop",(m.matchType||"Friendly Match").toUpperCase());setText("#matchDateTop",fullDate(m.kickoff));
  setText("#awayNameMain",(m.opponent||"OPPONENT").toUpperCase());setText("#awayCodeMain",(m.opponentCode||"OPP").toUpperCase());
  const logo=$("#awayLogoMain");if(logo){if(m.opponentLogo)logo.src=m.opponentLogo;else logo.removeAttribute("src");}
  setText("#homeScoreMain",upcoming?"–":m.homeScore??0);setText("#awayScoreMain",upcoming?"–":m.awayScore??0);
  setText("#metaType","⚽ "+(m.matchType||"Friendly Match"));setText("#metaVenue","🏟️ "+(m.venue||"Venue TBA"));setText("#metaMatchday","🏁 "+(m.matchday?"Matchday "+m.matchday:"Club Match"));
  setText("#overviewResult",upcoming?"VS":String(m.homeScore??0)+"–"+String(m.awayScore??0));setText("#overviewOpponent","vs "+(m.opponent||"Opponent"));setText("#overviewStatus",m.status||"UPCOMING");setText("#overviewMotm",m.motmPlayerName||"—");setText("#overviewSeason","Season "+(m.season||currentSeason()));
  renderTimeline(m);renderLineup(m);
}
function renderTimeline(m){const el=$("#publicTimeline"),list=events.filter(e=>e.matchId===m.id).sort((a,b)=>(a.minute??999)-(b.minute??999)||stamp(a)-stamp(b));el.innerHTML=list.length?list.map(e=>'<div class="public-event"><div class="minute">'+(e.minute?e.minute+"'":"—")+'</div><div class="etype">'+icon(e.type)+' '+esc(e.type||"EVENT")+'</div><div><strong>'+esc(eventDesc(e))+'</strong><small>'+esc(e.note||"")+'</small></div></div>').join(""):'<p class="empty-state">Tiada event direkodkan.</p>';}
function clearPitch(){const pitch=$("#publicPitch");if(!pitch)return;pitch.querySelectorAll(".pitch-player,.p").forEach(x=>x.remove());pitch.insertAdjacentHTML("beforeend",'<span class="p p-am">LINEUP TBA</span>');}
function renderLineup(m){
  const pitch=$("#publicPitch"),bench=$("#publicBench");pitch.querySelectorAll(".pitch-player,.p").forEach(x=>x.remove());
  const starters=(m.starters||[]).map(id=>players.find(p=>p.id===id)).filter(Boolean),groups={gk:[],def:[],mid:[],att:[]};
  starters.forEach(p=>groups[group(p.position)].push(p));placeGroup(groups.gk,8,pitch);placeGroup(groups.def,31,pitch);placeGroup(groups.mid,56,pitch);placeGroup(groups.att,82,pitch);
  if(!starters.length)pitch.insertAdjacentHTML("beforeend",'<span class="p p-am">LINEUP TBA</span>');
  const subs=(m.substitutes||[]).map(id=>players.find(p=>p.id===id)).filter(Boolean);bench.innerHTML=subs.length?'<span class="kicker">BENCH</span> '+subs.map(p=>'<span class="bench-chip">#'+esc(p.number||"—")+' '+esc(p.name)+'</span>').join(""):"";
}
function placeGroup(list,x,pitch){const n=list.length;if(!n)return;list.forEach((p,i)=>{const y=n===1?50:15+(70*i/(n-1)),d=document.createElement("div");d.className="pitch-player";d.style.left=x+"%";d.style.top=y+"%";d.innerHTML='<div class="dot">'+esc(p.number||p.position||"P")+'</div><span>'+esc(p.name)+'</span>';pitch.appendChild(d);});}
function group(pos=""){pos=pos.toUpperCase();if(pos.includes("GK"))return"gk";if(/CB|LB|RB|DF|WB/.test(pos))return"def";if(/DM|CM|AM|MF/.test(pos))return"mid";return"att";}

function renderNext(){
  const now=Date.now(),n=[...matches].filter(m=>!["FT","LIVE","HT"].includes(m.status)&&ms(m.kickoff)>=now).sort((a,b)=>ms(a.kickoff)-ms(b.kickoff))[0];
  if(!n){setText("#nextMatchTitle","Ready for the next one.");setText("#nextMatchMeta","Perlawanan seterusnya belum diumumkan.");setText("#nextMatchCountdown","TBA");setText("#nextOpponentCode","TBA");$("#nextOpponentLogo")?.removeAttribute("src");nextKickoff=0;return;}
  setText("#nextMatchTitle","TEBAKANG EDU vs "+(n.opponent||"Opponent"));setText("#nextMatchMeta",fullDate(n.kickoff)+" · "+(n.venue||"Venue TBA")+" · "+(n.matchType||"Friendly Match"));setText("#nextOpponentCode",n.opponentCode||"VS");if(n.opponentLogo)$("#nextOpponentLogo").src=n.opponentLogo;else $("#nextOpponentLogo")?.removeAttribute("src");nextKickoff=ms(n.kickoff);tickCountdown();
}
function tickCountdown(){if(!nextKickoff)return;const diff=nextKickoff-Date.now();if(diff<=0){setText("#nextMatchCountdown","MATCHDAY");return;}const d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),m=Math.floor(diff%3600000/60000);setText("#nextMatchCountdown",d+"D : "+String(h).padStart(2,"0")+"H : "+String(m).padStart(2,"0")+"M");}
setInterval(tickCountdown,30000);

function renderForm(){const ft=matches.filter(m=>m.status==="FT").slice(0,5),el=$("#recentForm");if(el)el.innerHTML=ft.map(m=>{const r=(m.homeScore??0)>(m.awayScore??0)?"W":(m.homeScore??0)===(m.awayScore??0)?"D":"L";return '<span class="form-dot '+r.toLowerCase()+'" title="'+esc(m.opponent||"Opponent")+'">'+r+'</span>';}).join("");}
function renderSeasons(){const el=$("#seasonFilter");if(!el)return;const old=seasonFilter,ss=[...new Set(matches.map(m=>String(m.season||"")).filter(Boolean))].sort().reverse();el.innerHTML='<option value="ALL">All seasons</option>'+ss.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join("");el.value=ss.includes(old)?old:"ALL";}
function renderArchive(){
  const el=$("#matchList");if(!el)return;const list=matches.filter(m=>seasonFilter==="ALL"||String(m.season)===seasonFilter);
  el.innerHTML=list.length?list.map(m=>{
    const d=toDate(m.kickoff),day=d?String(d.getDate()).padStart(2,"0"):"—",mon=d?d.toLocaleString("en-MY",{month:"short"}).toUpperCase():"TBA",score=m.status==="FT"||["LIVE","HT"].includes(m.status)?String(m.homeScore??0)+' <small>'+esc(m.status||"")+'</small> '+String(m.awayScore??0):'— <small>'+esc(m.status||"UPCOMING")+'</small> —',logo=m.opponentLogo?'<img src="'+m.opponentLogo+'" alt="'+esc(m.opponent||"Opponent")+'">':'<div class="initial-crest">'+esc((m.opponentCode||"OP").slice(0,2))+'</div>',album=albums.find(a=>a.matchId===m.id&&a.visible!==false);
    return '<article class="match-row '+(m.status==="FT"?"featured":"muted")+'" data-open-match="'+m.id+'" tabindex="0"><div class="match-date"><b>'+day+'</b><span>'+mon+'</span></div><img src="./assets/tebakang-edu-logo.webp" alt="Tebakang Educator FC"><strong>Tebakang Edu</strong><div class="row-score">'+score+'</div><strong>'+esc(m.opponent||"Opponent")+'</strong>'+logo+'<span class="match-type">'+esc(m.matchType||"Friendly")+(album?'<button class="photo-link" data-album="'+album.id+'">Photos</button>':'')+'</span></article>';
  }).join(""):'<p class="empty-state">Tiada perlawanan untuk musim ini.</p>';
  el.querySelectorAll("[data-open-match]").forEach(card=>{const open=e=>{if(e?.target?.closest("[data-album]"))return;selectedPublicMatchId=card.dataset.openMatch;renderMainMatch();document.getElementById("match-centre").scrollIntoView({behavior:"smooth",block:"start"});};card.addEventListener("click",open);card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")open(e);});});
  el.querySelectorAll("[data-album]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();openAlbum(b.dataset.album);}));
}

function renderH2H(){const grid=$("#h2hGrid");if(!grid)return;const ft=matches.filter(m=>m.status==="FT"),map=new Map();ft.forEach(m=>{const key=m.opponentId||m.opponent||"Opponent",r=map.get(key)||{name:m.opponent||"Opponent",code:m.opponentCode||"OPP",logo:m.opponentLogo||"",p:0,w:0,d:0,l:0,gf:0,ga:0};r.p++;r.gf+=Number(m.homeScore||0);r.ga+=Number(m.awayScore||0);if(m.homeScore>m.awayScore)r.w++;else if(m.homeScore===m.awayScore)r.d++;else r.l++;map.set(key,r);});const list=[...map.values()].sort((a,b)=>b.p-a.p);grid.innerHTML=list.length?list.map(r=>'<article class="h2h-card">'+(r.logo?'<img src="'+r.logo+'" alt="'+esc(r.name)+'">':'<div class="h2h-placeholder">'+esc(r.code.slice(0,3))+'</div>')+'<div><h3>'+esc(r.name)+'</h3><small>'+r.gf+' goals for · '+r.ga+' against</small></div><div class="h2h-record"><div><b>'+r.p+'</b><span>P</span></div><div><b>'+r.w+'</b><span>W</span></div><div><b>'+r.d+'</b><span>D</span></div><div><b>'+r.l+'</b><span>L</span></div><div><b>'+r.gf+'–'+r.ga+'</b><span>GOALS</span></div></div></article>').join(""):'<p class="empty-state">H2H akan dibina secara automatik daripada keputusan perlawanan.</p>';}

function playerStats(season){const map=new Map(players.map(p=>[p.id,{apps:0,goals:0,assists:0,motm:0}]));const done=matches.filter(m=>m.status==="FT"&&String(m.season)===String(season));done.forEach(m=>{const appeared=new Set(m.starters||[]);events.filter(e=>e.matchId===m.id&&e.type==="SUB"&&e.team==="home"&&e.secondaryPlayerId).forEach(e=>appeared.add(e.secondaryPlayerId));appeared.forEach(id=>{if(map.has(id))map.get(id).apps++;});if(m.motmPlayerId&&map.has(m.motmPlayerId))map.get(m.motmPlayerId).motm++;});events.filter(e=>e.type==="GOAL"&&e.team==="home"&&done.some(m=>m.id===e.matchId)).forEach(e=>{if(e.playerId&&map.has(e.playerId))map.get(e.playerId).goals++;if(e.secondaryPlayerId&&map.has(e.secondaryPlayerId))map.get(e.secondaryPlayerId).assists++;});return map;}
function renderSquad(){
  const el=$("#playerGrid");if(!el)return;const ps=playerStats(currentSeason());
  const activePlayers=players.filter(p=>p.active!==false);el.innerHTML=activePlayers.length?activePlayers.map(p=>{const s=ps.get(p.id)||{apps:0,goals:0,assists:0};return '<article class="player-card" data-player="'+p.id+'" tabindex="0"><div class="player-visual">'+(p.photoData?'<img loading="lazy" src="'+p.photoData+'" alt="'+esc(p.name)+'">':'<div class="player-avatar">'+esc(initials(p.name))+'</div>')+'</div><div class="player-body"><div class="player-no">'+esc(p.number||"—")+'</div><span class="player-pos">'+esc(p.position||"PLAYER")+'</span><h3>'+esc((p.name||"Player").toUpperCase())+'</h3><p>TEBAKANG EDUCATOR FC</p><div class="player-stats"><div><b>'+s.apps+'</b>APP</div><div><b>'+s.goals+'</b>GOALS</div><div><b>'+s.assists+'</b>AST</div></div></div></article>';}).join(""):'<p class="empty-state">Squad belum ditambah.</p>';
  el.querySelectorAll("[data-player]").forEach(c=>{const open=()=>openPlayer(c.dataset.player);c.addEventListener("click",open);c.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")open();});});
}
function openPlayer(id){const p=players.find(x=>x.id===id),dlg=$("#playerModal");if(!p||!dlg)return;const s=playerStats(currentSeason()).get(id)||{apps:0,goals:0,assists:0,motm:0};$("#playerModalContent").innerHTML='<div class="profile-wrap"><div class="profile-photo">'+(p.photoData?'<img src="'+p.photoData+'" alt="'+esc(p.name)+'">':'<div class="profile-avatar">'+esc(initials(p.name))+'</div>')+'</div><div class="profile-copy"><span class="kicker">PLAYER PROFILE</span><h2>'+esc(p.name||"Player")+'</h2><div class="meta">#'+esc(p.number||"—")+' · '+esc(p.position||"PLAYER")+'</div><div class="profile-stat-grid"><article><b>'+s.apps+'</b><span>APPEARANCES</span></article><article><b>'+s.goals+'</b><span>GOALS</span></article><article><b>'+s.assists+'</b><span>ASSISTS</span></article><article><b>'+s.motm+'</b><span>MOTM</span></article></div></div></div>';dlg.showModal();}
$("#closePlayerModal")?.addEventListener("click",()=>$("#playerModal")?.close());

function renderClubStats(){
  const el=$("#clubStatGrid");if(!el)return;const s=currentSeason(),done=matches.filter(m=>m.status==="FT"&&String(m.season)===s),w=done.filter(m=>Number(m.homeScore)>Number(m.awayScore)).length,d=done.filter(m=>Number(m.homeScore)===Number(m.awayScore)).length,l=done.length-w-d,gf=done.reduce((n,m)=>n+Number(m.homeScore||0),0),ga=done.reduce((n,m)=>n+Number(m.awayScore||0),0);
  el.innerHTML=[["MATCHES",done.length],["WINS",w],["DRAWS",d],["LOSSES",l],["GOALS FOR",gf],["GOALS AGAINST",ga]].map(x=>'<article><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>Season '+esc(s)+'</small></article>').join("");
  const spot=$("#playerSpotlight"),ps=playerStats(s),rank=players.filter(p=>p.active!==false).sort((a,b)=>{const A=ps.get(a.id)||{},B=ps.get(b.id)||{};return (B.goals||0)-(A.goals||0)||(B.assists||0)-(A.assists||0)||(B.apps||0)-(A.apps||0);})[0];
  if(!spot)return;if(!rank){spot.innerHTML='<div class="spotlight-copy"><span class="kicker">PLAYER SPOTLIGHT</span><h3>Squad TBA</h3></div>';return;}const st=ps.get(rank.id)||{};spot.innerHTML='<div class="spotlight-visual">'+(rank.photoData?'<img src="'+rank.photoData+'" alt="'+esc(rank.name)+'">':'<div class="profile-avatar">'+esc(initials(rank.name))+'</div>')+'</div><div class="spotlight-copy"><span class="kicker">PLAYER SPOTLIGHT</span><h3>'+esc(rank.name)+'</h3><p>#'+esc(rank.number||"—")+' · '+esc(rank.position||"PLAYER")+'</p><div class="spotlight-numbers"><div><b>'+Number(st.goals||0)+'</b><span>GOALS</span></div><div><b>'+Number(st.assists||0)+'</b><span>ASSISTS</span></div><div><b>'+Number(st.apps||0)+'</b><span>APPS</span></div></div></div>';
}

function renderGallery(){
  const grid=$("#albumGrid"),legacy=$("#legacyMediaGrid");if(!grid)return;
  if(legacy)legacy.innerHTML="";
  const visibleAlbums=albums.filter(a=>a.visible!==false),unassigned=media.filter(m=>!m.albumId),cards=[...visibleAlbums];
  if(unassigned.length)cards.push({id:"__legacy__",title:"Club Moments",category:"Archive",date:null,legacy:true,visible:true});
  grid.innerHTML=cards.length?cards.map(a=>{const photos=a.legacy?unassigned:media.filter(m=>m.albumId===a.id),cover=pickCover(a,photos);return '<button class="album-card" data-open-album="'+a.id+'" type="button"><div class="album-cover">'+(cover?'<img loading="lazy" src="'+cover.imageData+'" alt="'+esc(a.title||"Album")+'">':'<div class="album-placeholder">TE</div>')+'<span>'+photos.length+' PHOTOS</span></div><div class="album-copy"><small>'+esc(a.category||"CLUB")+'</small><h3>'+esc(a.title||"Club Album")+'</h3><p>'+albumDate(a)+'</p></div></button>';}).join(""):'<p class="empty-state">Club gallery belum mempunyai album.</p>';
  grid.querySelectorAll("[data-open-album]").forEach(b=>b.addEventListener("click",()=>openAlbum(b.dataset.openAlbum)));
  renderArchive();
}
function pickCover(a,photos){return photos.find(p=>p.id===a.coverMediaId)||photos.slice().sort((x,y)=>(x.order??999)-(y.order??999)||stamp(y)-stamp(x))[0];}
function openAlbum(id){
  const a=id==="__legacy__"?{id,title:"Club Moments",category:"Archive",legacy:true}:albums.find(x=>x.id===id);if(!a)return;
  const photos=(a.legacy?media.filter(m=>!m.albumId):media.filter(m=>m.albumId===a.id)).slice().sort((x,y)=>(x.order??999)-(y.order??999)||stamp(y)-stamp(x));
  setText("#galleryModalTitle",a.title||"Album");setText("#galleryModalMeta",(a.category||"Club")+(albumDate(a)?" · "+albumDate(a):"")+" · "+photos.length+" photos");
  const g=$("#galleryPhotoGrid");g.innerHTML=photos.length?photos.map((p,i)=>'<button class="gallery-photo" data-photo-index="'+i+'" type="button"><img loading="lazy" src="'+p.imageData+'" alt="'+esc(p.caption||p.title||"Gallery photo")+'"></button>').join(""):'<p class="empty-state">Album ini belum mempunyai gambar.</p>';
  g.querySelectorAll("[data-photo-index]").forEach(b=>b.onclick=()=>openPhoto(photos,Number(b.dataset.photoIndex)));
  $("#galleryModal")?.showModal();
}
$("#closeGalleryModal")?.addEventListener("click",()=>$("#galleryModal")?.close());
function openPhoto(photos,index){viewerPhotos=photos;viewerIndex=index;renderViewer();$("#photoViewer")?.showModal();}
function renderViewer(){const p=viewerPhotos[viewerIndex];if(!p)return;$("#viewerImage").src=p.imageData;setText("#viewerCaption",(p.caption||p.title||"")+(viewerPhotos.length>1?" · "+(viewerIndex+1)+"/"+viewerPhotos.length:""));}
$("#closePhotoViewer")?.addEventListener("click",()=>$("#photoViewer")?.close());
$("#prevPhoto")?.addEventListener("click",()=>{if(!viewerPhotos.length)return;viewerIndex=(viewerIndex-1+viewerPhotos.length)%viewerPhotos.length;renderViewer();});
$("#nextPhoto")?.addEventListener("click",()=>{if(!viewerPhotos.length)return;viewerIndex=(viewerIndex+1)%viewerPhotos.length;renderViewer();});
$("#photoViewer")?.addEventListener("pointerdown",e=>viewerStartX=e.clientX);
$("#photoViewer")?.addEventListener("pointerup",e=>{const d=e.clientX-viewerStartX;if(Math.abs(d)>45){viewerIndex=(viewerIndex+(d<0?1:-1)+viewerPhotos.length)%viewerPhotos.length;renderViewer();}});

function renderTicker(){const t=$(".ticker-track");if(!t)return;const live=matches.find(m=>["LIVE","HT"].includes(m.status)),latest=matches.find(m=>m.status==="FT"),now=Date.now(),next=[...matches].filter(m=>!["FT","LIVE","HT"].includes(m.status)&&ms(m.kickoff)>=now).sort((a,b)=>ms(a.kickoff)-ms(b.kickoff))[0],a=[];if(live)a.push('<span><b>● LIVE</b> · TEDU '+(live.homeScore??0)+'–'+(live.awayScore??0)+' '+esc(live.opponent||"OPP")+'</span><span>•</span>');if(latest)a.push('<span><b>LATEST</b> · TEDU '+(latest.homeScore??0)+'–'+(latest.awayScore??0)+' '+esc(latest.opponent||"OPP")+' · <em>FT</em></span><span>•</span>');a.push('<span>TEBAKANG EDU CLUB HUB · SEASON '+esc(currentSeason())+'</span>');if(next)a.push('<span>•</span><span><b>NEXT</b> · '+esc(next.opponent||"OPP")+' · '+fullDate(next.kickoff)+'</span>');t.innerHTML=a.join("");}

$("#shareMatchBtn")?.addEventListener("click",async()=>{const m=activeMatch();if(!m)return;const text="TEBAKANG EDU vs "+(m.opponent||"Opponent")+" · "+statusText(m.status)+(m.status==="FT"?" · "+(m.homeScore??0)+"–"+(m.awayScore??0):"")+" · "+fullDate(m.kickoff);try{if(navigator.share)await navigator.share({title:"Tebakang Edu Club Hub",text,url:location.href});else{await navigator.clipboard.writeText(text+" "+location.href);alert("Match link copied.");}}catch{}});
function showGoal(m){const o=$("#goalOverlay");if(!o)return;setText("#goalOverlayName","TEBAKANG EDU");const last=events.filter(e=>e.matchId===m.id&&e.type==="GOAL"&&e.team==="home").sort((a,b)=>stamp(b)-stamp(a))[0];setText("#goalOverlayMinute",last?.minute?last.minute+"'":"");o.hidden=false;clearTimeout(goalTimer);goalTimer=setTimeout(()=>o.hidden=true,3500);}

function statusText(s){return({UPCOMING:"UPCOMING",MATCHDAY:"MATCHDAY",LIVE:"LIVE",HT:"HALF TIME",FT:"FULL TIME"})[s]||s||"UPCOMING";}
function eventDesc(e){if(e.type==="GOAL")return e.team==="home"?(e.playerName||"TEDU goal")+(e.secondaryPlayerName?" · Assist "+e.secondaryPlayerName:""):(e.note||e.opponent+" goal");if(e.type==="SUB")return(e.playerName||"Player out")+" → "+(e.secondaryPlayerName||"Player in");if(e.type==="YELLOW"||e.type==="RED")return e.team==="home"?(e.playerName||"TEDU"):(e.note||e.opponent);return e.note||e.playerName||"Match note";}
function icon(t){return({GOAL:"⚽",YELLOW:"🟨",RED:"🟥",SUB:"🔄",NOTE:"•"})[t]||"•";}
function albumTime(a){const d=a.date?.toMillis?a.date.toMillis():a.createdAt?.toMillis?a.createdAt.toMillis():new Date(a.date||0).getTime();return d||0;}
function albumDate(a){const d=a.date?.toDate?a.date.toDate():a.date?new Date(a.date):a.createdAt?.toDate?a.createdAt.toDate():null;return d&&!Number.isNaN(d.getTime())?d.toLocaleDateString("en-MY",{day:"2-digit",month:"short",year:"numeric"}):"";}
function ms(t){return t?.toMillis?t.toMillis():new Date(t||0).getTime()||0;}function stamp(x){return x.createdAt?.toMillis?x.createdAt.toMillis():x.updatedAt?.toMillis?x.updatedAt.toMillis():0;}
function toDate(t){const d=t?.toDate?t.toDate():t?new Date(t):null;return d&&!Number.isNaN(d.getTime())?d:null;}
function fullDate(t){const d=toDate(t);return d?d.toLocaleString("en-MY",{day:"2-digit",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"}):"TBA";}
function playerSort(a,b){return(a.number||"999").localeCompare(b.number||"999",undefined,{numeric:true})||(a.name||"").localeCompare(b.name||"");}
function initials(n=""){return n.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"P";}
function setText(sel,v){const e=$(sel);if(e)e.textContent=String(v??"");}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
