(function(){
  var $ = function(s){ return document.querySelector(s); };
  var clone = function(x){ return JSON.parse(JSON.stringify(x)); };
  var esc = function(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };
  var S = window.SOLUNA || {};
  var my = clone(window.MY_EVENTS || []), sol = clone(S.soirees || []);
  $("#about").value = S.about || "";
  var dir = null, files = {}; /* dossier du site + images choisies */

  /* [clé, libellé, type] */
  var F = [["title","Titre"],["date","Date et heure","datetime-local"],["venue","Lieu"],["address","Adresse"],["city","Ville"],
           ["price","Entrée (prix)"],["link","Lien billets (https://…)"],["lineup","Line-up (séparés par des virgules)"],
           ["image","Chemin de l'image (img/nom.jpg)"],["desc","Description","textarea"]];

  function blank(){
    var d = new Date(Date.now() + 12096e5), p = function(n){ return String(n).padStart(2,"0"); };
    return { date: d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T22:00", title: "Nouvel événement" };
  }

  function draw(list, box){
    list.sort(function(a,b){ return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    box.innerHTML = "";
    list.forEach(function(e){
      var el = document.createElement("div"); el.className = "ac";
      var h = '<div class="ac-top"><span class="mono">Événement</span><button type="button" class="btn" data-del>Supprimer</button></div><div class="ac-grid">';
      F.forEach(function(f){
        var k = f[0], v = k === "lineup" ? (e.lineup||[]).join(", ") : (e[k]||""), ta = f[2] === "textarea";
        h += '<label class="f'+(ta?" wide":"")+'"><span class="mono">'+f[1]+"</span>"+
          (ta ? '<textarea rows="3" data-k="'+k+'">'+esc(v)+"</textarea>"
              : '<input type="'+(f[2]||"text")+'" data-k="'+k+'" value="'+esc(v)+'">')+"</label>";
      });
      h += '<div class="f wide"><span class="mono">Image : choisir un fichier</span><input type="file" accept="image/*" data-file><img class="pv" alt="" hidden></div></div>';
      el.innerHTML = h;
      var img = el.querySelector(".pv");
      var pv = function(src){ if(src){ img.hidden = false; img.src = src; } else img.hidden = true; };
      img.onerror = function(){ img.hidden = true; };
      pv(e.image);

      el.addEventListener("input", function(ev){
        var k = ev.target.getAttribute("data-k"); if(!k) return;
        var v = ev.target.value;
        e[k] = k === "lineup" ? v.split(",").map(function(s){ return s.trim(); }).filter(Boolean) : v;
        if(k === "image") pv(v);
      });
      el.querySelector("[data-file]").addEventListener("change", function(ev){
        var f = ev.target.files[0]; if(!f) return;
        e.image = "img/" + f.name;
        files[f.name] = f;
        el.querySelector('[data-k="image"]').value = e.image;
        img.hidden = false; img.src = URL.createObjectURL(f);
      });
      el.querySelector("[data-del]").addEventListener("click", function(){
        if(confirm("Supprimer cet événement ?")){ list.splice(list.indexOf(e),1); draw(list, box); }
      });
      box.appendChild(el);
    });
  }

  draw(my, $("#my")); draw(sol, $("#sol"));
  $("#add-my").onclick  = function(){ my.push(blank());  draw(my,  $("#my")); };
  $("#add-sol").onclick = function(){ sol.push(blank()); draw(sol, $("#sol")); };

  function build(){
    var clean = function(l){
      return l.filter(function(e){ return e.date; }).map(function(e){
        var o = {};
        Object.keys(e).forEach(function(k){ var v = e[k]; if(v !== "" && !(Array.isArray(v) && !v.length)) o[k] = v; });
        return o;
      });
    };
    return "/* Fichier généré par admin.html. Tu peux aussi le modifier à la main. */\n\n" +
      "window.MY_EVENTS = " + JSON.stringify(clean(my), null, 2) + ";\n\n" +
      "window.SOLUNA = " + JSON.stringify({ about: $("#about").value, soirees: clean(sol) }, null, 2) + ";\n";
  }

  async function put(d, name, data){
    var w = await (await d.getFileHandle(name, { create: true })).createWritable();
    await w.write(data); await w.close();
  }

  var st = function(m){ $("#st").textContent = m; };
  var canDir = !!window.showDirectoryPicker;
  if(!canDir){ $("#pick").hidden = true; $("#dl").textContent = "Télécharger data.js"; st("Ce navigateur ne peut pas écrire dans ton dossier : utilise Chrome ou Edge, ou remplace data.js à la main."); }

  $("#pick").onclick = async function(){
    try{ dir = await window.showDirectoryPicker({ mode: "readwrite" }); st("Dossier connecté : " + dir.name); }
    catch(e){ st("Aucun dossier choisi."); }
  };

  $("#dl").onclick = async function(){
    var txt = build();
    if(!dir){
      if(canDir){ st("Choisis d'abord le dossier du site (bouton 1)."); return; }
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([txt], { type: "text/javascript" }));
      a.download = "data.js"; a.click();
      st("data.js téléchargé : remplace l'ancien et copie les images dans img/.");
      return;
    }
    try{
      await put(dir, "data.js", txt);
      var names = Object.keys(files);
      if(names.length){
        var im = await dir.getDirectoryHandle("img", { create: true });
        for(var n = 0; n < names.length; n++) await put(im, names[n], files[names[n]]);
      }
      st("Enregistré. Rafraîchis index.html (Ctrl+F5).");
    }catch(e){ st("Échec : " + e.message); }
  };
})();
