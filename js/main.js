(function(){
  function el(id){return document.getElementById(id)}

  /* スマホのメニュー開閉 */
  var list=el('gnav-list'),btn=el('menu-btn');
  if(btn&&list){
    btn.addEventListener('click',function(){
      var open=list.classList.toggle('is-open');
      btn.setAttribute('aria-expanded',open?'true':'false');
    });
  }

  /* 名刺をお持ちの方（ページをまたいで、押した順番を覚えておく） */
  var hsOrder=['haizara','tabako','hyosatsu'];
  function getStep(){try{return parseInt(sessionStorage.getItem('hsStep')||'0',10)||0}catch(e){return window.__hsStep||0}}
  function setStep(n){try{sessionStorage.setItem('hsStep',String(n))}catch(e){window.__hsStep=n}}
  [].slice.call(document.querySelectorAll('[data-hs]')).forEach(function(h){
    h.addEventListener('click',function(){
      var k=h.getAttribute('data-hs'),step=getStep();
      if(k===hsOrder[step]){step++;}
      else{step=(k===hsOrder[0])?1:0;}
      if(step===hsOrder.length&&el('ura')){
        setStep(0);
        document.body.classList.add('ura-on');window.scrollTo(0,0);
      }else{
        setStep(step);
      }
    });
  });
  var uraForm=el('ura-form');
  if(uraForm){
    uraForm.addEventListener('submit',function(e){
      e.preventDefault();
      var m=el('ura-msg');
      var ok=['u-name','u-tel','u-body'].every(function(i){return el(i).value.trim()});
      m.textContent=ok?'送信は行われていません。このサイトは架空のもので、連絡を受け取る先がありません。':'名前、連絡先、用件をすべて書いてください。';
      m.hidden=false;
    });
  }

  /* ページ内の項目へ移動 */
  [].slice.call(document.querySelectorAll('[data-jump]')).forEach(function(b){
    b.addEventListener('click',function(){
      var t=el(b.getAttribute('data-jump'));
      if(t) t.scrollIntoView({block:'start'});
    });
  });

  /* ご相談フォーム：入力→確認→結果（送信はしない） */
  var form=el('soudan');
  if(!form) return;
  var boxInput=el('form-input');
  var boxConfirm=el('form-confirm');
  var boxDone=el('form-done');
  var errsum=el('errsum');
  function how(){var r=form.querySelector('input[name="how"]:checked');return r?r.value:''}
  function setErr(key,field,msg){
    var p=el('e-'+key);
    if(msg){p.textContent=msg;p.hidden=false;if(field){field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby','e-'+key)}}
    else{p.textContent='';p.hidden=true;if(field){field.removeAttribute('aria-invalid')}}
    return !!msg;
  }
  function syncHow(){
    var h=how();
    el('h-tel').textContent=(h==='メール')?'任意':'必須';
    el('h-tel').className=(h==='メール')?'nini':'hissu';
    el('h-mail').textContent=(h==='電話')?'任意':'必須';
    el('h-mail').className=(h==='電話')?'nini':'hissu';
  }
  [].slice.call(form.querySelectorAll('input[name="how"]')).forEach(function(r){r.addEventListener('change',syncHow)});

  function validate(){
    var firstBad=null,n=0;
    function bad(key,field,msg){if(setErr(key,field,msg)){n++;if(!firstBad)firstBad=field}}
    bad('kind',el('f-kind'),el('f-kind').value?'':'ご相談の種類を選んでください。');
    bad('name',el('f-name'),el('f-name').value.trim()?'':'お名前を入力してください。仮のお名前で構いません。');
    var h=how();
    bad('how',el('f-how-tel'),h?'':'電話かメールか、ご連絡の方法を選んでください。');
    el('f-how-tel').removeAttribute('aria-invalid');
    var tel=el('f-tel').value.trim(),mail=el('f-mail').value.trim();
    var telMsg='';
    if(h!=='メール' && !tel) telMsg='電話番号を入力してください。';
    else if(tel && !/^[0-9０-９+\-ー－() ]{9,16}$/.test(tel)) telMsg='電話番号は数字とハイフンで入力してください。例：090-1234-5678';
    bad('tel',el('f-tel'),telMsg);
    var mailMsg='';
    if(h!=='電話' && !mail) mailMsg='メールアドレスを入力してください。';
    else if(mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) mailMsg='メールアドレスの形が正しくないようです。例：name@example.com';
    bad('mail',el('f-mail'),mailMsg);
    bad('body',el('f-body'),el('f-body').value.trim()?'':'ご相談の内容を、一行でも構いませんので入力してください。');
    bad('agree',el('f-agree'),el('f-agree').checked?'':'個人情報の取り扱いをお読みのうえ、同意の欄に印を付けてください。');
    if(n){errsum.textContent='入力に不足が '+n+' か所あります。赤い字のところをご確認ください。';errsum.hidden=false;if(firstBad)firstBad.focus()}
    else{errsum.hidden=true}
    return n===0;
  }
  function row(k,v){
    var tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');
    th.scope='row';th.textContent=k;td.textContent=v||'（未記入）';tr.appendChild(th);tr.appendChild(td);return tr;
  }
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(!validate()) return;
    var times=[].slice.call(form.querySelectorAll('input[name="time"]:checked')).map(function(c){return c.value}).join('、');
    var tb=el('confirm-body');tb.textContent='';
    tb.appendChild(row('ご相談の種類',el('f-kind').value));
    tb.appendChild(row('お急ぎ',el('f-isogi').checked?'急いでいる':'急ぎではない'));
    tb.appendChild(row('お名前',el('f-name').value.trim()));
    tb.appendChild(row('ご連絡の方法',how()));
    tb.appendChild(row('電話番号',el('f-tel').value.trim()));
    tb.appendChild(row('メールアドレス',el('f-mail').value.trim()));
    tb.appendChild(row('ご連絡してよい時間帯',times||'指定なし'));
    tb.appendChild(row('ご相談の内容',el('f-body').value.trim()));
    boxInput.hidden=true;boxConfirm.hidden=false;boxDone.hidden=true;
    el('confirm-h').focus();window.scrollTo(0,0);
  });
  el('btn-back').addEventListener('click',function(){
    boxConfirm.hidden=true;boxInput.hidden=false;el('f-kind').focus();
  });
  el('btn-send').addEventListener('click',function(){
    boxConfirm.hidden=true;boxDone.hidden=false;el('done-h').focus();window.scrollTo(0,0);
  });
  el('btn-reset').addEventListener('click',function(){
    form.reset();syncHow();errsum.hidden=true;
    ['kind','name','how','tel','mail','body','agree'].forEach(function(k){setErr(k,null,'')});
    [].slice.call(form.querySelectorAll('[aria-invalid]')).forEach(function(f){f.removeAttribute('aria-invalid')});
    boxDone.hidden=true;boxInput.hidden=false;
  });
})();
