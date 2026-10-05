const routes=["home","match-centre","matches","squad","stats","h2h","media"];
const views=[...document.querySelectorAll("[data-view]")];
const navLinks=[...document.querySelectorAll("[data-route]")];
const sidebar=document.getElementById("clubSidebar");
const backdrop=document.getElementById("sidebarBackdrop");
const menuButton=document.getElementById("menuButton");
const sidebarClose=document.getElementById("sidebarClose");

function currentRoute(){
  const r=(location.hash||"#home").slice(1);
  return routes.includes(r)?r:"home";
}
function renderRoute(route=currentRoute()){
  views.forEach(v=>v.classList.toggle("active",v.dataset.view===route));
  navLinks.forEach(a=>a.classList.toggle("active",a.dataset.route===route));
  closeSidebar();
  window.scrollTo({top:0,behavior:"instant"});
}
function openSidebar(){sidebar?.classList.add("open");if(backdrop){backdrop.hidden=false;requestAnimationFrame(()=>backdrop.classList.add("show"));}document.body.classList.add("sidebar-open");}
function closeSidebar(){sidebar?.classList.remove("open");if(backdrop){backdrop.classList.remove("show");setTimeout(()=>{if(!sidebar?.classList.contains("open"))backdrop.hidden=true;},180);}document.body.classList.remove("sidebar-open");}
menuButton?.addEventListener("click",openSidebar);
sidebarClose?.addEventListener("click",closeSidebar);
backdrop?.addEventListener("click",closeSidebar);
navLinks.forEach(a=>a.addEventListener("click",()=>setTimeout(()=>renderRoute(a.dataset.route),0)));
window.addEventListener("hashchange",()=>renderRoute());
renderRoute();

document.querySelectorAll(".tab").forEach(tab=>{
  tab.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab)?.classList.add("active");
  });
});

const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add("visible");});},{threshold:.08});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));

window.addEventListener("pointermove",e=>{
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const x=(e.clientX/window.innerWidth-.5)*8,y=(e.clientY/window.innerHeight-.5)*8;
  document.documentElement.style.setProperty("--mx",x+"px");
  document.documentElement.style.setProperty("--my",y+"px");
});
