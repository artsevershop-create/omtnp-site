import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, ArrowDown, ChevronUp, Info, X } from 'lucide-react';
import { useVideoScrub } from './useVideoScrub';
const VIDEO = import.meta.env.VITE_TANKER_VIDEO_URL || '/images/tanker-river.mp4';
const FIRST_FRAME = '/images/tanker-first-frame.png';
const links = [['ОМТРАНСНЕФТЕПРОДУКТ','/'],['КОМПАНИЯ','/company.html#company'],['ФЛОТ','/company.html#fleet'],['ГЕОГРАФИЯ','/company.html#geography'],['КОНТАКТЫ','/company.html#contacts']];
function Stagger({ visible, delay = 0, children, className = '' }: {visible:boolean;delay?:number;children:ReactNode;className?:string}) {
  return <div className={`stagger ${visible ? 'shown' : ''} ${className}`} style={{transitionDelay:visible ? `${delay}ms` : '0ms'}}>{children}</div>;
}
export default function App() {
  const track = useRef<HTMLDivElement>(null);
  const {video, canvas, progress:p, canvasLive, failed} = useVideoScrub(VIDEO,track);
  const [menu,setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null), closeButton = useRef<HTMLButtonElement>(null), menuPanel = useRef<HTMLDivElement>(null);
  const a = p < .2 ? 1 : Math.max(0,1-(p-.2)/.08);
  const b = p < .32 ? 0 : p < .4 ? (p-.32)/.08 : p < .55 ? 1 : Math.max(0,1-(p-.55)/.08);
  const c = p < .67 ? 0 : p < .75 ? (p-.67)/.08 : 1;
  const jump = (value:number) => window.scrollTo({top:(track.current!.offsetHeight-window.innerHeight)*value,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow='hidden'; closeButton.current?.focus();
    const key = (e:KeyboardEvent) => {
      if(e.key==='Escape')setMenu(false);
      if(e.key==='Tab') {
        const nodes = Array.from(menuPanel.current!.querySelectorAll<HTMLElement>('button,a'));
        const first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',key);
    return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',key);menuButton.current?.focus();};
  },[menu]);
  // inert is serialized explicitly for React 18 and prevents invisible controls taking focus.
  const hidden = (yes:boolean) => yes ? {inert:''} : {};
  return <><main ref={track} className="cinema-track"><div className="cinema-scene">
    <video ref={video} src={VIDEO} poster={FIRST_FRAME} muted playsInline preload="auto" className="film" aria-hidden="true" />
    <canvas ref={canvas} width={1284} height={716} className={`film frame-canvas ${canvasLive?'live':''}`} aria-hidden="true" />
    <div className="scene-overlay">
      <nav className={`cinema-nav ${p>.75?'light':''}`} aria-label="Основная навигация">
        <div className="desktop-links">{links.map(([label,url],i)=><a key={label} href={url} className={i===0?'active':''} style={{animationDelay:`${i*80+300}ms`}}>{label}</a>)}</div>
        <button ref={menuButton} className="hamburger" onClick={()=>setMenu(true)} aria-label="Открыть меню" aria-expanded={menu} aria-controls="cinema-menu"><i/><i/><i/></button>
        <div className="nav-right"><a href="/company.html#news">НОВОСТИ <span className="info-icon"><Info size={10}/></span></a><button onClick={()=>setMenu(true)}>МЕНЮ</button></div>
      </nav>
      <section className="text-scene scene-one" style={{opacity:a}} aria-hidden={a<=.3} {...hidden(a<=.3)}>
        <div><Stagger visible={a>.3}><h1>Доставляем энергию<br/>по водным путям Сибири</h1></Stagger><Stagger visible={a>.3} delay={150}><p className="hero-subtitle">Светлые нефтепродукты. Речной флот.</p></Stagger></div>
        <Stagger visible={a>.3} delay={300} className="hero-next"><button className="circle" onClick={()=>jump(.43)} aria-label="Следующий раздел"><ArrowRight size={18}/></button></Stagger>
      </section>
      <section className="text-scene scene-two" style={{opacity:b}} aria-hidden={b<=.3} {...hidden(b<=.3)}>
        <Stagger visible={b>.3}><h2>Соединяем сибирские реки <span>опытом и точностью</span> <span>на каждом маршруте</span></h2></Stagger>
        <div className="scene-controls"><Stagger visible={b>.3} delay={200}><button className="circle" onClick={()=>jump(.8)} aria-label="К контактам"><ArrowDown size={18}/></button></Stagger><Stagger visible={b>.3} delay={350}><div className="dots" aria-hidden="true"><i/><i/><i/></div></Stagger><Stagger visible={b>.3} delay={500}><button className="circle small" onClick={()=>jump(0)} aria-label="Вернуться в начало"><ChevronUp size={16}/></button></Stagger></div>
      </section>
      <section className="text-scene scene-three" style={{opacity:c}} aria-hidden={c<=.3} {...hidden(c<=.3)}>
        <div className="closing-copy"><Stagger visible={c>.3}><p className="eyebrow">АО «Омтранснефтепродукт»</p></Stagger><Stagger visible={c>.3} delay={150}><h2>Ваш груз.<br/>Наш надёжный курс.</h2></Stagger><Stagger visible={c>.3} delay={300}><a className="contact-cta" href="/company.html#contacts">Обсудить перевозку <span><ArrowRight size={16}/></span></a></Stagger></div>
      </section>
    </div>
    {failed && <div className="film-error" role="status">Видео недоступно. <a href="/company.html">Перейти на сайт компании →</a></div>}
  </div></main>
  <div ref={menuPanel} id="cinema-menu" className={`cinema-menu ${menu?'open':''}`} role="dialog" aria-modal={menu?true:undefined} aria-label="Меню" aria-hidden={!menu} {...hidden(!menu)}>
    <button ref={closeButton} className="menu-close circle" onClick={()=>setMenu(false)} aria-label="Закрыть меню"><X size={18}/></button>
    <div className="menu-inner">{links.map(([label,url],i)=><a href={url} key={label} style={{'--delay':`${i*60}ms`} as CSSProperties} onClick={()=>setMenu(false)}>{label}</a>)}</div>
    <footer><a href="/company.html#news">НОВОСТИ</a><a href="/company.html#contacts">КОНТАКТЫ</a></footer>
  </div></>;
}
