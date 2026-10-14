(function(){
  var $ = function(id){ return document.getElementById(id); };
  var esc = function(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };
  var when = function(e){ return new Date(e.date); };
  var hour = function(e){ return e.date.length > 10 ? when(e).toLocaleTimeString("fr-CH",{hour:"2-digit",minute:"2-digit"}) : ""; };
  var reg = []; /* tous les événements affichés, retrouvés au clic par leur index */

  /* Langue : bascule seulement l'attribut lang (traduction à brancher) */
  var lb = $("lang");
  if(lb) lb.addEventListener("click", function(){
    document.documentElement.lang = document.documentElement.lang === "fr" ? "en" : "fr";
  });

  /* Tri automatique : un événement reste "à venir" jusqu'à 12 h après son début */
  function split(list){
    var now = Date.now();
    var s = (list||[]).slice().sort(function(a,b){ return when(a)-when(b); });
    var up = s.filter(function(e){ return when(e).getTime() + 12*36e5 >= now; });
    return { up: up, past: s.filter(function(e){ return up.indexOf(e) < 0; }).reverse() };
  }

  function chipsOf(e){
    var c = (e.lineup||[]).map(function(x){ return '<span class="chip">'+esc(x)+"</span>"; }).join("");
    return c ? '<div class="chips">'+c+"</div>" : "";
  }

  function row(e, isNext){
    var d = when(e), i = reg.push(e) - 1;
    var n = Math.ceil((d - Date.now()) / 864e5);
    var badge = isNext ? '<span class="badge">Prochaine · ' + (n>1 ? "dans "+n+" j" : n===1 ? "demain" : "ce soir") + "</span>" : "";
    var meta = [e.venue, e.city, hour(e)].filter(Boolean).map(esc).join(" · ");
    return '<li class="ev'+(isNext?" next":"")+'">'+
      '<div class="ev-date"><b>'+d.toLocaleDateString("fr-CH",{day:"2-digit"})+"</b><small>"+esc(d.toLocaleDateString("fr-CH",{month:"short"}))+"</small></div>"+
      '<div><h3><button type="button" class="ev-open" data-i="'+i+'">'+esc(e.title)+"</button></h3><p>"+meta+"</p>"+chipsOf(e)+"</div>"+
      '<div class="ev-act">'+badge+(e.link?'<a class="btn" href="'+esc(e.link)+'" target="_blank" rel="noopener">Billets</a>':"")+'<span class="more">Infos</span></div></li>';
  }

  function render(list, upId, pastId, emptyMsg){
    var s = split(list), up = $(upId), pa = $(pastId);
    up.innerHTML = s.up.length ? s.up.map(function(e,i){ return row(e, i===0); }).join("") : '<li class="empty">'+emptyMsg+"</li>";
    pa.innerHTML = s.past.map(function(e){ return row(e,false); }).join("");
    pa.parentNode.hidden = !s.past.length;
  }

  render(window.MY_EVENTS, "ev-up", "ev-past", "Aucune date annoncée pour le moment. Revenez bientôt ou écrivez-nous.");

  var S = window.SOLUNA || {};
  $("sol-about").textContent = S.about || "";
  render(S.soirees, "sol-up", "sol-past", "Prochaine soirée bientôt annoncée.");

  /* Fenêtre de détails : image + infos */
  var dlg = $("ev-dlg"), body = $("dlg-body");
  function show(e){
    var day = when(e).toLocaleDateString("fr-CH",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    day = day.charAt(0).toUpperCase() + day.slice(1);
    var t = hour(e);
    var rows = [["Date", day + (t ? " · " + t : "")], ["Lieu", [e.venue, e.address, e.city].filter(Boolean).join(", ")], ["Entrée", e.price]]
      .filter(function(r){ return r[1]; })
      .map(function(r){ return "<dt>"+r[0]+"</dt><dd>"+esc(r[1])+"</dd>"; }).join("");
    body.innerHTML =
      '<div class="dlg-img">'+(e.image?'<img src="'+esc(e.image)+'" alt="'+esc(e.title)+'">':'<span class="mono">Image à ajouter</span>')+"</div>"+
      '<div class="dlg-txt"><h3 id="dlg-title">'+esc(e.title)+"</h3><dl>"+rows+"</dl>"+
      (e.desc?"<p>"+esc(e.desc)+"</p>":"")+chipsOf(e)+
      (e.link?'<a class="btn solid" href="'+esc(e.link)+'" target="_blank" rel="noopener">Billets</a>':"")+"</div>";
    dlg.showModal();
  }
  document.addEventListener("click", function(ev){
    var b = ev.target.closest(".ev-open");
    if(b) show(reg[+b.getAttribute("data-i")]);
  });
  dlg.addEventListener("click", function(ev){
    if(ev.target === dlg || ev.target.closest(".dlg-x")) dlg.close();
  });
})();
