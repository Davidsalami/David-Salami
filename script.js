(function(){
  const promptBtn = document.getElementById('promptBtn');
  const blowBtn = document.getElementById('blowBtn');
  const listenBtn = document.getElementById('listenBtn');
  const statusEl = document.getElementById('status');
  const candle = document.getElementById('candle');
  const flame = document.getElementById('flame');
  const smoke = document.getElementById('smoke');
  const confettiRoot = document.getElementById('confetti');

  let micStream = null;
  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let listening = false;
  let listeningTimer = null;
  let extinguished = false;

  function setStatus(s){ statusEl.textContent = s; }

  function promptMakeAWish(){
    setStatus('Make a wish...');
    // small highlight animation on flame
    flame.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:900,iterations:2});
    // enable listening briefly
    startListening(6000);
  }

  promptBtn.addEventListener('click', ()=>{
    promptMakeAWish();
  });

  blowBtn.addEventListener('click', ()=>{
    extinguish();
  });

  listenBtn.addEventListener('click', async ()=>{
    if(listening){ stopMicrophone(); return; }
    try{
      await startMicrophoneStream();
      setStatus('Mic active — blow into mic');
    }catch(err){
      console.error(err);
      setStatus('Mic error: '+(err && err.message));
    }
  });

  async function startMicrophoneStream(){
    if(audioCtx) return;
    micStream = await navigator.mediaDevices.getUserMedia({audio:true});
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.fftSize);
    listening = true;
    listenBtn.textContent = 'Stop Mic';
    monitorMic();
  }

  function stopMicrophone(){
    listening = false;
    listenBtn.textContent = 'Start Mic (optional)';
    setStatus('Idle');
    if(micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream=null; }
    if(audioCtx){ audioCtx.close(); audioCtx=null; analyser=null; }
  }

  function startListening(duration=4000){
    // temp enable mic if available
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      setStatus('Browser does not support microphone');
      return;
    }
    setStatus('Listening for blow...');
    // if mic isn't active, start it for this short listen period
    (async ()=>{
      try{
        if(!audioCtx) await startMicrophoneStream();
        if(listeningTimer) clearTimeout(listeningTimer);
        listeningTimer = setTimeout(()=>{
          if(audioCtx && !confettiRoot.dataset.extinguished) setStatus('Listening ended');
          if(!confettiRoot.dataset.extinguished && (!micStream || !audioCtx)) stopMicrophone();
        }, duration);
      }catch(err){ setStatus('Mic error'); }
    })();
  }

  function monitorMic(){
    if(!analyser) return;
    analyser.getByteTimeDomainData(dataArray);
    // compute RMS
    let sum = 0; for(let i=0;i<dataArray.length;i++){ let v=(dataArray[i]-128)/128; sum += v*v; }
    let rms = Math.sqrt(sum / dataArray.length);
    // threshold tuned experimentally — blow has higher energy
    if(rms > 0.07 && !extinguished){
      // extra guard: only extinguish if user recently clicked prompt or mic active long enough
      extinguish();
    }
    if(listening){ requestAnimationFrame(monitorMic); }
  }

  function extinguish(){
    if(extinguished) return;
    extinguished = true;
    confettiRoot.dataset.extinguished = '1';
    // candle out
    candle.classList.add('out');
    // show smoke
    smoke.classList.add('show');
    setStatus('Make a wish — Candle extinguished!');
    // create confetti
    launchConfetti(40);
    // stop mic if present
    if(listening) stopMicrophone();
  }

  function launchConfetti(n){
    const colors = ['#ffd166','#ef476f','#06d6a0','#118ab2','#ffd6a5'];
    for(let i=0;i<n;i++){
      const el = document.createElement('div');
      el.className = 'piece';
      const x = Math.random()*60 + '%';
      el.style.left = x;
      el.style.top = Math.random()*20 + '%';
      el.style.background = colors[Math.floor(Math.random()*colors.length)];
      el.style.setProperty('--dx', (Math.random()*200-100)+'px');
      el.style.animationDelay = (Math.random()*200)+'ms';
      el.style.opacity = '0';
      confettiRoot.appendChild(el);
      // reveal with small timeout so animation kicks in
      setTimeout(()=>el.style.opacity='1',20);
      // cleanup
      setTimeout(()=>el.remove(),2200);
    }
  }

  // small UX: click cake to blow too
  document.querySelector('.cake').addEventListener('click', ()=>{
    extinguish();
  });

  // graceful fallback if no mic permission available — leave controls interactive
  setStatus('Idle');
})();