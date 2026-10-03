import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig),db=getFirestore(app),$=s=>document.querySelector(s);
let matches=[],players=[],events=[],media=[],settings={},seasonFilter="ALL",nextKickoff=0,scoreMemory=new Map(),goalTimer=null,selectedPublicMatchId="";

onSnapshot(collection(db,"matches"),snap=>{
  const fresh=snap.docs.map(d=>({id:d.id,...d.data()})).filter(m=>m.publicVisible!==false).sort((a,b)=>ms(b.kickoff)-ms(a.kickoff));
  const live=fresh.find(m=>["LIVE","HT"].includes(m.status));
  if(live){const old=scoreMemory.get(live.id);if(old&&Number(live.homeScore)>Number(old.home))showGoal(live);}
  scoreMemory=new Map(fresh.map(m=>[m.id,{home:m.homeScore||0,away:m.awayScore||0}]));
  matches=fresh;renderAll();
},e=>console.warn("matches",e.code||e.message));

onSnapshot(collection(db,"players"),snap=>{players=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.active!==false).sort(playerSort);renderAll();},e=>console.warn("players",e.code||e.message));
onSnapshot(collection(db,"events"),snap=>{events=snap.docs.map(d=>({id:d.id,...d.data()}));renderAll();},e=>console.warn("events",e.code||e.message));
onSnapshot(query(collection(db,"media"),orderBy("createdAt","desc"),limit(12)),snap=>{media=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.visible!==false);renderMedia();},e=>console.warn("media",e.code||e.message));
onSnapshot(doc(db,"settings","public"),snap=>{settings=snap.exists()?snap.data():{};renderAll();},()=>{});

$("#seasonFilter").addEventListener("change",e=>{seasonFilter=e.target.value;renderArchive();});

function renderAll(){
  renderVisibility();renderSeasons();renderMainMatch();renderNext();renderForm();renderArchive();renderH2H();renderSquad();renderClubStats();renderMedia();renderTicker();
  const season=currentSeason();$("#heroSeason").textContent=season;$("#squadSeason").textContent=season;$("#statsSeason").textContent=season;
}
function renderVisibility(){
  $("#squad").classList.toggle("public-hidden",settings.showSquad===false);$("#stats").classList.toggle("public-hidden",settings.showStats===false);
  $("#h2h").classList.toggle("public-hidden",settings.showH2H===false);$("#media").classList.toggle("public-hidden",settings.showMedia===false);$("#matches").classList.toggle("public-hidden",settings.showArchive===false);
}
function currentSeason(){return String(settings.currentSeason||matches.map(m=>String(m.season||"")).filter(Boolean).sort().reverse()[0]||"2026");}
function activeMatch(){const chosen=matches.find(m=>m.id===selectedPublicMatchId);if(chosen)return chosen;const live=matches.find(m=>["LIVE","HT","MATCHDAY"].includes(m.status));if(live)return live;const ft=matches.find(m=>m.status==="FT");if(ft)return ft;const now=Date.now();return [...matches].filter(m=>ms(m.kickoff)>=now).sort((a,b)=>ms(a.kickoff)-ms(b.kickoff))[0]||matches[0];}

function renderMainMatch(){
  const m=activeMatch();if(!m)return;
  const live=["LIVE","HT","MATCHDAY"].includes(m.status),upcoming=!live&&m.status!=="FT";
  $("#matchHeading").textContent=live?"Match Centre":upcoming?"Next Match":"Latest Result";$("#mainStatusBadge").textContent=statusText(m.status);$("#matchStatusMini").textContent=m.status||"UPCOMING";$("#scoreCaption").textContent=statusText(m.status);
  $("#matchTypeTop").textContent=(m.matchType||"Friendly Match").toUpperCase();$("#matchDateTop").textContent=fullDate(m.kickoff);
  $("#awayNameMain").textContent=(m.opponent||"OPPONENT").toUpperCase();$("#awayCodeMain").textContent=(m.opponentCode||"OPP").toUpperCase();$("#awayLogoMain").src=m.opponentLogo||"./assets/katma-placeholder.svg";
  $("#homeScoreMain").textContent=upcoming?"–":m.homeScore??0;$("#awayScoreMain").textContent=upcoming?"–":m.awayScore??0;
  $("#metaType").textContent="⚽ "+(m.matchType||"Friendly Match");$("#metaVenue").textContent="🏟️ "+(m.venue||"Venue TBA");$("#metaMatchday").textContent="🏁 "+(m.matchday?"Matchday "+m.matchday:"Club Match");
  $("#overviewResult").textContent=upcoming?"VS":String(m.homeScore??0)+"–"+String(m.awayScore??0);$("#overviewOpponent").textContent="vs "+(m.opponent||"Opponent");$("#overviewStatus").textContent=m.status||"UPCOMING";$("#overviewMotm").textContent=m.motmPlayerName||"—";$("#overviewSeason").textContent="Season "+(m.season||currentSeason());
  renderTimeline(m);renderLineup(m);renderMatchStats(m);
}
function renderTimeline(m){
  const el=$("#publicTimeline"),list=events.filter(e=>e.matchId===m.id).sort((a,b)=>(a.minute??999)-(b.minute??999)||stamp(a)-stamp(b));
  el.innerHTML=list.length?list.map(e=>'<div class="public-event"><div class="minute">'+(e.minute?e.minute+"'":"—")+'</div><div class="etype">'+icon(e.type)+' '+esc(e.type||"EVENT")+'</div><div><strong>'+esc(eventDesc(e))+'</strong><small>'+esc(e.note||"")+'</small></div></div>').join(""):'<p class="empty-state">No timeline events recorded yet.</p>';
}
function renderLineup(m){
  const pitch=$("#publicPitch"),bench=$("#publicBench");pitch.querySelectorAll(".pitch-player").forEach(x=>x.remove());
  const starters=(m.starters||[]).map(id=>players.find(p=>p.id===id)).filter(Boolean),groups={gk:[],def:[],mid:[],att:[]};
  starters.forEach(p=>groups[group(p.position)].push(p));
  placeGroup(groups.gk,8,pitch);placeGroup(groups.def,31,pitch);placeGroup(groups.mid,56,pitch);placeGroup(groups.att,82,pitch);
  if(!starters.length)pitch.insertAdjacentHTML("beforeend",'<span class="p p-am">LINEUP TBA</span>');
  const subs=(m.substitutes||[]).map(id=>players.find(p=>p.id===id)).filter(Boolean);bench.innerHTML=subs.length?'<span class="kicker">BENCH</span> '+subs.map(p=>'<span class="bench-chip">#'+esc(p.number||"—")+' '+esc(p.name)+'</span>').join(""):"";
}
function placeGroup(list,x,pitch){const n=list.length;if(!n)return;list.forEach((p,i)=>{const y=n===1?50:15+(70*i/(n-1)),d=document.createElement("div");d.className="pitch-player";d.style.left=x+"%";d.style.top=y+"%";d.innerHTML='<div class="dot">'+esc(p.number||p.position||"P")+'</div><span>'+esc(p.name)+'</span>';pitch.appendChild(d);});}
function group(pos=""){pos=pos.toUpperCase();if(pos.includes("GK"))return"gk";if(/CB|LB|RB|DF|WB/.test(pos))return"def";if(/DM|CM|AM|MF/.test(pos))return"mid";return"att";}
function renderMatchStats(m){
  const s=m.stats||{},rows=[["Shots","homeShots","awayShots"],["On target","homeOnTarget","awayOnTarget"],["Corners","homeCorners","awayCorners"],["Yellow cards","homeYellow","awayYellow"]],valid=rows.filter(r=>s[r[1]]!==undefined||s[r[2]]!==undefined),el=$("#publicMatchStats");
  if(!valid.length){el.innerHTML='<p class="empty-state">Match statistics appear when recorded.</p>';return;}
  el.innerHTML=valid.map(r=>{const a=Number(s[r[1]]||0),b=Number(s[r[2]]||0),max=Math.max(a+b,1),ap=Math.round(a/max*100),bp=100-ap;return '<div class="match-stat-row"><b>'+a+'</b><div class="bar"><i style="width:'+ap+'%"></i></div><span>'+r[0]+'</span><div class="bar away"><i style="width:'+bp+'%"></i></div><b>'+b+'</b></div>';}).join("");
}

function renderNext(){
  const now=Date.now(),n=[...matches].filter(m=>!["FT","LIVE","HT"].includes(m.status)&&ms(m.kickoff)>=now).sort((a,b)=>ms(a.kickoff)-ms(b.kickoff))[0];
  if(!n){$("#nextMatchTitle").textContent="Ready for the next one.";$("#nextMatchMeta").textContent="No upcoming fixture announced.";$("#nextMatchCountdown").textContent="TBA";$("#nextOpponentCode").textContent="TBA";$("#nextOpponentLogo").removeAttribute("src");nextKickoff=0;return;}
  $("#nextMatchTitle").textContent="TEBAKANG EDU vs "+(n.opponent||"Opponent");$("#nextMatchMeta").textContent=fullDate(n.kickoff)+" · "+(n.venue||"Venue TBA")+" · "+(n.matchType||"Friendly Match");$("#nextOpponentCode").textContent=n.opponentCode||"VS";if(n.opponentLogo)$("#nextOpponentLogo").src=n.opponentLogo;nextKickoff=ms(n.kickoff);tickCountdown();
}
function tickCountdown(){if(!nextKickoff)return;const diff=nextKickoff-Date.now();if(diff<=0){$("#nextMatchCountdown").textContent="MATCHDAY";return;}const d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),m=Math.floor(diff%3600000/60000);$("#nextMatchCountdown").textContent=d+"D : "+String(h).padStart(2,"0")+"H : "+String(m).padStart(2,"0")+"M";}
setInterval(tickCountdown,30000);

function renderForm(){
  const ft=matches.filter(m=>m.status==="FT").slice(0,5),el=$("#recentForm");el.innerHTML=ft.map(m=>{const r=(m.homeScore??0)>(m.awayScore??0)?"W":(m.homeScore??0)===(m.awayScore??0)?"D":"L";return '<span class="form-dot '+r.toLowerCase()+'" title="'+esc(m.opponent||"Opponent")+'">'+r+'</span>';}).join("");
}
function renderSeasons(){const el=$("#seasonFilter"),old=seasonFilter,ss=[...new Set(matches.map(m=>String(m.season||"")).filter(Boolean))].sort().reverse();el.innerHTML='<option value="ALL">All seasons</option>'+ss.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join("");el.value=ss.includes(old)?old:"ALL";}
function renderArchive(){
  const el=$("#matchList"),list=matches.filter(m=>seasonFilter==="ALL"||String(m.season)===seasonFilter);
  el.innerHTML=list.length?list.map(m=>{const d=toDate(m.kickoff),day=d?String(d.getDate()).padStart(2,"0"):"—",mon=d?d.toLocaleString("en-MY",{month:"short"}).toUpperCase():"TBA",score=m.status==="FT"||["LIVE","HT"].includes(m.status)?String(m.homeScore??0)+' <small>'+esc(m.status||"")+'</small> '+String(m.awayScore??0):'— <small>'+esc(m.status||"UPCOMING")+'</small> —',logo=m.opponentLogo?'<img src="'+m.opponentLogo+'" alt="'+esc(m.opponent||"Opponent")+'">':'<div class="initial-crest">'+esc((m.opponentCode||"OP").slice(0,2))+'</div>';return '<article class="match-row '+(m.status==="FT"?"featured":"muted")+'" data-open-match="'+m.id+'" tabindex="0"><div class="match-date"><b>'+day+'</b><span>'+mon+'</span></div><img src="./assets/tebakang-edu-logo.webp" alt="Tebakang Educator FC"><strong>Tebakang Edu</strong><div class="row-score">'+score+'</div><strong>'+esc(m.opponent||"Opponent")+'</strong>'+logo+'<span class="match-type">'+esc(m.matchType||"Friendly")+'</span></article>';}).join(""):'<p class="empty-state">No matches in this season.</p>';
  el.querySelectorAll("[data-open-match]").forEach(card=>{const open=()=>{selectedPublicMatchId=card.dataset.openMatch;renderMainMatch();document.getElementById("match-centre").scrollIntoView({behavior:"smooth",block:"start"});};card.addEventListener("click",open);card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")open();});});
}

function renderH2H(){
  const grid=$("#h2hGrid"),ft=matches.filter(m=>m.status==="FT"),map=new Map();
  ft.forEach(m=>{const key=m.opponentId||m.opponent||"Opponent",r=map.get(key)||{name:m.opponent||"Opponent",code:m.opponentCode||"OPP",logo:m.opponentLogo||"",p:0,w:0,d:0,l:0,gf:0,ga:0};r.p++;r.gf+=Number(m.homeScore||0);r.ga+=Number(m.awayScore||0);if(m.homeScore>m.awayScore)r.w++;else if(m.homeScore===m.awayScore)r.d++;else r.l++;map.set(key,r);});
  const list=[...map.values()].sort((a,b)=>b.p-a.p);grid.innerHTML=list.length?list.map(r=>'<article class="h2h-card">'+(r.logo?'<img src="'+r.logo+'" alt="'+esc(r.name)+'">':'<div class="h2h-placeholder">'+esc(r.code.slice(0,3))+'</div>')+'<div><h3>'+esc(r.name)+'</h3><small>'+r.gf+' goals for · '+r.ga+' against</small></div><div class="h2h-record"><div><b>'+r.p+'</b><span>P</span></div><div><b>'+r.w+'</b><span>W</span></div><div><b>'+r.d+'</b><span>D</span></div><div><b>'+r.l+'</b><span>L</span></div><div><b>'+r.gf+'–'+r.ga+'</b><span>GOALS</span></div></div></article>').join(""):'<p class="empty-state">H2H records build automatically from completed matches.</p>';
}

function playerStats(season){
  const map=new Map(players.map(p=>[p.id,{apps:0,goals:0,assists:0,motm:0}]));
  const done=matches.filter(m=>m.status==="FT"&&String(m.season)===String(season));
  done.forEach(m=>{
    const appeared=new Set(m.starters||[]);
    events.filter(e=>e.matchId===m.id&&e.type==="SUB"&&e.team==="home"&&e.secondaryPlayerId).forEach(e=>appeared.add(e.secondaryPlayerId));
    appeared.forEach(id=>{if(map.has(id))map.get(id).apps++;});
    if(m.motmPlayerId&&map.has(m.motmPlayerId))map.get(m.motmPlayerId).motm++;
  });
  events.filter(e=>String(e.season)===String(season)&&e.team==="home").forEach(e=>{
    if(e.type==="GOAL"&&map.has(e.playerId))map.get(e.playerId).goals++;
    if(e.type==="GOAL"&&map.has(e.secondaryPlayerId))map.get(e.secondaryPlayerId).assists++;
  });
  return map;
}
function renderSquad(){
  if(!players.length)return;const season=currentSeason(),st=playerStats(season),el=$("#playerGrid");
  el.innerHTML=players.map((p,i)=>{const s=st.get(p.id)||{apps:0,goals:0,assists:0},visual=p.photoData?'<img src="'+p.photoData+'" alt="'+esc(p.name)+'">':'<div class="player-avatar">'+initials(p.name)+'</div>';return '<article class="player-card" data-player="'+p.id+'" tabindex="0" style="transition-delay:'+Math.min(i*25,200)+'ms"><div class="player-visual">'+visual+'</div><div class="player-body"><div class="player-no">'+esc(p.number||"—")+'</div><span class="player-pos">'+esc(p.position||"PLAYER")+'</span><h3>'+esc((p.name||"Player").toUpperCase())+'</h3><div class="player-stats"><div><b>'+s.apps+'</b>APPS</div><div><b>'+s.goals+'</b>GOALS</div><div><b>'+s.assists+'</b>ASSISTS</div></div></div></article>';}).join("");
  el.querySelectorAll("[data-player]").forEach(card=>{const open=()=>openPlayer(card.dataset.player);card.addEventListener("click",open);card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")open();});});
}
function renderClubStats(){
  const season=currentSeason(),list=matches.filter(m=>m.status==="FT"&&String(m.season)===season),p=list.length,w=list.filter(m=>m.homeScore>m.awayScore).length,d=list.filter(m=>m.homeScore===m.awayScore).length,l=p-w-d,gf=list.reduce((n,m)=>n+Number(m.homeScore||0),0),ga=list.reduce((n,m)=>n+Number(m.awayScore||0),0),grid=$("#clubStatGrid");
  grid.innerHTML=[["Played",p,"matches"],["Won",w,"victories"],["Draw",d,"matches"],["Lost",l,"matches"],["Goals For",gf,"scored"],["Goals Against",ga,"conceded"]].map(x=>'<article><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></article>').join("");
  const st=playerStats(season),rank=players.map(p=>({p,s:st.get(p.id)||{apps:0,goals:0,assists:0,motm:0}})).sort((a,b)=>b.s.goals-a.s.goals||b.s.assists-a.s.assists),top=rank[0],sp=$("#playerSpotlight");
  if(!top||(!top.s.goals&&!top.s.assists&&!top.s.apps)){sp.innerHTML='<div class="spotlight-copy"><span class="kicker">PLAYER SPOTLIGHT</span><h3>Season '+esc(season)+'</h3><p>Player statistics will build automatically from lineups and match events.</p></div>';return;}
  const visual=top.p.photoData?'<img src="'+top.p.photoData+'" alt="'+esc(top.p.name)+'">':'<div class="player-avatar">'+initials(top.p.name)+'</div>';sp.innerHTML='<div class="spotlight-visual">'+visual+'</div><div class="spotlight-copy"><span class="kicker">PLAYER SPOTLIGHT</span><h3>'+esc(top.p.name)+'</h3><p>'+esc(top.p.position||"Player")+' · #'+esc(top.p.number||"—")+'</p><div class="spotlight-numbers"><div><b>'+top.s.goals+'</b><span>GOALS</span></div><div><b>'+top.s.assists+'</b><span>ASSISTS</span></div><div><b>'+top.s.apps+'</b><span>APPS</span></div><div><b>'+top.s.motm+'</b><span>MOTM</span></div></div></div>';
}
function renderMedia(){
  const el=$("#mediaGrid");if(!el)return;el.innerHTML=media.length?media.slice(0,12).map(x=>'<article class="media-card"><img loading="lazy" src="'+x.imageData+'" alt="'+esc(x.title||"Club media")+'"><div><h3>'+esc(x.title||"Club moment")+'</h3><p>'+esc(x.caption||"")+'</p></div></article>').join(""):'<p class="empty-state">Club moments will appear here.</p>';
}
function renderTicker(){
  const t=$(".ticker-track"),live=matches.find(m=>["LIVE","HT"].includes(m.status)),latest=matches.find(m=>m.status==="FT"),now=Date.now(),next=[...matches].filter(m=>!["FT","LIVE","HT"].includes(m.status)&&ms(m.kickoff)>=now).sort((a,b)=>ms(a.kickoff)-ms(b.kickoff))[0],a=[];
  if(live)a.push('<span><b>● LIVE</b> · TEDU '+(live.homeScore??0)+'–'+(live.awayScore??0)+' '+esc(live.opponent||"OPP")+'</span><span>•</span>');
  if(latest)a.push('<span><b>LATEST</b> · TEDU '+(latest.homeScore??0)+'–'+(latest.awayScore??0)+' '+esc(latest.opponent||"OPP")+' · <em>FT</em></span><span>•</span>');
  a.push('<span>TEBAKANG EDU CLUB HUB · SEASON '+esc(currentSeason())+'</span>');
  if(next)a.push('<span>•</span><span><b>NEXT</b> · '+esc(next.opponent||"OPP")+' · '+fullDate(next.kickoff)+'</span>');
  t.innerHTML=a.join("");
}
function showGoal(m){
  const o=$("#goalOverlay");$("#goalOverlayName").textContent="TEBAKANG EDU";const ev=[...events].filter(e=>e.matchId===m.id&&e.type==="GOAL"&&e.team==="home").sort((a,b)=>stamp(b)-stamp(a))[0];$("#goalOverlayMinute").textContent=ev?(ev.minute?ev.minute+"' · ":"")+(ev.playerName||"GOAL"):"GOAL";o.hidden=false;clearTimeout(goalTimer);goalTimer=setTimeout(()=>o.hidden=true,2600);
}


$("#closePlayerModal").addEventListener("click",()=>$("#playerModal").close());
$("#playerModal").addEventListener("click",e=>{if(e.target===$("#playerModal"))$("#playerModal").close();});
function openPlayer(id){
  const p=players.find(x=>x.id===id);if(!p)return;const season=currentSeason(),ss=playerStats(season).get(id)||{apps:0,goals:0,assists:0,motm:0},seasons=[...new Set(matches.map(m=>String(m.season||"")).filter(Boolean))].sort().reverse();
  let all={apps:0,goals:0,assists:0,motm:0};const rows=seasons.map(y=>{const s=playerStats(y).get(id)||{apps:0,goals:0,assists:0,motm:0};all.apps+=s.apps;all.goals+=s.goals;all.assists+=s.assists;all.motm+=s.motm;return '<div class="career-row"><b>'+esc(y)+'</b><span>'+s.apps+' Apps</span><span>'+s.goals+' Goals</span><span>'+s.assists+' Assists</span></div>';}).join("");
  const visual=p.photoData?'<img src="'+p.photoData+'" alt="'+esc(p.name)+'">':'<div class="profile-avatar">'+initials(p.name)+'</div>';
  $("#playerModalContent").innerHTML='<div class="profile-wrap"><div class="profile-photo">'+visual+'</div><div class="profile-copy"><span class="kicker">PLAYER PROFILE</span><h2>'+esc(p.name)+'</h2><div class="meta">'+esc(p.position||"PLAYER")+' · #'+esc(p.number||"—")+'</div><div class="profile-stat-grid"><article><b>'+ss.apps+'</b><span>'+esc(season)+' APPS</span></article><article><b>'+ss.goals+'</b><span>GOALS</span></article><article><b>'+ss.assists+'</b><span>ASSISTS</span></article><article><b>'+ss.motm+'</b><span>MOTM</span></article></div><div class="career-list"><span class="kicker">CAREER · '+all.apps+' APPS · '+all.goals+' GOALS</span>'+rows+'</div></div></div>';
  $("#playerModal").showModal();
}
$("#shareMatchBtn").addEventListener("click",async()=>{const m=activeMatch();if(!m)return;const score=m.status==="FT"||["LIVE","HT"].includes(m.status)?" "+(m.homeScore??0)+"–"+(m.awayScore??0)+" ":" vs ",text="Tebakang Edu"+score+(m.opponent||"Opponent")+" · "+statusText(m.status);try{if(navigator.share)await navigator.share({title:"Tebakang Edu Club Hub",text,url:location.href});else{await navigator.clipboard.writeText(text+" "+location.href);$("#shareMatchBtn").textContent="Copied ✓";setTimeout(()=>$("#shareMatchBtn").textContent="Share ↗",1800);}}catch(e){};});

function eventDesc(e){if(e.type==="GOAL")return e.team==="home"?(e.playerName||"Tebakang Edu goal")+(e.secondaryPlayerName?" · Assist "+e.secondaryPlayerName:""):(e.note||e.opponent+" goal");if(e.type==="SUB")return(e.playerName||"Player out")+" → "+(e.secondaryPlayerName||"Player in");if(e.type==="YELLOW"||e.type==="RED")return e.team==="home"?(e.playerName||"Tebakang Edu"):(e.note||e.opponent);return e.note||e.playerName||"Match note";}
function icon(t){return({GOAL:"⚽",YELLOW:"🟨",RED:"🟥",SUB:"🔄",NOTE:"•"})[t]||"•";}function statusText(s){return({UPCOMING:"UPCOMING",MATCHDAY:"MATCHDAY",LIVE:"LIVE",HT:"HALF TIME",FT:"FULL TIME"})[s]||s||"UPCOMING";}
function ms(t){return t?.toMillis?t.toMillis():new Date(t||0).getTime()||0;}function stamp(x){return x.createdAt?.toMillis?x.createdAt.toMillis():x.updatedAt?.toMillis?x.updatedAt.toMillis():0;}function toDate(t){const d=t?.toDate?t.toDate():t?new Date(t):null;return d&&!Number.isNaN(d.getTime())?d:null;}function fullDate(t){const d=toDate(t);return d?d.toLocaleDateString("en-MY",{day:"2-digit",month:"long",year:"numeric"}).toUpperCase():"TBA";}
function playerSort(a,b){return(a.number||"999").localeCompare(b.number||"999",undefined,{numeric:true})||(a.name||"").localeCompare(b.name||"");}function initials(n=""){return n.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"P";}function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
