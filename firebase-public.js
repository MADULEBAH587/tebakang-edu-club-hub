import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore, collection, query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const $ = (s) => document.querySelector(s);
const fmtDate = (ts) => {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  if (!d || Number.isNaN(d.getTime())) return "TBA";
  return new Intl.DateTimeFormat("en-MY",{day:"2-digit",month:"long",year:"numeric"}).format(d).toUpperCase();
};
const statusText = (status="") => ({
  UPCOMING:"UPCOMING", MATCHDAY:"MATCHDAY", LIVE:"LIVE", HT:"HALF TIME", FT:"FULL TIME"
}[status] || status || "UPCOMING");

function updateMainMatch(m){
  if(!m) return;
  const scoreboard = $("#match-centre");
  if(!scoreboard) return;
  const top = scoreboard.querySelector(".score-topline");
  if(top){
    const spans = top.querySelectorAll("span");
    if(spans[0]) spans[0].textContent = (m.matchType || "Friendly Match").toUpperCase();
    if(spans[1]) spans[1].textContent = fmtDate(m.kickoff);
  }
  const status = scoreboard.querySelector(".status-mini");
  if(status) status.textContent = m.status || "UPCOMING";
  const score = scoreboard.querySelectorAll(".score > span");
  if(score[0]) score[0].textContent = Number.isFinite(m.homeScore) ? m.homeScore : 0;
  if(score[1]) score[1].textContent = Number.isFinite(m.awayScore) ? m.awayScore : 0;
  const scoreCaption = scoreboard.querySelector(".score-center small");
  if(scoreCaption) scoreCaption.textContent = statusText(m.status);

  const away = scoreboard.querySelector(".away-team");
  if(away){
    const img = away.querySelector("img");
    const name = away.querySelector("strong");
    const code = away.querySelector("span");
    if(img) img.src = m.opponentLogo || "./assets/katma-placeholder.svg";
    if(name) name.textContent = (m.opponent || "OPPONENT").toUpperCase();
    if(code) code.textContent = (m.opponentCode || "OPP").toUpperCase();
  }

  const meta = scoreboard.querySelectorAll(".match-meta span");
  if(meta[0]) meta[0].textContent = "⚽ " + (m.matchType || "Friendly Match");
  if(meta[1]) meta[1].textContent = "🏟️ " + (m.venue || "Venue TBA");
  if(meta[2]) meta[2].textContent = "🏁 " + (m.matchday ? "Matchday " + m.matchday : "Club Match");

  const heading = scoreboard.closest("section")?.querySelector(".section-heading");
  if(heading){
    const h2=heading.querySelector("h2");
    const badge=heading.querySelector(".status-pill");
    if(h2) h2.textContent = ["LIVE","HT","MATCHDAY"].includes(m.status) ? "Match Centre" : (m.status==="FT" ? "Latest Result" : "Next Match");
    if(badge) badge.textContent = statusText(m.status);
  }

  const cards = scoreboard.querySelectorAll("#overview .event-card");
  if(cards[0]?.querySelector("strong")) cards[0].querySelector("strong").textContent = `${m.homeScore ?? 0}–${m.awayScore ?? 0}`;
  if(cards[1]?.querySelector("strong")) cards[1].querySelector("strong").textContent = m.status || "UPCOMING";
  if(cards[2]?.querySelector("strong")) cards[2].querySelector("strong").textContent = m.season || "2026";
}

function updateNextMatch(m){
  const card=$(".next-match");
  if(!card || !m) return;
  const h2=card.querySelector("h2");
  const p=card.querySelector("p");
  const badge=card.querySelector(".tba-orbit span");
  if(h2) h2.textContent = `TEBAKANG EDU vs ${m.opponent || "Opponent"}`;
  if(p) p.textContent = `${fmtDate(m.kickoff)} · ${m.venue || "Venue TBA"} · ${m.matchType || "Friendly Match"}`;
  if(badge) badge.textContent = m.opponentCode || "VS";
}

function updateTicker(latest,next,live){
  const track=$(".ticker-track");
  if(!track) return;
  const bits=[];
  if(live) bits.push(`<span><b>● LIVE</b> &nbsp; TEBAKANG EDU ${live.homeScore ?? 0}–${live.awayScore ?? 0} ${escapeHtml(live.opponent || "OPPONENT")}</span>`);
  if(latest) bits.push(`<span><b>LATEST</b> &nbsp; TEBAKANG EDU ${latest.homeScore ?? 0}–${latest.awayScore ?? 0} ${escapeHtml(latest.opponent || "OPPONENT")} &nbsp; <em>${latest.status || "FT"}</em></span>`);
  bits.push("<span>•</span><span>TEBAKANG EDU CLUB HUB &nbsp; SEASON 2026</span><span>•</span>");
  if(next) bits.push(`<span><b>NEXT MATCH</b> &nbsp; ${escapeHtml(next.opponent || "OPPONENT")} · ${fmtDate(next.kickoff)}</span>`);
  track.innerHTML = bits.join("");
}

function renderArchive(matches){
  const list=$(".match-list");
  if(!list || !matches.length) return;
  list.innerHTML=matches.slice(0,8).map(m=>{
    const d=m.kickoff?.toDate ? m.kickoff.toDate() : new Date(m.kickoff || Date.now());
    const day=String(d.getDate()).padStart(2,"0");
    const mon=d.toLocaleString("en-MY",{month:"short"}).toUpperCase();
    const score=m.status==="FT" || ["LIVE","HT"].includes(m.status)
      ? `${m.homeScore ?? 0} <small>${escapeHtml(m.status || "")}</small> ${m.awayScore ?? 0}`
      : `— <small>${escapeHtml(m.status || "UPCOMING")}</small> —`;
    return `<article class="match-row ${m.status==="FT"?"featured":"muted"}">
      <div class="match-date"><b>${day}</b><span>${mon}</span></div>
      <img src="./assets/tebakang-edu-logo.webp" alt="Tebakang Educator FC">
      <strong>Tebakang Edu</strong>
      <div class="row-score">${score}</div>
      <strong>${escapeHtml(m.opponent || "Opponent")}</strong>
      ${m.opponentLogo ? `<img src="${escapeAttr(m.opponentLogo)}" alt="${escapeAttr(m.opponent || "Opponent")} crest">` : `<div class="initial-crest">${escapeHtml((m.opponentCode||"OP").slice(0,2))}</div>`}
      <span class="match-type">${escapeHtml(m.matchType || "Friendly")}</span>
    </article>`;
  }).join("");
}

function renderPlayers(players){
  if(!players.length || !window.renderClubPlayers) return;
  window.renderClubPlayers(players);
}

function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function escapeAttr(v=""){return escapeHtml(v);}

onSnapshot(collection(db,"matches"),(snap)=>{
  if(snap.empty) return;
  const matches=snap.docs.map(d=>({id:d.id,...d.data()}));
  const kickoffMs=m=>m.kickoff?.toMillis ? m.kickoff.toMillis() : new Date(m.kickoff||0).getTime();
  matches.sort((a,b)=>kickoffMs(b)-kickoffMs(a));
  const now=Date.now();
  const live=matches.find(m=>["LIVE","HT","MATCHDAY"].includes(m.status));
  const latest=matches.find(m=>m.status==="FT");
  const upcoming=[...matches].filter(m=>!["FT","LIVE","HT"].includes(m.status)&&kickoffMs(m)>=now).sort((a,b)=>kickoffMs(a)-kickoffMs(b))[0];
  updateMainMatch(live || latest || upcoming || matches[0]);
  updateNextMatch(upcoming);
  updateTicker(latest,upcoming,live);
  renderArchive(matches);
},(err)=>console.warn("Firestore matches unavailable; using static fallback.",err.code || err.message));

onSnapshot(collection(db,"players"),(snap)=>{
  if(snap.empty) return;
  const players=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.number||"99").localeCompare(b.number||"99",undefined,{numeric:true}));
  renderPlayers(players);
},(err)=>console.warn("Firestore players unavailable; using static fallback.",err.code || err.message));
