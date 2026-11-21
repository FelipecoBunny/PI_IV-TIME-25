/* Tela: Controle de Medicamentos | PetHealth */

var DIAS=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
var hoje=new Date(),pet="Thor",nextId=10,taken={};
var meds=[
 {id:1,pet:"Thor",nome:"Dipirona",sal:"Dipirona sódica",fmt:"Comprimido",dos:1,uni:"comprimido",freq:"dia",dias:[],hor:"09:00",fim:0,ativo:true},
 {id:2,pet:"Thor",nome:"Anti-inflamatório",sal:"Meloxicam",fmt:"Líquido",dos:100,uni:"mg",freq:"dia",dias:[],hor:"20:00",fim:30,ativo:true},
 {id:3,pet:"Thor",nome:"Vermífugo",sal:"Praziquantel",fmt:"Comprimido",dos:135,uni:"mg",freq:"sem",dias:[hoje.getDay(),(hoje.getDay()+3)%7],hor:"09:00",fim:15,ativo:true},
 {id:4,pet:"Thor",nome:"Antibiótico",sal:"Amoxicilina",fmt:"Cápsula",dos:250,uni:"mg",freq:"dia",dias:[],hor:"08:00",fim:7,ativo:false},
 {id:5,pet:"Mia",nome:"Suplemento",sal:"Ômega 3",fmt:"Cápsula",dos:1,uni:"cápsula",freq:"dia",dias:[],hor:"19:00",fim:0,ativo:true}
];
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function dose(m){return m.dos?(m.dos+" "+m.uni):"—"}
function applies(m){return m.freq==="dia"||m.dias.indexOf(hoje.getDay())>-1}
function sched(m){
  var h=m.hor?(" às "+m.hor):"";
  if(m.freq==="dia")return "Todos os dias"+h+" · "+dose(m);
  return m.dias.map(function(d){return DIAS[d].slice(0,3)}).join(", ")+h+" · "+dose(m);
}
function periodo(m){
  if(!m.fim)return "Uso contínuo";
  var e=new Date(hoje);e.setDate(e.getDate()+m.fim);
  return hoje.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" até "+e.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
}
function render(){
  document.getElementById("pet-sub").textContent="Pet: "+pet;
  document.getElementById("hoje").textContent="Hoje, "+hoje.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"});
  var mine=meds.filter(function(m){return m.pet===pet});
  var act=mine.filter(function(m){return m.ativo});
  var td=act.filter(applies).sort(function(a,b){return (a.hor||"99").localeCompare(b.hor||"99")});
  document.getElementById("today").innerHTML=td.length?td.map(function(m){
    var done=taken[m.id];
    return '<div class="card'+(done?' done':'')+'"><div class="row"><b>'+esc(m.nome)+'</b><div class="t"><b>'+(m.hor||"Sem horário")+'</b>'+esc(dose(m))+'</div></div>'+
    (done?'<p class="sub" style="font-size:.85rem">✓ Tomado: '+esc(done)+'</p><div class="acts"><button class="btn btn--o" data-undo="'+m.id+'">Desfazer</button></div>':
    '<input class="custom" id="c'+m.id+'" placeholder="Dose específica (ex.: 50 mg)" hidden aria-label="Dose específica">'+
    '<div class="acts"><button class="btn btn--o" data-spec="'+m.id+'">Dose Específica</button><button class="btn" data-take="'+m.id+'">✓ Registrar como Tomado</button></div>')+'</div>';
  }).join(""):'<p class="empty">Nenhum medicamento para hoje.</p>';
  document.getElementById("plan").innerHTML=act.length?act.map(function(m){
    return '<div class="card plan"><div class="row"><b>'+esc(m.nome)+'</b><span>'+periodo(m)+'</span></div><p class="sch">'+esc(sched(m))+'</p><p class="desc">'+esc(m.fmt)+(m.sal?' · '+esc(m.sal):'')+'</p></div>';
  }).join(""):'<p class="empty">Nenhum plano ativo.</p>';
  document.getElementById("saved").innerHTML=mine.length?mine.map(function(m){
    return '<div class="saved'+(m.ativo?'':' arch')+'"><span class="saved__i" aria-hidden="true">'+(m.ativo?'📅':'🗄️')+'</span><div class="saved__m"><small>'+(m.ativo?'Ativo':'Arquivado')+'</small><b>'+esc(m.nome)+'</b><em>'+esc(m.sal||"")+'</em></div><div class="saved__a"><button class="btn btn--t" data-edit="'+m.id+'">Editar Detalhes</button><button class="btn btn--o" data-arch="'+m.id+'">'+(m.ativo?'Arquivar':'Desarquivar')+'</button></div></div>';
  }).join(""):'<p class="empty" style="margin-top:10px">Nenhum medicamento salvo.</p>';
}
function find(id){return meds.filter(function(m){return m.id==id})[0]}
document.addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;
  if(b.dataset.take){var m=find(b.dataset.take),c=document.getElementById("c"+m.id);taken[m.id]=(c&&c.value.trim())||dose(m);render()}
  else if(b.dataset.undo){delete taken[b.dataset.undo];render()}
  else if(b.dataset.spec){var c=document.getElementById("c"+b.dataset.spec);c.hidden=!c.hidden;if(!c.hidden)c.focus()}
  else if(b.dataset.arch){var m2=find(b.dataset.arch);m2.ativo=!m2.ativo;render()}
  else if(b.dataset.edit){openForm(find(b.dataset.edit))}
  else if(b.dataset.pet){pet=b.dataset.pet;document.querySelectorAll(".pet").forEach(function(p){p.setAttribute("aria-pressed",p===b?"true":"false")});render()}
});
/* Formulário */
var dlg=document.getElementById("dlg"),sel=[],editing=null;
var daysEl=document.getElementById("days");
daysEl.innerHTML=DIAS.map(function(d,i){return '<button type="button" class="day" data-d="'+i+'" aria-pressed="false">'+d+'</button>'}).join("");
function paintDays(){
  daysEl.querySelectorAll(".day").forEach(function(b){b.setAttribute("aria-pressed",sel.indexOf(+b.dataset.d)>-1?"true":"false")});
  daysEl.hidden=document.getElementById("freq").value!=="sem";
}
daysEl.addEventListener("click",function(e){var b=e.target.closest(".day");if(!b)return;var d=+b.dataset.d,i=sel.indexOf(d);if(i>-1)sel.splice(i,1);else sel.push(d);paintDays()});
document.getElementById("freq").addEventListener("change",paintDays);
document.getElementById("incsal").addEventListener("change",function(){document.getElementById("salf").hidden=!this.checked});
document.getElementById("semh").addEventListener("change",function(){document.getElementById("hor").disabled=this.checked});
function openForm(m){
  editing=m||null;
  document.getElementById("dt").textContent=m?"Editar Medicamento":"Registrar Medicamento";
  document.getElementById("err").hidden=true;
  document.getElementById("farm").value=m?m.nome:"";
  document.getElementById("incsal").checked=m?!!m.sal:true;
  document.getElementById("sal").value=m?m.sal:"";
  document.getElementById("salf").hidden=!document.getElementById("incsal").checked;
  document.getElementById("fmt").value=m?m.fmt:"Comprimido";
  document.getElementById("dos").value=m?m.dos:"";
  document.getElementById("uni").value=m&&["mg","ml","g","gotas"].indexOf(m.uni)>-1?m.uni:"mg";
  document.getElementById("freq").value=m?m.freq:"sem";
  document.getElementById("semh").checked=m?!m.hor:false;
  document.getElementById("hor").value=m&&m.hor?m.hor:"10:00";
  document.getElementById("hor").disabled=document.getElementById("semh").checked;
  document.getElementById("fim").value=m?String(m.fim):"0";
  sel=m?m.dias.slice():[];paintDays();
  dlg.showModal();document.getElementById("farm").focus();
}
document.getElementById("add").addEventListener("click",function(){openForm(null)});
document.getElementById("cancel").addEventListener("click",function(){dlg.close()});
document.getElementById("form").addEventListener("submit",function(e){
  e.preventDefault();
  var err=document.getElementById("err"),nome=document.getElementById("farm").value.trim(),f=document.getElementById("freq").value;
  if(!nome){err.textContent="Informe o nome de farmácia do medicamento.";err.hidden=false;return}
  if(f==="sem"&&!sel.length){err.textContent="Escolha pelo menos um dia da semana.";err.hidden=false;return}
  var semh=document.getElementById("semh").checked;
  var d={nome:nome,sal:document.getElementById("incsal").checked?document.getElementById("sal").value.trim():"",
    fmt:document.getElementById("fmt").value,dos:parseFloat(document.getElementById("dos").value)||0,uni:document.getElementById("uni").value,
    freq:f,dias:f==="sem"?sel.slice():[],hor:semh?"":document.getElementById("hor").value,fim:+document.getElementById("fim").value};
  if(editing){for(var k in d)editing[k]=d[k]}else{d.id=nextId++;d.pet=pet;d.ativo=true;meds.push(d)}
  dlg.close();render();
});
render();
