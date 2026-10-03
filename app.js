const players = [
  {name:'David', pos:'GK', no:'01'},
  {name:'Dilah', pos:'CB', no:'04'},
  {name:'McQuel', pos:'CB', no:'05'},
  {name:'Piteri', pos:'RB', no:'02'},
  {name:'Tarmizi', pos:'LB', no:'03'},
  {name:'Hadges', pos:'CDM', no:'06'},
  {name:'Mahathir', pos:'CDM', no:'08'},
  {name:'Wilson Ahon', pos:'CM', no:'10'},
  {name:'Chundi', pos:'CM', no:'14'},
  {name:'Zairy', pos:'LW', no:'11'},
  {name:'Hasif', pos:'RW', no:'07'},
  {name:'Iffat', pos:'RW', no:'17'},
  {name:'Aznel', pos:'AMF', no:'09'},
  {name:'Lamat', pos:'AMF', no:'16'},
  {name:'Rosbi', pos:'CF', no:'19'},
  {name:'Ronan', pos:'CF', no:'21'},
];

const playerGrid = document.getElementById('playerGrid');
playerGrid.innerHTML = players.map((p, i) => `
  <article class="player-card" style="transition-delay:${Math.min(i*30,240)}ms">
    <div class="player-no">${p.no}</div>
    <span class="player-pos">${p.pos}</span>
    <h3>${p.name.toUpperCase()}</h3>
    <p>TEBAKANG EDUCATOR FC</p>
    <div class="accent-line"></div>
  </article>
`).join('');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.classList.add('visible');
      entry.target.querySelectorAll('[data-count]').forEach(el => countUp(el));
    }
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

function countUp(el){
  if(el.dataset.done) return;
  el.dataset.done='1';
  const end=Number(el.dataset.count||0), start=performance.now(), duration=850;
  const tick=(now)=>{ const p=Math.min((now-start)/duration,1); el.textContent=Math.round(end*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const id = tab.dataset.tab === 'stats' ? 'stats-panel' : tab.dataset.tab;
    document.getElementById(id)?.classList.add('active');
  });
});

const navLinks=[...document.querySelectorAll('#mainNav a')];
const sections=[...document.querySelectorAll('main section[id]')];
const sectionObserver=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      navLinks.forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${e.target.id}`));
    }
  })
},{rootMargin:'-35% 0px -55% 0px'});
sections.forEach(s=>sectionObserver.observe(s));

const menuButton=document.getElementById('menuButton');
const mainNav=document.getElementById('mainNav');
menuButton.addEventListener('click',()=>{
  const open=mainNav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded',String(open));
});
mainNav.addEventListener('click',()=>{mainNav.classList.remove('open');menuButton.setAttribute('aria-expanded','false')});

window.addEventListener('pointermove',e=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const x=(e.clientX/window.innerWidth-.5)*10;
  const y=(e.clientY/window.innerHeight-.5)*10;
  document.documentElement.style.setProperty('--mx',`${x}px`);
  document.documentElement.style.setProperty('--my',`${y}px`);
});
