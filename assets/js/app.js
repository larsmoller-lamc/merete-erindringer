/* Meretes Erindringer — interaktiv læser (sider pr. del) */
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
    brandYears: document.getElementById('brandYears'),
    bmFab: null
  };

  var state = { book: '1', page: 0, pages: [], figures: [], lbIndex: 0, spy: null, bookmark: null };

  /* ---------- helpers ---------- */
  function safeLS(){ try{ var k='__t';localStorage.setItem(k,'1');localStorage.removeItem(k);return localStorage; }catch(e){ return null; } }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function el(tag, cls, html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function slug(s){ return s.toLowerCase().replace(/[^a-z0-9æøå]+/g,'-').replace(/(^-|-$)/g,''); }
  function isMobile(){ return window.matchMedia && matchMedia('(max-width:900px)').matches; }
  function prefersReduced(){ return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ---------- pages-model: én "del" (sektion) = én side ---------- */
  function buildPages(data){
    var pages=[]; var n=0;
    var front={kind:'front', title:'Forside', tocChildren:[]};
    if(data.forord) front.tocChildren.push({id:'kap-forord', title:data.forord.title});
    pages.push(front);
    (data.sections||[]).forEach(function(sec){
      var p={kind:'part', title:sec.title, id:'sek-'+sec.id, section:sec, chapters:[]};
      (sec.chapters||[]).forEach(function(ch){
        n++; p.chapters.push({no:n, id:'kap-'+slug(ch.title)+'-'+n, title:ch.title, ch:ch});
      });
      pages.push(p);
    });
    return pages;
  }
  function partPages(){ return state.pages.filter(function(p){return p.kind==='part';}); }

  /* ---------- render one book ---------- */
  function renderBook(id){
    var data = BOOKS[id];
    els.content.innerHTML=''; els.tocList.innerHTML=''; state.figures=[];
    if(els.brandName) els.brandName.textContent = data ? data.title : 'Meretes Erindringer';
    if(els.brandYears) els.brandYears.textContent = data ? (data.years||'') : '';

    if(!data){ state.pages=[{kind:'placeholder'}]; renderPlaceholder(id); buildTocPlaceholder(id); return; }

    state.pages = buildPages(data);
    buildBookToc(data);
    showPage(0);
  }

  /* ---------- render current page ---------- */
  function showPage(idx, targetId){
    if(idx<0) idx=0; if(idx>=state.pages.length) idx=state.pages.length-1;
    state.page=idx;
    var data=BOOKS[state.book];
    var page=state.pages[idx];
    els.content.innerHTML='';

    var wrap=el('section','book'); wrap.setAttribute('data-book', state.book);

    if(page.kind==='front'){
      wrap.appendChild(renderCover(data));
      if(data.forord){
        var f=el('section','chapter'); f.id='kap-forord';
        f.appendChild(chapterHead('', data.forord.title));
        f.appendChild(renderProseBlocks(data.forord.blocks));
        wrap.appendChild(f);
      }
    } else if(page.kind==='part'){
      wrap.appendChild(partMeta(page));
      var opener=el('div','section-open'); opener.id=page.id;
      opener.innerHTML='<div class="eyebrow">Del</div><h2>'+esc(page.title)+'</h2><div class="divider"></div>';
      wrap.appendChild(opener);
      page.chapters.forEach(function(item){
        var c=el('section','chapter'); c.id=item.id;
        c.appendChild(chapterHead(String(item.no).padStart(2,'0'), item.title));
        c.appendChild(renderProseBlocks(item.ch.blocks));
        wrap.appendChild(c);
      });
    }

    wrap.appendChild(renderPager(idx));
    els.content.appendChild(wrap);

    indexFigures();
    setupObservers();
    setupSpy();
    markTocPage();
    assignParaIdx();
    refreshBookmark();

    if(targetId){ var t=document.getElementById(targetId); if(t){ t.scrollIntoView({block:'start'}); } else window.scrollTo(0,0); }
    else window.scrollTo(0,0);
    updateProgress();
  }

  /* ---------- bogmærke (én pr. bruger pr. delside) ---------- */
  function assignParaIdx(){
    var ps=els.content.querySelectorAll('.chapter .prose p');
    for(var i=0;i<ps.length;i++){ ps[i].setAttribute('data-bm-idx', i); }
  }
  function getCtx(){
    var page=state.pages[state.page];
    if(!page || page.kind!=='part') return null;
    return { book: state.book, page: page.id };
  }
  function bmReady(){
    var page=state.pages[state.page];
    return !!(page && page.kind==='part'
      && document.body.classList.contains('is-authed')
      && window.MemoirBackend && window.MemoirBackend.allowed);
  }
  function currentReadingParagraph(){
    var ps=[].slice.call(els.content.querySelectorAll('.chapter .prose p[data-bm-idx]'));
    if(!ps.length) return null;
    var off=90, chosen=ps[0];
    for(var i=0;i<ps.length;i++){ if(ps[i].getBoundingClientRect().top < off) chosen=ps[i]; else break; }
    return chosen;
  }
  function setBookmarkHere(){
    if(!bmReady()) return;
    var p=currentReadingParagraph(); if(!p) return;
    var ch=p.closest('.chapter');
    var data={
      idx: parseInt(p.getAttribute('data-bm-idx'),10),
      snippet: (p.textContent||'').replace(/\s+/g,' ').trim().slice(0,80),
      chapterId: ch?ch.id:'',
      chapterTitle: ch? (ch.querySelector('h3')?ch.querySelector('h3').textContent:'') : ''
    };
    window.MemoirBackend.save(getCtx(), data).then(refreshBookmark).catch(function(){});
  }
  function clearBookmark(){
    if(!bmReady()) return;
    window.MemoirBackend.remove(getCtx()).then(refreshBookmark).catch(function(){});
  }
  function removeMarkerUI(){
    els.content.querySelectorAll('.bm-tag').forEach(function(n){ n.remove(); });
    els.content.querySelectorAll('p.is-bookmarked').forEach(function(n){ n.classList.remove('is-bookmarked'); });
    var link=document.getElementById('bmJump'); if(link) link.remove();
  }
  function fmtDate(bm){
    var d;
    if(bm.at && typeof bm.at.toDate==='function') d=bm.at.toDate();
    else if(bm.atClient) d=new Date(bm.atClient);
    else d=new Date();
    try{ return new Intl.DateTimeFormat('da-DK',{day:'numeric',month:'long',year:'numeric'}).format(d); }
    catch(e){ return d.toLocaleDateString(); }
  }
  function findBookmarkP(bm){
    var p=els.content.querySelector('.chapter .prose p[data-bm-idx="'+bm.idx+'"]');
    if(p){
      var head=(bm.snippet||'').slice(0,30);
      if(!head || (p.textContent||'').replace(/\s+/g,' ').trim().indexOf(head)===0) return p;
    }
    if(bm.snippet){
      var head2=bm.snippet.slice(0,30);
      var all=[].slice.call(els.content.querySelectorAll('.chapter .prose p'));
      var hit=all.find(function(x){ return (x.textContent||'').replace(/\s+/g,' ').trim().indexOf(head2)===0; });
      if(hit) return hit;
    }
    return p||null;
  }
  function renderBookmark(bm){
    removeMarkerUI();
    state.bookmark = bm || null;
    if(bm){
      var p=findBookmarkP(bm);
      if(p){
        p.classList.add('is-bookmarked');
        var tag=el('div','bm-tag');
        tag.innerHTML='<span class="bm-tag__ic" aria-hidden="true">❦</span>'+
          '<span class="bm-tag__txt">Læst hertil · '+esc(fmtDate(bm))+'</span>'+
          '<button class="bm-tag__x" title="Fjern markering" aria-label="Fjern markering">✕</button>';
        tag.querySelector('.bm-tag__x').addEventListener('click', clearBookmark);
        p.parentNode.insertBefore(tag, p);
        addJumpLink(p, bm);
      }
    }
    updateFab();
  }
  function addJumpLink(p, bm){
    var meta=els.content.querySelector('.partmeta'); if(!meta) return;
    var a=el('button','partmeta__jump'); a.id='bmJump';
    a.innerHTML='<span class="partmeta__sep">·</span> Din markering: '+esc(fmtDate(bm))+' →';
    a.addEventListener('click', function(){ p.scrollIntoView({behavior:prefersReduced()?'auto':'smooth', block:'center'}); });
    meta.appendChild(a);
  }
  function updateFab(){
    if(!els.bmFab) return;
    var show=bmReady();
    els.bmFab.style.display = show?'inline-flex':'none';
    els.bmFab.textContent = state.bookmark ? 'Flyt markering hertil' : 'Sæt markering her';
  }
  function refreshBookmark(){
    removeMarkerUI(); state.bookmark=null;
    if(!bmReady()){ updateFab(); return; }
    updateFab();
    var ctx=getCtx();
    window.MemoirBackend.load(ctx).then(function(bm){
      if(getCtx() && getCtx().page===ctx.page) renderBookmark(bm);
    }).catch(function(){ renderBookmark(null); });
  }

  function partMeta(page){
    var parts=partPages();
    var pos=parts.indexOf(page)+1;
    var m=el('div','partmeta');
    m.innerHTML='<span class="partmeta__book">'+esc(BOOKS[state.book].title)+'</span>'+
                '<span class="partmeta__sep">·</span>'+
                '<span class="partmeta__which">Del '+pos+' af '+parts.length+'</span>';
    return m;
  }

  /* ---------- forrige / næste del ---------- */
  function renderPager(idx){
    var nav=el('nav','pager'); nav.setAttribute('aria-label','Sidenavigation');
    var prev=state.pages[idx-1], next=state.pages[idx+1];
    if(prev){
      var pb=el('button','pager__btn pager__btn--prev');
      pb.innerHTML='<span class="pager__dir">‹ Forrige</span><span class="pager__ttl">'+esc(prev.title)+'</span>';
      pb.addEventListener('click', function(){ showPage(idx-1); });
      nav.appendChild(pb);
    } else nav.appendChild(el('span','pager__spacer'));
    if(next){
      var nb=el('button','pager__btn pager__btn--next');
      nb.innerHTML='<span class="pager__dir">Næste ›</span><span class="pager__ttl">'+esc(next.title)+'</span>';
      nb.addEventListener('click', function(){ showPage(idx+1); });
      nav.appendChild(nb);
    } else nav.appendChild(el('span','pager__spacer'));
    return nav;
  }

  /* ---------- cover ---------- */
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
    grid.appendChild(el('div','portraits__cap','Merete gennem barndom og ungdom'));
    right.appendChild(grid);
    inner.appendChild(left); inner.appendChild(right);
    cov.appendChild(inner);
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
    var wrap = el('div','prose'); var i=0;
    while(i<blocks.length){
      var b=blocks[i];
      if(b.type==='figure'){
        var run=[]; while(i<blocks.length && blocks[i].type==='figure'){ run.push(blocks[i]); i++; }
        wrap.appendChild(renderFigures(run)); continue;
      }
      if(b.type==='subhead'){ wrap.appendChild(el('h4','subhead',esc(b.text))); i++; continue; }
      if(b.type==='para'){
        var ev=parseEvents(b.text);
        if(ev){ wrap.appendChild(renderEvents(ev)); i++; continue; }
        var bul=parseBullets(b.text);
        if(bul){ wrap.appendChild(renderBullets(bul)); i++; continue; }
        wrap.appendChild(el('p',null,esc(b.text))); i++; continue;
      }
      i++;
    }
    return wrap;
  }

  /* ---------- dato-tidslinje (Historiske begivenheder) ---------- */
  var DATE_RE=/(\d{1,2}\.\d{1,2}\.\d{4})|(Sommer\s+\d{2}(?!\d))/g;
  function parseEvents(text){
    var m, hits=0; DATE_RE.lastIndex=0;
    while((m=DATE_RE.exec(text))){ hits++; if(hits>=4) break; }
    if(hits<4) return null;
    var starts=[]; DATE_RE.lastIndex=0;
    while((m=DATE_RE.exec(text))){
      var i=m.index, before=text.slice(0,i);
      var cont=/\b[Dd]en\s$/.test(before);
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
    var notes=[]; var last=items[items.length-1];
    var cut=last.text.search(/Jeg har valgt at slutte/);
    if(cut>-1){ var tail=last.text.slice(cut).trim(); last.text=last.text.slice(0,cut).trim(); splitNote(tail,notes); }
    return {items:items, notes:notes};
  }
  function splitNote(tail, notes){
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
    ev.notes.forEach(function(n){ frag.appendChild(el('p', n.foot?'events__foot':'events__closing', esc(n.t))); });
    return frag;
  }
  function injectEventsCSS(){
    if(document.getElementById('events-css')) return;
    var css=
      '.events{list-style:none;margin:1.4rem 0;padding:0;max-width:var(--maxread);border-left:2px solid var(--mist-2)}'+
      '.events__item{display:grid;grid-template-columns:6.4rem 1fr;gap:.2rem 1rem;padding:.55rem 0 .55rem 1.1rem;position:relative}'+
      '.events__item::before{content:"";position:absolute;left:-5px;top:1rem;width:8px;height:8px;border-radius:50%;background:var(--sea);box-shadow:0 0 0 3px var(--paper)}'+
      '.events__item + .events__item{border-top:1px solid var(--line)}'+
      '.events__date{font-family:var(--ui);font-weight:700;font-size:.82rem;color:var(--sea);letter-spacing:.01em;padding-top:.15rem;white-space:nowrap}'+
      '.events__text{font-family:var(--body);color:var(--text);line-height:1.6}'+
      '.events__closing{max-width:var(--maxread);margin:1.4rem 0 .4rem;font-style:italic;color:var(--navy)}'+
      '.events__foot{max-width:var(--maxread);margin:.4rem 0;padding-left:1.1rem;border-left:2px solid var(--mist-2);font-size:.92rem;color:var(--muted)}'+
      '.events--bul .events__item{grid-template-columns:1fr}'+
      '@media (max-width:560px){.events__item{grid-template-columns:1fr;gap:.1rem}.events__date{padding-top:0}}';
    var st=document.createElement('style'); st.id='events-css'; st.textContent=css; document.head.appendChild(st);
  }

  /* ---------- punkt-tidslinje (Historiske begivenheder, Bog 2) ---------- */
  function parseBullets(text){
    var parts=null;
    if((text.match(/•/g)||[]).length >= 6){
      parts=text.split(/\s*•\s*/);
    } else if((text.match(/\s[–-]\s/g)||[]).length >= 6){
      // dash-separated event list (e.g. 1990'erne). Gate on short, list-like segments.
      var cand=text.replace(/^[\s]*[–-]\s+/,'').split(/\s+[–-]\s+/);
      var lens=cand.map(function(s){return s.trim().length;});
      var maxlen=Math.max.apply(null, lens);
      if(cand.length>=6 && maxlen<300) parts=cand;
    }
    if(!parts) return null;
    parts=parts.map(function(s){return s.trim();}).filter(function(s){return s.length>1;});
    return parts.length>=6 ? parts : null;
  }
  function renderBullets(items){
    injectEventsCSS();
    var ul=el('ul','events events--bul');
    items.forEach(function(t){
      var li=el('li','events__item');
      li.appendChild(el('span','events__text',esc(t)));
      ul.appendChild(li);
    });
    return ul;
  }

  /* ---------- fotos ---------- */
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

  /* ---------- placeholder-bøger ---------- */
  function renderPlaceholder(id){
    var book=el('section','book'); book.setAttribute('data-book',id);
    var p=el('div','placeholder');
    p.innerHTML='<span class="badge">Bog '+esc(id)+'</span>'+
      '<h2>Endnu ikke tilføjet</h2>'+
      '<p>Denne bog er klargjort i strukturen og glider ind her, så snart teksten og billederne er behandlet — på samme måde som Bog 1.</p>';
    book.appendChild(p); els.content.appendChild(book); window.scrollTo(0,0);
  }
  function buildTocPlaceholder(id){
    els.tocList.innerHTML='<p class="toc__grouphd">Bog '+esc(id)+'</p><p class="toc__note">Indhold tilføjes senere.</p>';
  }

  /* ---------- TOC (hele bogen; klik navigerer til rette side) ---------- */
  function buildBookToc(data){
    var frag=document.createDocumentFragment();
    // Forside-gruppe
    var g0=el('div','toc__group'); var ol0=el('ol');
    ol0.appendChild(tocLink(0,'forside','Forside', true));
    state.pages[0].tocChildren.forEach(function(ch){ ol0.appendChild(tocLink(0,ch.id,ch.title,false)); });
    g0.appendChild(ol0); frag.appendChild(g0);
    // Dele
    state.pages.forEach(function(page,idx){
      if(page.kind!=='part') return;
      var g=el('div','toc__group');
      var hd=el('a','toc__grouphd toc__grouphd--link',esc(page.title));
      hd.href='#'+page.id; hd.setAttribute('data-page',idx); hd.setAttribute('data-target',page.id);
      hd.addEventListener('click', function(e){ e.preventDefault(); navigateTo(idx,page.id); });
      g.appendChild(hd);
      var ol=el('ol');
      page.chapters.forEach(function(item){ ol.appendChild(tocLink(idx,item.id,item.title,false)); });
      g.appendChild(ol); frag.appendChild(g);
    });
    els.tocList.appendChild(frag);
  }
  function tocLink(pageIdx, id, title, isTop){
    var li=el('li');
    var a=el('a', isTop?'toc__top':null, esc(title));
    a.href='#'+id; a.setAttribute('data-target',id); a.setAttribute('data-page',pageIdx);
    a.addEventListener('click', function(e){ e.preventDefault(); navigateTo(pageIdx, id); });
    li.appendChild(a); return li;
  }
  function navigateTo(pageIdx, id){
    if(pageIdx!==state.page){ showPage(pageIdx, id); }
    else { var t=document.getElementById(id); if(t) t.scrollIntoView({behavior:prefersReduced()?'auto':'smooth', block:'start'}); }
    closeDrawer();
  }
  function markTocPage(){
    els.tocList.querySelectorAll('[data-page]').forEach(function(a){
      a.classList.toggle('on-page', parseInt(a.getAttribute('data-page'),10)===state.page);
    });
  }

  /* ---------- scrollspy (aktivt kapitel i TOC) ---------- */
  function setupSpy(){
    if(state.spy) state.spy.disconnect();
    var links={};
    els.tocList.querySelectorAll('a[data-target]').forEach(function(a){ links[a.getAttribute('data-target')]=a; });
    var targets=[].slice.call(els.content.querySelectorAll('.chapter, .section-open, .cover'));
    state.spy=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){
          var id=en.target.id;
          Object.keys(links).forEach(function(k){ links[k].classList.toggle('active', k===id); });
          var active=links[id]; if(active) active.scrollIntoView({block:'nearest'});
        }
      });
    }, {rootMargin:'-45% 0px -50% 0px', threshold:0});
    targets.forEach(function(c){ if(c.id) state.spy.observe(c); });
  }

  /* ---------- fade-in ---------- */
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
  function openLightboxSrc(src,cap){ state.figures=[{src:src,cap:cap}]; state.lbIndex=0; showLightbox(); }
  function showLightbox(){
    var f=state.figures[state.lbIndex]; if(!f)return;
    els.lbImg.src=f.src; els.lbImg.alt=f.cap||'Foto'; els.lbCap.textContent=f.cap||'';
    els.lbCounter.textContent=state.figures.length>1?(state.lbIndex+1)+' / '+state.figures.length:'';
    els.lb.classList.add('open'); els.lb.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  }
  function closeLightbox(){ els.lb.classList.remove('open'); els.lb.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  function lbStep(d){ if(state.figures.length<2)return; state.lbIndex=(state.lbIndex+d+state.figures.length)%state.figures.length; showLightbox(); }

  /* ---------- skriftstørrelse ---------- */
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
  function closeDrawer(){ els.toc.classList.remove('open'); els.scrim.classList.remove('show'); }

  /* ---------- flyt kontroller mellem topbar (desktop) og skuffe (mobil) ---------- */
  function placeControls(){
    var books=document.getElementById('bookTabs'), type=document.getElementById('typeCtrl');
    if(!books||!type) return;
    if(isMobile()){
      document.getElementById('slotBooks').appendChild(books);
      document.getElementById('slotType').appendChild(type);
    } else {
      document.getElementById('slotTopBooks').appendChild(books);
      document.getElementById('slotTopType').appendChild(type);
    }
  }

  /* ---------- bog-valg ---------- */
  function selectBook(id){
    state.book=id;
    [].slice.call(els.tabs.querySelectorAll('.book-tab')).forEach(function(t){
      t.setAttribute('aria-selected', t.getAttribute('data-book')===id ? 'true':'false');
    });
    renderBook(id);
    closeDrawer();
  }

  /* ---------- init ---------- */
  var started=false;
  function init(){
    if(started) return; started=true;
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

    els.menuToggle.addEventListener('click', function(){
      var open=els.toc.classList.toggle('open'); els.scrim.classList.toggle('show', open);
    });
    els.scrim.addEventListener('click', closeDrawer);

    els.totop.addEventListener('click', function(){ window.scrollTo({top:0,behavior:prefersReduced()?'auto':'smooth'}); });
    window.addEventListener('scroll', updateProgress, {passive:true});
    window.addEventListener('resize', function(){ updateProgress(); placeControls(); });

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

    placeControls();

    // bogmærke-knap (vises kun på delsider, når man er logget ind)
    els.bmFab=el('button','bmfab'); els.bmFab.type='button';
    els.bmFab.setAttribute('aria-label','Sæt læsemarkering her');
    els.bmFab.addEventListener('click', setBookmarkHere);
    document.body.appendChild(els.bmFab);
    if(window.MemoirBackend && typeof window.MemoirBackend.subscribe==='function'){
      window.MemoirBackend.subscribe(function(){ refreshBookmark(); });
    }

    selectBook('1');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
