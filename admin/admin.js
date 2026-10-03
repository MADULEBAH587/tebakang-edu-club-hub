import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore, collection, query, orderBy, onSnapshot, addDoc, setDoc, doc,
  updateDoc, deleteDoc, serverTimestamp, Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { firebaseConfig } from "../firebase-config.js";

const app=initializeApp(firebaseConfig);
const db=getFirestore(app);
const auth=getAuth(app);
const $=s=>document.querySelector(s);
let matches=[];
let players=[];
let selectedMatchId=null;

const loginPanel=$("#loginPanel"),dashboard=$("#dashboard"),logoutBtn=$("#logoutBtn");
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  setMsg("#loginMessage","Signing in…");
  try{
    await signInWithEmailAndPassword(auth,$("#email").value.trim(),$("#password").value);
    setMsg("#loginMessage","");
  }catch(err){setMsg("#loginMessage",friendly(err),"error");}
});
logoutBtn.addEventListener("click",()=>signOut(auth));
onAuthStateChanged(auth,user=>{
  const signed=!!user;
  loginPanel.hidden=signed;
  dashboard.hidden=!signed;
  logoutBtn.hidden=!signed;
  $("#userEmail").textContent=user?.email||"—";
  $("#connectionBadge").textContent=signed?"FIREBASE · AUTH":"FIREBASE";
});

$("#newMatchBtn").addEventListener("click",resetMatchForm);
$("#matchForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const payload={
    opponent:$("#opponent").value.trim(),
    opponentCode:($("#opponentCode").value.trim()||"OPP").toUpperCase(),
    opponentLogo:$("#opponentLogo").value.trim(),
    kickoff:Timestamp.fromDate(new Date($("#kickoff").value)),
    season:$("#season").value.trim()||"2026",
    matchday:Number($("#matchday").value)||null,
    matchType:$("#matchType").value.trim()||"Friendly Match",
    venue:$("#venue").value.trim(),
    status:$("#status").value,
    homeScore:Math.max(0,Number($("#homeScore").value)||0),
    awayScore:Math.max(0,Number($("#awayScore").value)||0),
    updatedAt:serverTimestamp()
  };
  try{
    const id=$("#matchId").value;
    if(id) await updateDoc(doc(db,"matches",id),payload);
    else await addDoc(collection(db,"matches"),{...payload,createdAt:serverTimestamp()});
    setMsg("#matchMessage","Saved. Public site updates in realtime.","ok");
    resetMatchForm();
  }catch(err){setMsg("#matchMessage",friendly(err),"error");}
});

onSnapshot(collection(db,"matches"),snap=>{
  matches=snap.docs.map(d=>({id:d.id,...d.data()}));
  const kickoffMs=m=>m.kickoff?.toMillis ? m.kickoff.toMillis() : new Date(m.kickoff||0).getTime();
  matches.sort((x,y)=>kickoffMs(y)-kickoffMs(x));
  renderMatches();
  if(selectedMatchId) selectMatch(selectedMatchId,false);
},err=>setMsg("#matchMessage",friendly(err),"error"));

function renderMatches(){
  const el=$("#matchAdminList");
  if(!matches.length){el.innerHTML='<div class="empty">No Firestore matches yet.</div>';return;}
  el.innerHTML=matches.map(m=>{
    const date=m.kickoff?.toDate?m.kickoff.toDate().toLocaleDateString("en-MY",{day:"2-digit",month:"short",year:"numeric"}):"TBA";
    return `<div class="admin-row">
      <small>${date}<br>${esc(m.status||"UPCOMING")}</small>
      <div><b>TEDU vs ${esc(m.opponent||"Opponent")}</b><small>${esc(m.venue||"Venue TBA")}</small></div>
      <div class="score-mini">${m.homeScore??0}–${m.awayScore??0}</div>
      <small>${esc(m.matchType||"Friendly")}</small>
      <div class="row-actions"><button data-control="${m.id}">Control</button><button data-edit="${m.id}">Edit</button></div>
    </div>`;
  }).join("");
  el.querySelectorAll("[data-control]").forEach(b=>b.addEventListener("click",()=>selectMatch(b.dataset.control,true)));
  el.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editMatch(b.dataset.edit)));
}
function editMatch(id){
  const m=matches.find(x=>x.id===id);if(!m)return;
  $("#matchId").value=id;$("#opponent").value=m.opponent||"";$("#opponentCode").value=m.opponentCode||"";
  $("#opponentLogo").value=m.opponentLogo||"";$("#season").value=m.season||"2026";$("#matchday").value=m.matchday||"";
  $("#matchType").value=m.matchType||"Friendly Match";$("#venue").value=m.venue||"";$("#status").value=m.status||"UPCOMING";
  $("#homeScore").value=m.homeScore??0;$("#awayScore").value=m.awayScore??0;
  if(m.kickoff?.toDate){const d=m.kickoff.toDate();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());$("#kickoff").value=d.toISOString().slice(0,16);}
  window.scrollTo({top:0,behavior:"smooth"});
}
function resetMatchForm(){
  $("#matchForm").reset();$("#matchId").value="";$("#season").value="2026";$("#matchType").value="Friendly Match";$("#status").value="UPCOMING";$("#homeScore").value=0;$("#awayScore").value=0;
}
function selectMatch(id,scroll){
  selectedMatchId=id;
  const m=matches.find(x=>x.id===id);if(!m)return;
  $("#noSelectedMatch").hidden=true;$("#liveControls").hidden=false;
  $("#liveOpponent").textContent=`TEDU vs ${m.opponent||"Opponent"}`;$("#liveAwayCode").textContent=m.opponentCode||"OPP";
  $("#liveMeta").textContent=`${m.matchType||"Friendly"} · ${m.venue||"Venue TBA"}`;
  $("#liveHomeScore").textContent=m.homeScore??0;$("#liveAwayScore").textContent=m.awayScore??0;
  $("#liveStatus").textContent=m.status||"UPCOMING";$("#liveStatus").classList.toggle("live",["LIVE","HT"].includes(m.status));
  if(scroll) $("#liveControls").scrollIntoView({behavior:"smooth",block:"center"});
}
document.querySelectorAll("[data-score]").forEach(btn=>btn.addEventListener("click",async()=>{
  if(!selectedMatchId)return;
  const [side,deltaRaw]=btn.dataset.score.split(":");const delta=Number(deltaRaw);
  const m=matches.find(x=>x.id===selectedMatchId);if(!m)return;
  const key=side==="home"?"homeScore":"awayScore";const next=Math.max(0,(Number(m[key])||0)+delta);
  try{await updateDoc(doc(db,"matches",selectedMatchId),{[key]:next,updatedAt:serverTimestamp()});}catch(err){setMsg("#liveMessage",friendly(err),"error");}
}));
document.querySelectorAll("[data-status]").forEach(btn=>btn.addEventListener("click",async()=>{
  if(!selectedMatchId)return;
  try{await updateDoc(doc(db,"matches",selectedMatchId),{status:btn.dataset.status,updatedAt:serverTimestamp()});}catch(err){setMsg("#liveMessage",friendly(err),"error");}
}));
$("#goalForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!selectedMatchId)return;
  const m=matches.find(x=>x.id===selectedMatchId);if(!m)return;
  const team=$("#goalTeam").value,scoreKey=team==="home"?"homeScore":"awayScore";
  const event={type:"GOAL",team,scorer:$("#goalScorer").value.trim(),assist:$("#goalAssist").value.trim(),minute:Number($("#goalMinute").value)||null,createdAt:serverTimestamp()};
  try{
    const batch=writeBatch(db);
    batch.update(doc(db,"matches",selectedMatchId),{[scoreKey]:(Number(m[scoreKey])||0)+1,status:"LIVE",updatedAt:serverTimestamp()});
    const eventRef=doc(collection(db,"matches",selectedMatchId,"events"));batch.set(eventRef,event);
    await batch.commit();e.target.reset();setMsg("#liveMessage","Goal recorded. Public score updated.","ok");
  }catch(err){setMsg("#liveMessage",friendly(err),"error");}
});

$("#playerForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const payload={name:$("#playerName").value.trim(),position:$("#playerPosition").value.trim().toUpperCase(),number:$("#playerNumber").value.trim(),active:true,updatedAt:serverTimestamp()};
  try{
    const id=$("#playerId").value;
    if(id) await updateDoc(doc(db,"players",id),payload); else await addDoc(collection(db,"players"),{...payload,createdAt:serverTimestamp()});
    e.target.reset();$("#playerId").value="";setMsg("#playerMessage","Player saved.","ok");
  }catch(err){setMsg("#playerMessage",friendly(err),"error");}
});
onSnapshot(collection(db,"players"),snap=>{
  players=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.number||"99").localeCompare(b.number||"99",undefined,{numeric:true}));
  $("#playerAdminList").innerHTML=players.map(p=>`<div class="player-admin"><div><b>#${esc(p.number||"—")} ${esc(p.name||"Player")}</b><small>${esc(p.position||"—")}</small></div><button data-del-player="${p.id}" title="Delete">✕</button></div>`).join("");
  $("#playerAdminList").querySelectorAll("[data-del-player]").forEach(b=>b.addEventListener("click",async()=>{if(confirm("Delete this player?"))await deleteDoc(doc(db,"players",b.dataset.delPlayer));}));
},err=>setMsg("#playerMessage",friendly(err),"error"));

$("#seedSquadBtn").addEventListener("click",async()=>{
  const squad=[
    ["01","David","GK"],["04","Dilah","CB"],["05","McQuel","CB"],["02","Piteri","RB"],["03","Tarmizi","LB"],["06","Hadges","CDM"],["08","Mahathir","CDM"],["10","Wilson Ahon","CM"],["14","Chundi","CM"],["11","Zairy","LW"],["07","Hasif","RW"],["17","Iffat","RW"],["09","Aznel","AMF"],["16","Lamat","AMF"],["19","Rosbi","CF"],["21","Ronan","CF"]
  ];
  try{
    const batch=writeBatch(db);
    squad.forEach(([number,name,position])=>batch.set(doc(db,"players",slug(name)),{number,name,position,active:true,updatedAt:serverTimestamp()},{merge:true}));
    await batch.commit();setMsg("#playerMessage","Current squad seeded.","ok");
  }catch(err){setMsg("#playerMessage",friendly(err),"error");}
});
$("#seedMatchBtn").addEventListener("click",async()=>{
  try{
    setMsg("#matchMessage","Saving KATMA result…");
    await setDoc(doc(db,"matches","katma-2026-09-28"),{
      opponent:"KATMA",opponentCode:"KAT",opponentLogo:"/assets/katma-placeholder.svg",
      kickoff:Timestamp.fromDate(new Date("2026-09-28T16:30:00+08:00")),season:"2026",matchday:3,
      matchType:"Friendly Match",venue:"Venue archived",status:"FT",homeScore:0,awayScore:2,updatedAt:serverTimestamp()
    },{merge:true});
    setMsg("#matchMessage","KATMA result seeded ✓ Check the Matches list below and refresh the public page.","ok");
  }catch(err){setMsg("#matchMessage",friendly(err),"error");}
});

function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function setMsg(sel,text,type=""){const el=$(sel);if(!el)return;el.textContent=text;el.className="message "+type;}
function friendly(err){const code=err?.code||"";if(code.includes("permission-denied"))return "Permission denied. Firestore admin UID rule is not active yet.";if(code.includes("invalid-credential"))return "Email or password is incorrect.";if(code.includes("operation-not-allowed"))return "Enable Email/Password in Firebase Authentication first.";return err?.message||"Something went wrong.";}
