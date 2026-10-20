/* Meu Bolso | Sincronização opcional com Supabase.
   Sem projeto configurado, o aplicativo continua totalmente local.
   Nunca armazene service_role/secret keys neste código. */
(function(){
  "use strict";
  var cfg=window.MEU_BOLSO_SUPABASE||{};
  var ui=function(id){return document.getElementById(id);};
  var api=window.MeuBolsoLocal;
  var client=null,user=null,version=null,ready=false,blocked=false,pushing=false,timer=null;
  var sessionNonce=0,manualChoice=false;
  var liveChannel=null,liveUserId=null;
  var LAST_USER="meu-bolso-cloud-last-user";
  var META_PREFIX="meu-bolso-cloud-meta-v1:";
  var BACKUP_PREFIX="meu-bolso-cloud-recovery:";
  var blank=function(){return {transactions:[],budgets:{},houseBills:{},debts:[]};};
  function metaKey(uid){return META_PREFIX+uid;}
  function readMeta(uid){
    try{var raw=JSON.parse(localStorage.getItem(metaKey(uid))||"null");
      return raw&&typeof raw==="object"?raw:{version:null,dirty:false};
    }catch(e){return {version:null,dirty:false};}
  }
  function setMeta(uid,data){try{localStorage.setItem(metaKey(uid),JSON.stringify(data));}catch(e){}}
  function hasData(obj){
    if(!obj)return false;
    return !!((obj.transactions||[]).length||(obj.debts||[]).length||
      Object.keys(obj.budgets||{}).length||Object.keys(obj.houseBills||{}).length);
  }
  function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  function status(msg,error){
    ui("cloudStatus").textContent=msg;
    ui("cloudStatus").setAttribute("data-error",error?"true":"false");
  }
  function setVisibility(){
    ui("cloudLogin").hidden=!!user||!client;
    ui("cloudAccount").hidden=!user;
    ui("cloudActions").hidden=!user||!blocked;
    ui("cloudEmailLabel").textContent=user&&user.email?user.email:"Conta conectada";
    ui("cloudManualSync").disabled=!user||blocked||pushing||!ready;
  }
  function lockForChoice(msg){
    ready=false;blocked=true;manualChoice=true;
    setVisibility();status(msg,false);
  }
  function backupCopy(payload,tag){
    if(!hasData(payload))return;
    var key=BACKUP_PREFIX+new Date().toISOString()+":"+(user?user.id:"unknown")+":"+tag;
    try{localStorage.setItem(key,JSON.stringify(payload));}catch(e){}
  }
  async function remote(){
    var result=await client.from("meu_bolso_cloud")
      .select("payload,version").eq("user_id",user.id).maybeSingle();
    if(result.error)throw result.error;
    var row=result.data;
    return row?{payload:row.payload,version:Number(row.version)}:
      {payload:null,version:0};
  }
  function activate(v){
    version=v;ready=true;blocked=false;manualChoice=false;
    setMeta(user.id,{version:v,dirty:false});
    setVisibility();status("Sincronizado na nuvem. Alterações deste dispositivo serão enviadas automaticamente.",false);
  }
  async function pushSnapshot(expected,confirmed){
    if(pushing||!user)return false;
    pushing=true;setVisibility();
    var snapshot=api.read();
    var sentText=JSON.stringify(snapshot);
    try{
      status("Salvando suas alterações na nuvem...",false);
      var res=await client.rpc("meu_bolso_write",{
        p_expected_version:expected,
        p_payload:snapshot
      });
      if(res.error)throw res.error;
      var row=Array.isArray(res.data)?res.data[0]:res.data;
      if(!row||!row.written){
        var latest=await remote();
        version=latest.version;
        lockForChoice("Outro dispositivo alterou esses dados. Escolha qual versão manter antes de continuar.");
        return false;
      }
      version=Number(row.server_version);
      var latestLocal=api.read();
      var unchanged=same(snapshot,latestLocal);
      setMeta(user.id,{version:version,dirty:!unchanged});
      ready=true;blocked=false;manualChoice=false;
      setVisibility();
      if(unchanged){status("Tudo salvo na nuvem.",false);}
      else{status("Há mudanças mais recentes aguardando envio...",false);}
      if(!unchanged)window.setTimeout(flush,350);
      return true;
    }catch(err){
      var old=readMeta(user.id);
      setMeta(user.id,{version:old.version===null?expected:old.version,dirty:true});
      status("Sem sincronização: "+String(err.message||err)+". Seus dados permanecem neste dispositivo.",true);
      return false;
    }finally{
      pushing=false;setVisibility();
    }
  }
  async function flush(){
    if(!user||!ready||blocked||pushing||version===null)return;
    var m=readMeta(user.id);
    if(!m.dirty)return;
    // Every write uses the last version read, so a stale device cannot overwrite silently.
    await pushSnapshot(version,false);
  }
  function scheduleFlush(){
    if(timer)window.clearTimeout(timer);
    timer=window.setTimeout(flush,650);
  }
  function onLocalSave(){
    var uid=user&&user.id;
    if(!uid){try{uid=localStorage.getItem(LAST_USER);}catch(e){}}
    if(!uid)return;
    var m=readMeta(uid);
    setMeta(uid,{version:m.version,dirty:true});
    if(user&&ready&&!blocked){status("Alterações aguardando envio...",false);scheduleFlush();}
    else if(user){status("Mudança salva neste dispositivo. Resolva a sincronização para enviá-la.",true);}
  }
  function stopLive(){
    if(liveChannel&&client&&typeof client.removeChannel==="function"){
      client.removeChannel(liveChannel).catch(function(){});
    }
    liveChannel=null;liveUserId=null;
  }
  function startLive(){
    if(!user||!client||typeof client.channel!=="function")return;
    if(liveUserId===user.id&&liveChannel)return;
    stopLive();
    var uid=user.id;
    liveUserId=uid;
    liveChannel=client.channel("meu-bolso-owner-"+uid)
      .on("postgres_changes",{
        event:"*",schema:"public",table:"meu_bolso_cloud",filter:"user_id=eq."+uid
      },function(){
        if(user&&user.id===uid)refresh();
      })
      .subscribe(function(state){
        if(state==="CHANNEL_ERROR")status("Conexão ao vivo indisponível. Continuaremos verificando os dados periodicamente.",true);
      });
  }
  async function beginSession(next){
    var run=++sessionNonce;
    if(!next||!user||user.id!==next.id)stopLive();
    user=next||null;ready=false;blocked=false;manualChoice=false;
    version=null;setVisibility();
    if(!user){status(client?"Entre com seu e-mail para sincronizar com outros dispositivos.":"Sincronização não configurada.",false);return;}
    try{localStorage.setItem(LAST_USER,user.id);}catch(e){}
    status("Verificando dados da nuvem...",false);
    try{
      var server=await remote();
      if(run!==sessionNonce||!user)return;
      startLive();
      var m=readMeta(user.id);
      var local=api.read();
      if(m.version!==null){
        version=m.version;
        if(m.dirty){
          if(m.version===server.version){
            ready=true;setVisibility();scheduleFlush();return;
          }
          lockForChoice("Encontradas mudanças no dispositivo e na nuvem. Escolha qual versão usar.");
          return;
        }
        if(m.version===server.version){
          if(server.payload&&!hasData(local)){api.apply(server.payload);activate(server.version);return;}
          if(server.payload&&!same(local,server.payload)){
            lockForChoice("Os dados deste navegador diferem da nuvem. Escolha a versão que deseja manter.");
            return;
          }
          activate(server.version);return;
        }
        // No local changes since the last successful sync: use newer cloud version.
        if(server.payload){
          backupCopy(local,"before-refresh");
          api.apply(server.payload);activate(server.version);return;
        }
        if(!hasData(local)){
          activate(0);return;
        }
        lockForChoice("A nuvem está vazia, mas este dispositivo tem dados. Escolha como continuar.");
        return;
      }
      if(!server.payload){
        if(hasData(local)){
          lockForChoice("Primeiro acesso: envie seus dados deste dispositivo para começar a sincronização.");
          return;
        }
        version=0;ready=true;setVisibility();
        setMeta(user.id,{version:0,dirty:true});
        await flush();return;
      }
      if(hasData(local)&&!same(local,server.payload)){
        lockForChoice("Este dispositivo e sua conta têm registros. Selecione a cópia correta para evitar sobrescrever informações.");
        return;
      }
      if(hasData(local)&&same(local,server.payload)){activate(server.version);return;}
      api.apply(server.payload);activate(server.version);
    }catch(err){
      if(run!==sessionNonce)return;
      status("Não foi possível acessar a nuvem: "+String(err.message||err)+
        ". Confira o projeto e a tabela. Os dados locais permanecem disponíveis.",true);
    }
  }
  async function useCloud(){
    if(!user||pushing)return;
    try{
      var server=await remote();
      if(!server.payload){status("Não existem dados na nuvem. Use Enviar dados deste dispositivo.",true);return;}
      if(!window.confirm("Usar os dados da nuvem neste dispositivo? Seus dados locais atuais serão guardados em uma cópia de recuperação no navegador."))return;
      backupCopy(api.read(),"before-cloud-replace");
      api.apply(server.payload);
      activate(server.version);
    }catch(e){status("Não foi possível carregar a nuvem: "+String(e.message||e),true);}
  }
  async function useDevice(){
    if(!user||pushing)return;
    if(!window.confirm("Enviar os dados DESTE dispositivo à sua conta? Isso substituirá a versão na nuvem. Certifique-se de que ela não contém registros que você ainda precisa."))return;
    try{
      var server=await remote();
      if(server.payload)backupCopy(server.payload,"before-device-replace");
      version=server.version;
      ready=true;blocked=false;setVisibility();
      setMeta(user.id,{version:version,dirty:true});
      await flush();
    }catch(e){
      lockForChoice("Não foi possível enviar os dados. Confira sua conexão.");
      status(String(e.message||e),true);
    }
  }
  async function refresh(){
    if(!user||blocked||pushing||!ready)return;
    try{
      var server=await remote();
      var m=readMeta(user.id);
      if(m.dirty){
        if(m.version===server.version){scheduleFlush();}
        else{version=server.version;lockForChoice("Outro dispositivo alterou dados enquanto este tinha alterações pendentes.");}
        return;
      }
      if(server.version!==version){
        if(server.payload){backupCopy(api.read(),"before-refresh");api.apply(server.payload);}
        version=server.version;activate(server.version);
      }else{
        status("Dados sincronizados entre seus dispositivos.",false);
      }
    }catch(e){status("Sem conexão com a nuvem. Seus dados locais estão disponíveis.",true);}
  }
  async function requestLogin(){
    if(!client)return;
    var email=ui("cloudEmail").value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status("Digite um e-mail válido para entrar.",true);return;}
    status("Enviando link de acesso...",false);
    var result=await client.auth.signInWithOtp({
      email:email,
      options:{emailRedirectTo:window.location.origin+window.location.pathname}
    });
    if(result.error){status("Erro ao enviar e-mail: "+result.error.message,true);return;}
    status("Verifique seu e-mail e abra o link de acesso. Use o mesmo e-mail nos outros dispositivos.",false);
  }
  async function signOut(){
    var current=user;if(!client||!current)return;
    if(readMeta(current.id).dirty&&!window.confirm("Existem alterações ainda não sincronizadas. Sair agora pode impedir que elas cheguem aos outros dispositivos. Deseja sair?"))return;
    if(!window.confirm("Sair e limpar a cópia local dos dados deste navegador?"))return;
    var res=await client.auth.signOut();
    if(res.error){status("Não foi possível sair: "+res.error.message,true);return;}
    try{
      if(readMeta(current.id).dirty)backupCopy(api.read(),"before-logout-unsynced");
      localStorage.removeItem(LAST_USER);
      localStorage.removeItem(metaKey(current.id));
    }catch(e){}
    api.apply(blank());
    await beginSession(null);
    status("Sessão encerrada. Dados locais deste navegador limpos.",false);
  }
  async function start(){
    window.MeuBolsoCloud={onLocalSave:onLocalSave};
    var validUrl=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url||"");
    var key=String(cfg.publishableKey||"");
    var validKey=key.startsWith("sb_publishable_")||key.startsWith("eyJ");
    if(!validUrl||!validKey){
      ui("cloudLogin").hidden=true;
      status("A sincronização está preparada, mas falta configurar um projeto Supabase em supabase-config.js e executar supabase-schema.sql.",true);
      return;
    }
    if(!window.supabase||!window.supabase.createClient){
      ui("cloudLogin").hidden=true;
      status("Não foi possível carregar o cliente Supabase. Confira sua conexão.",true);
      return;
    }
    client=window.supabase.createClient(cfg.url,key,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    setVisibility();
    ui("cloudLoginButton").addEventListener("click",requestLogin);
    ui("cloudEmail").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();requestLogin();}});
    ui("cloudLogout").addEventListener("click",signOut);
    ui("cloudManualSync").addEventListener("click",refresh);
    ui("cloudUseCloud").addEventListener("click",useCloud);
    ui("cloudUseDevice").addEventListener("click",useDevice);
    client.auth.onAuthStateChange(function(event,session){
      if(event==="SIGNED_IN"||event==="SIGNED_OUT"||event==="USER_UPDATED"||event==="INITIAL_SESSION"){
        window.setTimeout(function(){
          var next=session&&session.user||null;
          if(!next||!user||user.id!==next.id)beginSession(next);
        },0);
      }
    });
    var result=await client.auth.getUser();
    if(result.error){status("Confira a conexão e entre novamente: "+result.error.message,true);}
    else if(result.data&&result.data.user)await beginSession(result.data.user);
    else{user=null;setVisibility();status("Entre com seu e-mail para salvar alterações em todos os dispositivos.",false);}
    document.addEventListener("visibilitychange",function(){if(!document.hidden)refresh();});
    window.setInterval(function(){if(!document.hidden)refresh();},60000);
    window.addEventListener("online",function(){if(user){if(ready)scheduleFlush();else beginSession(user);}});
  }
  start().catch(function(err){status("Falha na inicialização da nuvem: "+String(err.message||err),true);});
})();
