const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");entry.target.querySelectorAll("[data-count]").forEach(el=>countUp(el));}});},{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));

function countUp(el){if(el.dataset.done)return;el.dataset.done="1";const end=Number(el.dataset.count||0),start=performance.now(),duration=850;const tick=now=>{const p=Math.min((now-start)/duration,1);el.textContent=Math.round(end*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);}

document.querySelectorAll(".tab").forEach(tab=>{tab.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));tab.classList.add("active");document.getElementById(tab.dataset.tab)?.classList.add("active");});});

const navLinks=[...document.querySelectorAll("#mainNav a")],sections=[...document.querySelectorAll("main section[id]")];
const sectionObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)navLinks.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+e.target.id));});},{rootMargin:"-35% 0px -55% 0px"});
sections.forEach(s=>sectionObserver.observe(s));

const menuButton=document.getElementById("menuButton"),mainNav=document.getElementById("mainNav");
menuButton?.addEventListener("click",()=>{const open=mainNav.classList.toggle("open");menuButton.setAttribute("aria-expanded",String(open));});
mainNav?.addEventListener("click",()=>{mainNav.classList.remove("open");menuButton?.setAttribute("aria-expanded","false");});

window.addEventListener("pointermove",e=>{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;const x=(e.clientX/window.innerWidth-.5)*10,y=(e.clientY/window.innerHeight-.5)*10;document.documentElement.style.setProperty("--mx",x+"px");document.documentElement.style.setProperty("--my",y+"px");});
