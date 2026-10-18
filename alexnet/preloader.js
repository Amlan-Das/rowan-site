(function(){
  var pre=document.getElementById('axPre');if(!pre)return;
  var bar=pre.querySelector('.ax-pre-bar i'),num=pre.querySelector('.ax-pre-bar b');
  var log=pre.querySelector('.ax-pre-log'),svg=pre.querySelector('.ax-pre-dr');
  var steps=['LOAD 1.2M IMAGES','CONV1 11x11 STRIDE 4','POOL + NORM','CONV2 5x5','CONV3-5 3x3','FC6 4096','FC7 4096','SOFTMAX 1000','TRAIN ON TWO GPUS','START READING'];
  var NS='http://www.w3.org/2000/svg',cols=[8,20,36,52,66,80,92,100],lines=[];
  cols.forEach(function(w,i){var x=14+i*40,h=20+Math.round(w*.9),r=document.createElementNS(NS,'rect');
    r.setAttribute('x',x);r.setAttribute('y',60-h/2);r.setAttribute('width',24);r.setAttribute('height',h);
    var L=2*(24+h);r.style.strokeDasharray=L;r.style.strokeDashoffset=L;r.dataset.l=L;svg.appendChild(r);lines.push(r);});
  steps.forEach(function(t,i){var li=document.createElement('li');li.textContent=(('00'+(i+1)).slice(-3))+' '+t;log.appendChild(li);});
  var lis=log.children,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dur=reduce?0:2600,t0=performance.now(),closed=false;
  function close(){if(closed)return;closed=true;pre.classList.add('done');document.documentElement.classList.add('ax-pre-off');setTimeout(function(){pre.remove()},800);}
  function tick(now){
    var p=dur?Math.min(1,(now-t0)/dur):1,e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
    bar.style.width=(e*100)+'%';num.style.left='calc('+(e*100)+'% - '+(e*30)+'px)';num.textContent=Math.round(e*100)+'%';
    lines.forEach(function(r,i){var q=Math.max(0,Math.min(1,e*lines.length-i));r.style.strokeDashoffset=r.dataset.l*(1-q);});
    for(var i=0;i<lis.length;i++)if(e>=(i+1)/lis.length-.05)lis[i].classList.add('on');
    if(p<1)requestAnimationFrame(tick);else setTimeout(close,reduce?0:350);
  }
  document.documentElement.style.overflow='hidden';
  var restore=function(){document.documentElement.style.overflow=''};
  new MutationObserver(function(){if(pre.classList.contains('done'))restore()}).observe(pre,{attributes:true});
  setTimeout(function(){close();restore()},6000);
  requestAnimationFrame(tick);
})();
