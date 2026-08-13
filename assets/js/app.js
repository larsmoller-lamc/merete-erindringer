/* Meretes Erindringer — interaktiv læser */
(function () {
  'use strict';
  var BOOKS = window.BOOKS || {};
  var LS = safeLS();

  var els = {
    tabs: document.getElementById('bookTabs'),
    toc: document.getElementById('toc'),
    tocList: document.getElementById('tocList'),
    content: document.getElementById('content'),
    progress: document.getElementById('progressBar'),
    search: document.getElementById('search'),
    searchCount: document.getElementById('searchCount'),
    menuToggle: document.getElementById('menuToggle'),
    scrim: document.getElementById('scrim'),
    totop: document.getElementById('totop'),
    lb: document.getElementById('lightbox'),
    lbImg: document.getElementById('lbImg'),
    lbCap: document.getElementById('lbCap'),
    lbCounter: document.getElementById('lbCounter'),
    typeMinus: document.getElementById('typeMinus'),
    typePlus: document.getElementById('typePlus'),
    brandName: document.getElementById('brandName'),
    brandYears: document.getElementById('brandYears')
  };

  var state = { book: '1', figures: [], lbIndex: 0, spy: null };

  /* ---------- helpers ---------- */
  function safeLS(){ try{ var k='__t';localStorage.setItem(k,'1');localStorage.removeItem(k);return localStorage; }catch(e){ return null; } }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function el(tag, cls, html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function slug(s){ return s.toLowerCase().replace(/[^a-z0-9æøå]+/g,'-').replace(/(^-|-$)/g,''); }

  /* ---------- render one book ---------- */
  function renderBook(id){
    var data = BOOKS[id];
    els.content.innerHTML='';
    els.tocList.innerHTML='';
    state.figures=[];

    if(!data){ renderPlaceholder(id); buildTocPlaceholder(id); return; }

    var book = el('section','book'); book.setAttribute('data-book', id);

    /* Cover */
    book.appendChild(renderCover(data));

    /* Forord */
    var toc = [];
    if(data.forord){
      var f = el('section','chapter'); f.id='kap-forord';
      f.appendChild(chapterHead('', data.forord.title));
      f.appendChild(renderProseBlocks(data.forord.blocks));
      book.appendChild(f);
      toc.push({group:null, id:'kap-forord', title:data.forord.title});
    }

    /* Sektioner + kapitler */
    var n=0;
    data.sections.forEach(function(sec){
      var opener = el('div','section-open');
      opener.innerHTML='<div class="eyebrow">Del</div><h2>'+esc(sec.title)+'</h2><div class="divider"></div>';
      opener.id='sek-'+sec.id;
      book.appendChild(opener);
      toc.push({groupTitle:sec.title, groupId:'sek-'+sec.id});

      sec.chapters.forEach(function(ch){
        n++;
        var cid='kap-'+slug(ch.title)+'-'+n;
        var c = el('section','chapter'); c.id=cid;
        c.appendChild(chapterHead(String(n).padStart(2,'0'), ch.title));
        c.appendChild(renderProseBlocks(ch.blocks));
        book.appendChild(c);
        toc.push({group:sec.title, id:cid, title:ch.title});
      });
    });

    els.content.appendChild(book);
    buildToc(toc);
    indexFigures();
    setupObservers();
    setupSpy();
    if(els.brandName) els.brandName.textContent = data.title;
    if(els.brandYears) els.brandYears.textContent = data.years||'';
    window.scrollTo(0,0);
    updateProgress();
  }

  function renderCover(data){
    var cov = el('section','cover'); cov.id='forside';
    var inner = el('div','cover__inner');

    var left = el('div','cover__text');
    var lin='';
    (data.frontispiece && data.frontispiece.lines || []).forEach(function(l){ lin+='<li>'+esc(l)+'</li>'; });
    left.innerHTML =
      '<p class="cover__eyebrow">Erindringer</p>'+
      '<h1>'+esc(data.title)+'</h1>'+
      '<p class="cover__years">'+esc(data.years||'')+'</p>'+
      '<div class="cover__rule"></div>'+
      (data.dedication?'<p class="cover__ded">'+esc(data.dedication)+'</p>':'')+
      (lin?'<div class="frontis"><p class="frontis__name">'+esc(data.frontispiece.name)+'</p><ul>'+lin+'</ul></div>':'');

    var right = el('div','cover__portraits');
    var grid = el('div','portraits');
    (data.cover||[]).forEach(function(src,i){
      var fig=el('figure');
      var img=el('img'); img.src=src; img.alt='Merete — portræt '+(i+1); img.loading='lazy';
      img.addEventListener('click', function(){ openLightboxSrc(src, ''); });
      fig.appendChild(img); grid.appendChild(fig);
    });
    var cap=el('div','portraits__cap','Merete gennem barndom og ungdom');
    grid.appendChild(cap);
    right.appendChild(grid);

    inner.appendChild(left); inner.appendChild(right);
    cov.appendChild(inner);
    // reveal portraits shortly after mount
    setTimeout(function(){ cov.classList.add('reveal'); }, 60);
    return cov;
  }

  function chapterHead(no, title){
    var h=el('div','chapter__hd');
    if(no) h.appendChild(el('span','chapter__no',no));
    h.appendChild(el('h3',null,esc(title)));
    return h;
  }

  function renderProseBlocks(blocks){
    var wrap = el('div','prose');
    var i=0;
    while(i<blocks.length){
      var b=blocks[i];
      if(b.type==='figure'){
        // gather a run of consecutive figures
        var run=[]; while(i<blocks.length && blocks[i].type==='figure'){ run.push(blocks[i]); i++; }
        wrap.appendChild(renderFigures(run));
        continue;
      }
      if(b.type==='subhead'){ wrap.appendChild(el('h4','subhead',esc(b.text))); i++; continue; }
      if(b.type==='para'){
        var ev=parseEvents(b.text);
        if(ev){ wrap.appendChild(renderEvents(ev)); i++; continue; }
        wrap.appendChild(el('p',null,esc(b.text))); i++; continue;
      }
      i++;
    }
    return wrap;
  }

  /* ---------- dato-tidslinje (Historiske begivenheder) ---------- */
  var DATE_RE=/(\d{1,2}\.\d{1,2}\.\d{4})|(Sommer\s+\d{2}(?!\d))/g;
  // Genkend et afsnit, der i virkeligheden er en liste af daterede begivenheder.
  function parseEvents(text){
    var m, hits=0; DATE_RE.lastIndex=0;
    while((m=DATE_RE.exec(text))){ hits++; if(hits>=4) break; }
    if(hits<4) return null;
    // Find alle datoer, der starter en ny post (ikke fx "Den 11.1.1966 …").
    var starts=[]; DATE_RE.lastIndex=0;
    while((m=DATE_RE.exec(text))){
      var i=m.index, before=text.slice(0,i);
      var cont=/\b[Dd]en\s$/.test(before);           // "Den <dato>" = fortsættelse
      if(i===0 || !cont) starts.push({i:i, date:m[0]});
    }
    if(starts.length<4) return null;
    var items=[];
    for(var k=0;k<starts.length;k++){
      var from=starts[k].i, to=(k+1<starts.length)?starts[k+1].i:text.length;
      var chunk=text.slice(from,to).trim();
      var rest=chunk.slice(starts[k].date.length).trim().replace(/^[–-]\s*/,'');
      items.push({date:starts[k].date, text:rest});
    }
    // Afsluttende brødtekst / fodnote hænger på den sidste post — skil den fra.
    var notes=[];
    var last=items[items.length-1];
    var cut=last.text.search(/Jeg har valgt at slutte/);
    if(cut>-1){ var tail=last.text.slice(cut).trim(); last.text=last.text.slice(0,cut).trim(); splitNote(tail,notes); }
    return {items:items, notes:notes};
  }
  function splitNote(tail, notes){
    // Adskil evt. stjerne-fodnote ("* Onkel Alfred …") fra den afsluttende bemærkning.
    var star=tail.search(/\s\*\s|^\*\s/);
    if(star>-1){
      var main=tail.slice(0,star).trim(); var foot=tail.slice(star).replace(/^\s*\*\s*/,'').trim();
      if(main) notes.push({t:main,foot:false});
      if(foot) notes.push({t:foot,foot:true});
    } else if(tail){ notes.push({t:tail,foot:false}); }
  }
  function renderEvents(ev){
    injectEventsCSS();
    var frag=document.createDocumentFragment();
    var ol=el('ol','events');
    ev.items.forEach(function(it){
      var li=el('li','events__item');
      li.appendChild(el('span','events__date',esc(it.date)));
      li.appendChild(el('span','events__text',esc(it.text)));
      ol.appendChild(li);
    });
    frag.appendChild(ol);
    ev.notes.forEach(function(n){
      frag.appendChild(el('p', n.foot?'events__foot':'events__closing', esc(n.t)));
    });
    return frag;
  }
  function injectEventsCSS(){
    if(document.getElementById('events-css')) return;
    var css=
      '.events{list-style:none;margin:1.4rem 0;padding:0;max-width:var(--maxread);'+
        'border-left:2px solid var(--mist-2)}'+
      '.events__item{display:grid;grid-template-columns:6.4rem 1fr;gap:.2rem 1rem;'+
        'padding:.55rem 0 .55rem 1.1rem;position:relative}'+
      '.events__item::before{content:"";position:absolute;left:-5px;top:1rem;width:8px;height:8px;'+
        'border-radius:50%;background:var(--sea);box-shadow:0 0 0 3px var(--paper)}'+
      '.events__item + .events__item{border-top:1px solid var(--line)}'+
      '.events__date{font-family:var(--ui);font-weight:700;font-size:.82rem;color:var(--sea);'+
        'letter-spacing:.01em;padding-top:.15rem;white-space:nowrap}'+
      '.events__text{font-family:var(--body);color:var(--text);line-height:1.6}'+
      '.events__closing{max-width:var(--maxread);margin:1.4rem 0 .4rem;font-style:italic;color:var(--navy)}'+
      '.events__foot{max-width:var(--maxread);margin:.4rem 0;padding-left:1.1rem;border-left:2px solid var(--mist-2);'+
        'font-size:.92rem;color:var(--muted)}'+
      '@media (max-width:560px){.events__item{grid-template-columns:1fr;gap:.1rem}'+
        '.events__date{padding-top:0}}';
    var st=document.createElement('style'); st.id='events-css'; st.textContent=css;
    document.head.appendChild(st);
  }

  function figureNode(f, wide){
    var fig = el('figure','photo'+(wide?' wide':'')+' obsv');
    var img = el('img'); img.src=f.file; img.alt=f.caption||'Foto fra Meretes erindringer'; img.loading='lazy';
    img.addEventListener('click', function(){ openLightbox(f.file); });
    fig.appendChild(img);
    if(f.caption) fig.appendChild(el('figcaption',null,esc(f.caption)));
    return fig;
  }

  function renderFigures(run){
    run = run.filter(function(f){return f.file;});
    if(run.length===0) return document.createComment('no-img');
    if(run.length===1) return figureNode(run[0], false);
    var row = el('div','photo-row'+(run.length>=3?' n3':''));
    run.forEach(function(f){ row.appendChild(figureNode(f,false)); });
    return row;
  }

  /* ---------- placeholder book ---------- */
  function renderPlaceholder(id){
    var book=el('section','book'); book.setAttribute('data-book',id);
    var p=el('div','placeholder');
    p.innerHTML='<span class="badge">Bog '+esc(id)+'</span>'+
      '<h2>Endnu ikke tilføjet</h2>'+
      '<p>Denne bog er klargjort i strukturen og glider ind her, så snart teksten og billederne er behandlet — på samme måde som Bog 1.</p>';
    book.appendChild(p);
    els.content.appendChild(book);
    if(els.brandName) els.brandName.textContent='Meretes Erindringer';
    if(els.brandYears) els.brandYears.textContent='';
    window.scrollTo(0,0);
  }
  function buildTocPlaceholder(id){
    els.tocList.innerHTML='<p class="toc__grouphd">Bog '+esc(id)+'</p><p style="font-family:var(--ui);font-size:.82rem;color:var(--muted)">Indhold tilføjes senere.</p>';
  }

  /* ---------- TOC ---------- */
  function buildToc(items){
    var frag=document.createDocumentFragment();
    var curGroup=null, ol=null;
    items.forEach(function(it){
      if(it.groupTitle){
        curGroup=el('div','toc__group');
        curGroup.appendChild(el('div','toc__grouphd',esc(it.groupTitle)));
        ol=el('ol'); curGroup.appendChild(ol); frag.appendChild(curGroup);
        return;
      }
      if(!ol || it.group==null){
        // top-level (Forord) — own group without heading
        var g=el('div','toc__group'); ol=el('ol'); g.appendChild(ol); frag.appendChild(g); curGroup=g;
      }
      var li=el('li');
      var a=el('a',null,esc(it.title)); a.href='#'+it.id; a.setAttribute('data-target',it.id);
      a.addEventListener('click', function(e){ e.preventDefault(); goTo(it.id); closeDrawer(); });
      li.appendChild(a); ol.appendChild(li);
    });
    els.tocList.appendChild(frag);
  }

  function goTo(id){
    var target=document.getElementById(id);
    if(target) target.scrollIntoView({behavior: prefersReduced()?'auto':'smooth', block:'start'});
  }

  /* ---------- scrollspy ---------- */
  function setupSpy(){
    if(state.spy) state.spy.disconnect();
    var links={}; 
    els.tocList.querySelectorAll('a[data-target]').forEach(function(a){ links[a.getAttribute('data-target')]=a; });
    var chapters=[].slice.call(els.content.querySelectorAll('.chapter'));
    state.spy=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){
          var id=en.target.id;
          Object.keys(links).forEach(function(k){ links[k].classList.toggle('active', k===id); });
          var active=links[id];
          if(active) active.scrollIntoView({block:'nearest'});
        }
      });
    }, {rootMargin:'-45% 0px -50% 0px', threshold:0});
    chapters.forEach(function(c){ state.spy.observe(c); });
  }

  /* ---------- fade-in observer ---------- */
  function setupObservers(){
    if(prefersReduced()){ els.content.querySelectorAll('.obsv').forEach(function(n){n.classList.add('in');}); return; }
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
    },{rootMargin:'0px 0px -8% 0px', threshold:.05});
    els.content.querySelectorAll('.obsv').forEach(function(n){ io.observe(n); });
  }

  /* ---------- lightbox ---------- */
  function indexFigures(){
    state.figures=[].slice.call(els.content.querySelectorAll('figure.photo img')).map(function(img){
      var cap=img.parentNode.querySelector('figcaption');
      return {src:img.src, cap:cap?cap.textContent:''};
    });
  }
  function openLightbox(src){
    var idx=state.figures.findIndex(function(f){return f.src===src || f.src.endsWith(src);});
    if(idx<0){ openLightboxSrc(src,''); return; }
    state.lbIndex=idx; showLightbox();
  }
  function openLightboxSrc(src,cap){
    state.figures=[{src:src,cap:cap}]; state.lbIndex=0; showLightbox();
  }
  function showLightbox(){
    var f=state.figures[state.lbIndex]; if(!f)return;
    els.lbImg.src=f.src; els.lbImg.alt=f.cap||'Foto';
    els.lbCap.textContent=f.cap||'';
    els.lbCounter.textContent=state.figures.length>1?(state.lbIndex+1)+' / '+state.figures.length:'';
    els.lb.classList.add('open'); els.lb.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function closeLightbox(){ els.lb.classList.remove('open'); els.lb.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  function lbStep(d){ if(state.figures.length<2)return; state.lbIndex=(state.lbIndex+d+state.figures.length)%state.figures.length; showLightbox(); }

  /* ---------- search (fuldtekst) ---------- */
  var searchState={matches:[], idx:-1};
  function clearMarks(){
    els.content.querySelectorAll('mark').forEach(function(m){
      var t=document.createTextNode(m.textContent); m.parentNode.replaceChild(t,m); m.parentNode && m.parentNode.normalize();
    });
    // merge split text nodes
    els.content.querySelectorAll('.prose p, figcaption, .subhead, .events__text, .events__closing, .events__foot').forEach(function(n){ n.normalize(); });
  }
  function runSearch(q){
    clearMarks(); searchState={matches:[], idx:-1};
    q=q.trim();
    // TOC filter
    var qlow=q.toLowerCase();
    els.tocList.querySelectorAll('a[data-target]').forEach(function(a){
      a.classList.toggle('hidden', q.length>=2 && a.textContent.toLowerCase().indexOf(qlow)<0 && !chapterHasText(a.getAttribute('data-target'),qlow));
    });
    if(q.length<2){ els.searchCount.textContent=''; return; }
    var re=new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
    var nodes=[].slice.call(els.content.querySelectorAll('.prose p, figcaption, .subhead, .events__text, .events__closing, .events__foot'));
    nodes.forEach(function(node){
      highlightIn(node, re);
    });
    searchState.matches=[].slice.call(els.content.querySelectorAll('mark'));
    els.searchCount.textContent = searchState.matches.length ? searchState.matches.length+' fund' : 'ingen fund';
    if(searchState.matches.length){ searchState.idx=0; focusMatch(); }
  }
  function chapterHasText(id,qlow){
    var c=document.getElementById(id); if(!c)return false;
    return c.textContent.toLowerCase().indexOf(qlow)>=0;
  }
  function highlightIn(node, re){
    var walker=document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    var textNodes=[]; var tn;
    while((tn=walker.nextNode())) textNodes.push(tn);
    textNodes.forEach(function(t){
      var s=t.nodeValue; if(!re.test(s))return; re.lastIndex=0;
      var frag=document.createDocumentFragment(); var last=0; var m;
      while((m=re.exec(s))){
        if(m.index>last) frag.appendChild(document.createTextNode(s.slice(last,m.index)));
        var mk=el('mark',null,esc(m[0])); frag.appendChild(mk);
        last=m.index+m[0].length;
        if(m.index===re.lastIndex) re.lastIndex++;
      }
      if(last<s.length) frag.appendChild(document.createTextNode(s.slice(last)));
      t.parentNode.replaceChild(frag,t);
    });
  }
  function focusMatch(){
    searchState.matches.forEach(function(m,i){ m.classList.toggle('current', i===searchState.idx); });
    var m=searchState.matches[searchState.idx];
    if(m) m.scrollIntoView({behavior:prefersReduced()?'auto':'smooth', block:'center'});
  }
  function stepMatch(d){ if(!searchState.matches.length)return; searchState.idx=(searchState.idx+d+searchState.matches.length)%searchState.matches.length; focusMatch(); }

  /* ---------- type scale ---------- */
  function getScale(){ var v=LS&&LS.getItem('scale'); return v?parseFloat(v):1; }
  function setScale(v){ v=Math.min(1.4,Math.max(.85,Math.round(v*100)/100)); document.documentElement.style.setProperty('--reading-scale',v); if(LS)LS.setItem('scale',v); }

  /* ---------- progress + totop ---------- */
  function updateProgress(){
    var h=document.documentElement;
    var max=h.scrollHeight-h.clientHeight;
    var p=max>0?(h.scrollTop/max)*100:0;
    els.progress.style.width=p+'%';
    els.totop.classList.toggle('show', h.scrollTop>600);
  }

  function prefersReduced(){ return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function closeDrawer(){ els.toc.classList.remove('open'); els.scrim.classList.remove('show'); }

  /* ---------- book tabs ---------- */
  function selectBook(id){
    state.book=id;
    [].slice.call(els.tabs.querySelectorAll('.book-tab')).forEach(function(t){
      t.setAttribute('aria-selected', t.getAttribute('data-book')===id ? 'true':'false');
    });
    els.search.value=''; els.searchCount.textContent='';
    renderBook(id);
  }

  /* ---------- init ---------- */
  function init(){
    // build tabs
    ['1','2','3'].forEach(function(id){
      var b=el('button','book-tab'); b.textContent='Bog '+id; b.setAttribute('data-book',id);
      if(!BOOKS[id]){ b.innerHTML='Bog '+id+' <span class="dot">●</span>'; }
      b.setAttribute('role','tab'); b.setAttribute('aria-selected', id==='1'?'true':'false');
      b.addEventListener('click', function(){ selectBook(id); });
      els.tabs.appendChild(b);
    });

    setScale(getScale());
    els.typeMinus.addEventListener('click', function(){ setScale(getScale()-.08); });
    els.typePlus.addEventListener('click', function(){ setScale(getScale()+.08); });

    els.search.addEventListener('input', function(){ runSearch(this.value); });
    els.search.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ e.preventDefault(); stepMatch(e.shiftKey?-1:1); }
      if(e.key==='Escape'){ this.value=''; runSearch(''); }
    });

    els.menuToggle.addEventListener('click', function(){
      var open=els.toc.classList.toggle('open'); els.scrim.classList.toggle('show', open);
    });
    els.scrim.addEventListener('click', closeDrawer);

    els.totop.addEventListener('click', function(){ window.scrollTo({top:0,behavior:prefersReduced()?'auto':'smooth'}); });
    window.addEventListener('scroll', updateProgress, {passive:true});
    window.addEventListener('resize', updateProgress);

    // lightbox events
    els.lb.addEventListener('click', function(e){ if(e.target===els.lb) closeLightbox(); });
    document.getElementById('lbClose').addEventListener('click', closeLightbox);
    document.getElementById('lbPrev').addEventListener('click', function(){ lbStep(-1); });
    document.getElementById('lbNext').addEventListener('click', function(){ lbStep(1); });
    document.addEventListener('keydown', function(e){
      if(!els.lb.classList.contains('open'))return;
      if(e.key==='Escape') closeLightbox();
      if(e.key==='ArrowLeft') lbStep(-1);
      if(e.key==='ArrowRight') lbStep(1);
    });

    selectBook('1');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
