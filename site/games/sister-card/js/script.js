(function(){
  "use strict";

  /* ---------- ordinary card set ---------- */
  var RULES_DA = [
    {rank:"BLIND_POINT", zhName:"\u8499\u773c\u70b9\u6740", enName:"Blind Point", count:4},
    {rank:"BIG_SISTER", zhName:"\u5927\u59d0\u724c", enName:"Big Sister", count:4},
    {rank:"DRINK", zhName:"\u559d", enName:"Drink", count:4},
    {rank:"DUEL", zhName:"\u51b3\u6597\u724c", enName:"PVP", count:4},
    {rank:"KING_CUP", zhName:"K\u676f", enName:"King Cup", count:4},
    {rank:"IDIOT", zhName:"\u795e\u7ecf\u75c5", enName:"Idiot Card", count:2},
    {rank:"CLAP_SEVEN", zhName:"\u62cd7", enName:"Clap Seven", count:1},
    {rank:"DRINK_PASS", zhName:"\u514d\u9152\u724c", enName:"Drink Pass", count:2},
    {rank:"RESTROOM", zhName:"\u5395\u6240\u7ba1\u7406\u5458", enName:"Restroom Keeper", count:4},
    {rank:"RIGHT_DRINKS", zhName:"\u53f3\u8fb9\u559d", enName:"Right Drinks", count:4},
    {rank:"LEFT_DRINKS", zhName:"\u5de6\u8fb9\u559d", enName:"Left Drinks", count:4},
    {rank:"LITTLE_SISTER", zhName:"\u5c0f\u59d0\u724c", enName:"Little Sister", count:4},
    {rank:"THREE_GARDENS", zhName:"\u901b\u4e09\u56ed", enName:"Three Gardens", count:1},
    {rank:"MEDUSA", zhName:"\u7f8e\u675c\u838e", enName:"Medusa", count:2},
    {rank:"IRON_LOCK", zhName:"\u94c1\u9501", enName:"Iron Lock", count:2},
    {rank:"GRAB_EAR", zhName:"\u634f\u8033\u6735", enName:"Grab Ear", count:4},
    {rank:"WILD_WEST", zhName:"\u9e21\u54d4\u4f60", enName:"Wild West", count:4},
    {rank:"GROUP_DRINK", zhName:"\u559d\u9152\u724c", enName:"Solo or Group", count:4},
    {rank:"WILLOW", zhName:"\u67f3\u6811", enName:"Willow Twister", count:1}
  ];


  var CARD_ART = {
    "BLIND_POINT":"images/card-blind-point.jpg",
    "BIG_SISTER":"images/card-big-sister.jpg",
    "DRINK":"images/card-drink.jpg",
    "DUEL":"images/card-duel.jpg",
    "KING_CUP":"images/card-king-cup.jpg",
    "IDIOT":"images/card-idiot.jpg",
    "CLAP_SEVEN":"images/card-clap-seven.jpg",
    "DRINK_PASS":"images/card-drink-pass.jpg",
    "RESTROOM":"images/card-restroom.jpg",
    "RIGHT_DRINKS":"images/card-right-drinks.jpg",
    "LEFT_DRINKS":"images/card-left-drinks.jpg",
    "LITTLE_SISTER":"images/card-little-sister.jpg",
    "THREE_GARDENS":"images/card-three-gardens.jpg",
    "MEDUSA":"images/card-medusa.jpg",
    "IRON_LOCK":"images/card-iron-lock.jpg",
    "GRAB_EAR":"images/card-grab-ear.jpg",
    "WILD_WEST":"images/card-wild-west.jpg",
    "GROUP_DRINK":"images/card-group-drink.jpg",
    "WILLOW":"images/card-willow.jpg"
  };

  /* ---------- bomb cards: extra wildcard rules mixed into the ring. They
     never count toward the ordinary-card display. */
  var RULES_BOMB = [
    {key:"EVERYONE", zhName:"\u4e00\u8d77\u559d", enName:"Everyone Drinks"},
    {key:"BREAK", zhName:"\u724c\u62bd\u65ad\u4e86\u559d!", enName:"Card Break"},
    {key:"REVERSE", zhName:"\u987a\u5e8f\u53cd\u8f6c", enName:"Reverse the Circle Order"},
    {key:"TOAST", zhName:"\u6307\u5b9a\u4e24\u4eba\u4ea4\u676f", enName:"Select 2 People to Toast"}
  ];

  var BOMB_ART = {
    "EVERYONE": "images/bomb-everyone.jpg",
    "BREAK": "images/bomb-break-card.jpg",
    "REVERSE": "images/bomb-reverse.jpg",
    "TOAST": "images/bomb-toast.jpg"
  };

  var BOMB_FX = {
    "EVERYONE": {src:"animations/fx-everyone.mp4", duration:2200, soundDelay:760},
    "TOAST": {src:"animations/fx-toast.mp4", duration:2200, soundDelay:1100},
    "REVERSE": {src:"animations/fx-reverse.mp4", duration:1700, soundDelay:[120, 820]},
    "BREAK": {src:"animations/fx-break.mp4", duration:1700, soundDelay:220}
  };

  var SOUND_SRC = {
    draw:[
      "audio/card-draw-1.mp3"
    ],
    spin:[
      "audio/card-spin-place.mp3"
    ],
    bomb:{
      "EVERYONE":["audio/fx-firework.mp3"],
      "TOAST":["audio/fx-toast-clink.mp3"],
      "REVERSE":["audio/fx-reverse-whoosh.mp3"],
      "BREAK":["audio/fx-alert-pop-trim.wav"]
    }
  };

  var SUITS = ["\u2660","\u2665","\u2663","\u2666"];
  var SISTER_RANKS = {BIG_SISTER:true, LITTLE_SISTER:true};

  /* ---------- state ---------- */
  var deck = [];              /* shuffled deck, fixed slot order: [{rank,suit,rule,drawn}] */
  var pxPerCard = 76;         /* drag distance (px) that rotates the ring by one card-slot */
  var scrollPos = 0;          /* fractional slot index currently at the front of the ring */
  var cardEls = new Map();    /* card object -> {el} for every card, permanently in the DOM */
  var renderRAF = null;       /* coalesces high-frequency pointer events into one paint per frame */
  var PULL_MAX = 120;         /* px of upward drag needed to reach a full 180deg flip (responsive) */
  var PULL_COMMIT = 0.4;      /* fraction of PULL_MAX past which releasing draws the card */

  /* ---------- ring geometry (a squashed ellipse = a cylinder/drum viewed
     from a slightly raised angle) so the whole deck is visible at once,
     wrapping from a big card in front to small ones round the back ---------- */
  var RX = 140;               /* ellipse horizontal radius (responsive) */
  var RY = 60;                /* ellipse vertical radius (responsive) */
  var LIFT_FRONT = 60;        /* px the frontmost card sits above the fan-area's bottom edge */
  var MIN_SCALE = 0.62;       /* size of the farthest (back) cards, relative to the front ones */
  var MAX_SCALE = 1;
  var MIN_OPACITY = 0.5;      /* dimming of the farthest (back) cards */
  var INTERACTIVE_DEPTH = 0.12; /* only cards facing this far toward the viewer are tappable */

  var fan = document.getElementById("fan");
  var fanArea = document.getElementById("fanArea");
  var remainEl = document.getElementById("remainCount");
  var totalEl = document.getElementById("totalCount");
  var placeholder = document.getElementById("placeholder");
  var bigCard = document.getElementById("bigCard");
  var appEl = document.querySelector(".app");
  var fxOverlay = document.getElementById("fxOverlay");
  var fxVideos = Object.create(null);
  var fxReady = Object.create(null);
  var fxPending = null;
  var fxTimer = null;
  var fxLoadTimer = null;
  var drawSounds = makeSoundPool(SOUND_SRC.draw);
  var spinSounds = makeSoundPool(SOUND_SRC.spin);
  expandSoundPool(spinSounds, 4);
  var bombSounds = makeSoundMap(SOUND_SRC.bomb);
  var spinTickVoiceIndex = 0;
  var spinTickTimers = [];
  var lastSpinTickSlot = null;
  var lastSpinTickAt = 0;
  var bombSoundTimer = null;
  var activeBombSounds = [];
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function updateLayout(){
    var w = fanArea.clientWidth || 860;

    /* card size is a share of the fan-area's own (phone-frame-relative) width,
       not the raw viewport, so it stays correct inside the letterboxed app frame */
    var cwPx = Math.min(w * 0.22, 190);
    var chPx = cwPx * 1.5;
    fanArea.style.setProperty("--cw", cwPx + "px");
    /* --ch's declared value (calc(var(--cw)*1.5) on :root) is inherited as an
       already-resolved computed value, so overriding --cw here does NOT make
       descendants recompute --ch — it must be set explicitly at this scope too */
    fanArea.style.setProperty("--ch", chPx + "px");

    RX = Math.min(w * 0.42, w / 2 - 6);
    RY = chPx * 1.05;
    LIFT_FRONT = chPx / 2 + 14;
    PULL_MAX = chPx * 0.9;
    pxPerCard = cwPx * 0.4; /* lower = more sensitive: less drag distance per card-slot of spin */

    /* size the window to fit the ellipse's full vertical travel (front to
       back) plus a card's own height at the top, so nothing crops off */
    var maxLift = LIFT_FRONT + 2 * RY;
    var needed = maxLift + chPx / 2 + 24;
    var minHeight = w >= 700 ? 340 : 300;
    var maxHeight = w >= 700 ? 520 : 480;
    fanArea.style.height = Math.min(Math.max(needed, minHeight), maxHeight) + "px";
  }

  function makeSoundPool(urls){
    var pool = [];
    for(var i = 0; i < urls.length; i++){
      var audio = new Audio(urls[i]);
      audio.preload = "auto";
      audio.volume = 0.78;
      pool.push(audio);
    }
    return pool;
  }

  function expandSoundPool(pool, size){
    if(!pool.length) return pool;
    var src = pool[0].currentSrc || pool[0].src;
    while(pool.length < size){
      var audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = pool[0].volume;
      pool.push(audio);
    }
    return pool;
  }

  function makeSoundMap(source){
    var map = {};
    for(var key in source){
      if(Object.prototype.hasOwnProperty.call(source, key)){
        map[key] = makeSoundPool(source[key]);
      }
    }
    return map;
  }

  function playOneShot(pool, volume){
    if(!pool || pool.length === 0) return;
    var audio = pool[Math.floor(Math.random() * pool.length)];
    try{
      audio.pause();
      audio.currentTime = 0;
      audio.volume = typeof volume === "number" ? volume : 0.78;
      var playPromise = audio.play();
      if(playPromise && playPromise.catch) playPromise.catch(function(){});
    }catch(e){}
    return audio;
  }

  function playDrawSound(){
    playOneShot(drawSounds, 0.78);
  }

  function playBombSound(key){
    var audio = playOneShot(bombSounds[key], key === "TOAST" ? 0.72 : 0.82);
    if(audio) activeBombSounds.push(audio);
  }

  function stopBombSounds(){
    for(var i = 0; i < activeBombSounds.length; i++){
      try{
        activeBombSounds[i].pause();
        activeBombSounds[i].currentTime = 0;
      }catch(e){}
    }
    activeBombSounds = [];
  }

  function clearBombSoundTimer(){
    if(bombSoundTimer){
      if(Array.isArray(bombSoundTimer)){
        for(var i = 0; i < bombSoundTimer.length; i++){
          clearTimeout(bombSoundTimer[i]);
        }
      }else{
        clearTimeout(bombSoundTimer);
      }
      bombSoundTimer = null;
    }
  }

  function scheduleBombSound(key, delay){
    clearBombSoundTimer();
    var delays = Array.isArray(delay) ? delay : [delay || 0];
    bombSoundTimer = [];
    for(var i = 0; i < delays.length; i++){
      bombSoundTimer.push(setTimeout(function(){
        playBombSound(key);
        if(Array.isArray(bombSoundTimer)){
          bombSoundTimer.shift();
          if(bombSoundTimer.length === 0) bombSoundTimer = null;
        }
      }, delays[i]));
    }
  }

  function stopSpinSound(){
    for(var i = 0; i < spinTickTimers.length; i++){
      clearTimeout(spinTickTimers[i]);
    }
    spinTickTimers = [];
    for(var j = 0; j < spinSounds.length; j++){
      try{
        spinSounds[j].pause();
        spinSounds[j].currentTime = 0;
      }catch(e){}
    }
    lastSpinTickSlot = null;
    lastSpinTickAt = 0;
  }

  function playSpinTick(force){
    if(!spinSounds.length) return;
    var slot = Math.round(scrollPos);
    var now = performance.now();
    if(!force && slot === lastSpinTickSlot) return;
    if(!force && now - lastSpinTickAt < 55) return;
    lastSpinTickSlot = slot;
    lastSpinTickAt = now;

    var audio = spinSounds[spinTickVoiceIndex % spinSounds.length];
    spinTickVoiceIndex += 1;
    try{
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.42;
      audio.playbackRate = 1.85;
      var playPromise = audio.play();
      if(playPromise && playPromise.catch) playPromise.catch(function(){});
      spinTickTimers.push(setTimeout(function(){
        try{
          audio.pause();
          audio.currentTime = 0;
        }catch(e){}
      }, 82));
    }catch(e){}
  }

  function shuffled(arr){
    var a = arr.slice();
    for(var i = a.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function fullDeck(){
    var rules = RULES_DA;
    var d = [];
    for(var r = 0; r < rules.length; r++){
      var copies = rules[r].count;
      for(var s = 0; s < copies; s++){
        d.push({rank:rules[r].rank, suit:SUITS[s % SUITS.length], rule:rules[r]});
      }
    }
    return d;
  }

  function isSisterCard(card){
    return !!(card && SISTER_RANKS[card.rank]);
  }

  function distributedOrdinaryDeck(){
    var all = fullDeck();
    var sistersByRank = {BIG_SISTER:[], LITTLE_SISTER:[]};
    var others = [];
    var i;

    for(i = 0; i < all.length; i++){
      if(isSisterCard(all[i])) sistersByRank[all[i].rank].push(all[i]);
      else others.push(all[i]);
    }

    sistersByRank.BIG_SISTER = shuffled(sistersByRank.BIG_SISTER);
    sistersByRank.LITTLE_SISTER = shuffled(sistersByRank.LITTLE_SISTER);
    others = shuffled(others);

    /* Most rounds keep one of each sister card in every broad quarter.
       A small share uses wider bands and may allow a neighboring pair. */
    var playful = Math.random() < 0.24;
    var closePairRank = Math.random() < 0.027
      ? (Math.random() < 0.5 ? "BIG_SISTER" : "LITTLE_SISTER")
      : null;
    var closePairMade = false;
    var bands = playful
      ? [[0,11], [7,27], [20,44], [36,58]]
      : [[0,7], [10,21], [24,39], [42,58]];
    var slots = new Array(all.length);

    function placeCard(card, band){
      var candidates = [];
      var allowAdjacent = playful && Math.random() < 0.18;
      var start = Math.max(0, band[0]);
      var end = Math.min(slots.length - 1, band[1]);
      var index;

      if(card.rank === closePairRank && !closePairMade){
        var firstIndex = -1;
        for(index = 0; index < slots.length; index++){
          if(slots[index] && slots[index].rank === card.rank){ firstIndex = index; break; }
        }
        if(firstIndex >= 0){
          var near = [firstIndex - 1, firstIndex + 1, firstIndex - 2, firstIndex + 2];
          for(index = 0; index < near.length; index++){
            if(near[index] >= 0 && near[index] < slots.length && !slots[near[index]]){
              slots[near[index]] = card;
              closePairMade = true;
              return;
            }
          }
        }
      }

      for(index = start; index <= end; index++){
        if(slots[index]) continue;
        if(!allowAdjacent && (isSisterCard(slots[index - 1]) || isSisterCard(slots[index + 1]))) continue;
        if((slots[index - 2] && slots[index - 2].rank === card.rank) ||
           (slots[index - 1] && slots[index - 1].rank === card.rank) ||
           (slots[index + 1] && slots[index + 1].rank === card.rank) ||
           (slots[index + 2] && slots[index + 2].rank === card.rank)) continue;
        candidates.push(index);
      }
      if(!candidates.length){
        for(index = start; index <= end; index++){
          if(!slots[index]) candidates.push(index);
        }
      }
      slots[candidates[Math.floor(Math.random() * candidates.length)]] = card;
    }

    for(i = 0; i < bands.length; i++){
      var pair = shuffled([
        sistersByRank.BIG_SISTER[i],
        sistersByRank.LITTLE_SISTER[i]
      ]);
      placeCard(pair[0], bands[i]);
      placeCard(pair[1], bands[i]);
    }

    var otherIndex = 0;
    for(i = 0; i < slots.length; i++){
      if(!slots[i]) slots[i] = others[otherIndex++];
    }
    return slots;
  }

  /* Every bomb type appears once or twice per round. */
  function bombDeck(){
    var d = [];
    for(var i = 0; i < RULES_BOMB.length; i++){
      var count = 1 + Math.floor(Math.random() * 2);
      for(var k = 0; k < count; k++){
        d.push({isBomb:true, key:RULES_BOMB[i].key, rule:RULES_BOMB[i]});
      }
    }
    return d;
  }

  function deckWithSeparatedBombs(){
    var ordinary = distributedOrdinaryDeck();
    var bombs = shuffled(bombDeck());
    var gaps = [];
    var bombAtGap = Object.create(null);
    var mixed = [];

    for(var i = 0; i < ordinary.length; i++) gaps.push(i);
    gaps = shuffled(gaps).slice(0, bombs.length);
    for(var b = 0; b < bombs.length; b++) bombAtGap[gaps[b]] = bombs[b];

    /* At most one bomb is placed after each ordinary card. This also keeps
       the first and last cards separated when the ring wraps around. */
    for(var j = 0; j < ordinary.length; j++){
      mixed.push(ordinary[j]);
      if(bombAtGap[j]) mixed.push(bombAtGap[j]);
    }

    return mixed;
  }

  function wrapScroll(v){
    var n = deck.length;
    if(n <= 0) return 0;
    v = v % n;
    return v < 0 ? v + n : v;
  }

  function settleScroll(v){
    return wrapScroll(Math.round(v));
  }

  function getOrCreateEl(c){
    var entry = cardEls.get(c);
    if(entry) return entry.el;
    var el = document.createElement("div");
    el.className = "fan-card";
    el.innerHTML = '<div class="cover"></div>';
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "-1");
    el.setAttribute("aria-label", "抽一张牌");
    el._card = c;
    el.addEventListener("keydown", function(e){
      if((e.key === "Enter" || e.key === " ") && el.tabIndex === 0){
        e.preventDefault();
        drawCard(c);
      }
    });
    fan.appendChild(el);
    cardEls.set(c, {el:el});
    return el;
  }

  function cancelScheduledRender(){
    if(renderRAF){
      cancelAnimationFrame(renderRAF);
      renderRAF = null;
    }
  }

  function scheduleSpreadRender(){
    if(renderRAF) return;
    renderRAF = requestAnimationFrame(function(){
      renderRAF = null;
      renderSpread();
    });
  }

  /* ---------- ring rendering ---------- */
  /* every card in the deck keeps a fixed slot around the ellipse; rotating
     the ring (scrollPos) just changes which slot faces the front. So the
     whole deck is always visible at once, and a drawn card's slot simply
     goes empty rather than the ring closing up around it. */
  function renderSpread(){
    var n = deck.length;
    if(n === 0) return;
    scrollPos = wrapScroll(scrollPos);
    var thetaStep = (2 * Math.PI) / n;

    for(var i = 0; i < n; i++){
      var c = deck[i];
      var el = getOrCreateEl(c);
      var theta = (i - scrollPos) * thetaStep;
      var depth = Math.cos(theta);              /* 1 = front (closest), -1 = back (farthest) */
      var x = RX * Math.sin(theta);
      var y = RY * depth;
      var lift = LIFT_FRONT + (RY - y);
      var scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * ((depth + 1) / 2);
      /* a drawn card keeps its slot on the ring (so it never closes up) but
         renders face-away and invisible, leaving a visible empty gap behind */
      var flip = c.drawn ? " rotateY(180deg)" : "";
      el.style.transform =
        "translate3d(" + x.toFixed(2) + "px,-" + lift.toFixed(2) + "px,0) scale(" + scale.toFixed(3) + ")" + flip;
      el.style.zIndex = String(Math.round(depth * 1000));
      var opacity = c.drawn ? 0 : (MIN_OPACITY + (1 - MIN_OPACITY) * ((depth + 1) / 2));
      el.style.opacity = String(opacity);
      var interactive = !c.drawn && depth > INTERACTIVE_DEPTH;
      el.style.pointerEvents = interactive ? "" : "none";
      el.tabIndex = interactive ? 0 : -1;
      if(interactive) el.removeAttribute("aria-hidden");
      else el.setAttribute("aria-hidden", "true");
    }
  }

  function buildDeck(){
    stopMomentum(); /* cancel any still-coasting spin so it can't fight the rebuilt deck */
    cancelScheduledRender();
    /* Fresh random order every round, with one ordinary card between any
       two bomb cards. */
    deck = deckWithSeparatedBombs();
    scrollPos = 0;
    cardEls.forEach(function(entry){ entry.el.remove(); });
    cardEls.clear();
    renderSpread();
    updateRemain();
    hideBig();
  }

  function updateRemain(){
    var remaining = 0;
    var total = 0;
    for(var i = 0; i < deck.length; i++){
      if(!deck[i].isBomb){
        total++;
        if(!deck[i].drawn) remaining++;
      }
    }
    remainEl.textContent = remaining;
    totalEl.textContent = total;
  }

  /* ---------- reveal ---------- */
  function stopFx(){
    clearBombSoundTimer();
    stopBombSounds();
    fxPending = null;
    if(fxLoadTimer){
      clearTimeout(fxLoadTimer);
      fxLoadTimer = null;
    }
    if(fxTimer){
      clearTimeout(fxTimer);
      fxTimer = null;
    }
    if(fxOverlay){
      fxOverlay.classList.remove("show");
      fxOverlay.setAttribute("aria-hidden", "true");
    }
    if(appEl) appEl.classList.remove("fx-running");
    for(var key in fxVideos){
      if(!Object.prototype.hasOwnProperty.call(fxVideos, key)) continue;
      fxVideos[key].pause();
      fxVideos[key].classList.remove("active");
    }
  }

  function startBombFx(key, fx, done){
    var video = fxVideos[key];
    if(!video) return done();
    fxPending = null;
    if(fxLoadTimer){
      clearTimeout(fxLoadTimer);
      fxLoadTimer = null;
    }
    video.pause();
    video.currentTime = 0;
    video.classList.add("active");
    if(appEl) appEl.classList.add("fx-running");
    fxOverlay.classList.add("show");
    fxOverlay.setAttribute("aria-hidden", "false");
    var playPromise = video.play();
    if(playPromise && playPromise.catch) playPromise.catch(function(){});
    scheduleBombSound(key, fx.soundDelay || 0);
    fxTimer = setTimeout(function(){
      fxTimer = null;
      video.pause();
      stopBombSounds();
      video.classList.remove("active");
      fxOverlay.classList.remove("show");
      fxOverlay.setAttribute("aria-hidden", "true");
      if(appEl) appEl.classList.remove("fx-running");
      done();
    }, fx.duration);
  }

  function finishPendingFxWithoutVideo(key){
    if(!fxPending || fxPending.key !== key) return;
    var done = fxPending.done;
    fxPending = null;
    if(fxLoadTimer){
      clearTimeout(fxLoadTimer);
      fxLoadTimer = null;
    }
    done();
  }

  function playBombFx(c, done){
    var fx = c && c.isBomb ? BOMB_FX[c.key] : null;
    if(reduceMotion || !fx || !fxOverlay || !fxVideos[c.key]){
      done();
      return;
    }
    stopFx();
    if(fxReady[c.key]){
      startBombFx(c.key, fx, done);
    }else{
      fxPending = {key:c.key, fx:fx, done:done};
      fxVideos[c.key].preload = "auto";
      fxLoadTimer = setTimeout(function(){
        fxLoadTimer = null;
        finishPendingFxWithoutVideo(c.key);
      }, 5000);
      fxVideos[c.key].load();
    }
  }

  function prepareFxVideos(){
    if(reduceMotion) return;
    var videos = document.querySelectorAll(".fx-video");

    function markReady(video){
      var key = video.getAttribute("data-fx-key");
      if(!key) return;
      fxReady[key] = true;
      if(fxPending && fxPending.key === key){
        var pending = fxPending;
        startBombFx(key, pending.fx, pending.done);
      }
    }

    for(var i = 0; i < videos.length; i++){
      var video = videos[i];
      var key = video.getAttribute("data-fx-key");
      if(!key) continue;
      fxVideos[key] = video;
      video.muted = true;
      video.playsInline = true;
      video.addEventListener("canplay", (function(readyVideo){
        return function(){ markReady(readyVideo); };
      })(video));
      video.addEventListener("error", (function(errorKey){
        return function(){ finishPendingFxWithoutVideo(errorKey); };
      })(key));
      if(video.readyState >= 2) markReady(video);
    }
  }

  function showBig(c){
    var title = c.rule.enName + " " + c.rule.zhName;
    var artEl = document.getElementById("bArt");
    artEl.src = c.isBomb ? (BOMB_ART[c.key] || "") : (CARD_ART[c.rank] || "");
    artEl.alt = title;
    placeholder.style.display = "none";
    bigCard.classList.remove("in");
    /* restart the deal animation */
    void bigCard.offsetWidth;
    bigCard.classList.add("in");
    bigCard.setAttribute("aria-label", title);
  }

  function hideBig(){
    stopFx();
    bigCard.classList.remove("in");
    placeholder.style.display = "flex";
  }

  function drawCard(c){
    if(c.drawn) return;
    stopMomentum();
    cancelScheduledRender();
    playDrawSound();
    c.drawn = true;
    renderSpread();
    updateRemain();
    if(c.isBomb){
      playBombFx(c, function(){ showBig(c); });
    }else{
      showBig(c);
    }
  }

  bigCard.addEventListener("click", hideBig);
  bigCard.addEventListener("keydown", function(e){
    if(e.key === "Enter" || e.key === " "){ e.preventDefault(); hideBig(); }
  });

  /* ---------- drag / slide / tap / hold-and-slide-up-to-flip ---------- */
  var gestureActive = false;
  var dragging = false;
  var pulling = false;
  var startX = 0, startY = 0, startScrollPos = 0, startTime = 0;
  var targetCard = null;
  var pullEl = null, pullBaseTransform = "";
  var dragSide = null;   /* "left" | "right" | null, decided at pointerdown from where on the ring it started */
  var dragAxis = null;   /* "x" | "y", locked in once the gesture is classified as a drag */

  /* the ring is a drum rotating about a vertical-ish axis: at the front/back
     (top and bottom of the ellipse) a card's motion is horizontal, but at
     the sides it's vertical — so a drag started near either side should
     spin the ring by its vertical movement instead of horizontal */
  var SIDE_ZONE = 0.3; /* outer 30% of fan-area's width on each side counts as a "side" start */

  /* ---------- roulette-style momentum: a flick keeps spinning the ring and
     glides to a stop instead of snapping the instant you let go ---------- */
  var velocity = 0;          /* smoothed px/ms of "delta" at release, used to seed the coast */
  var lastSampleTime = 0;
  var lastSampleDelta = 0;
  var momentumRAF = null;
  var MOMENTUM_FRICTION = 0.0028; /* higher = the spin dies down sooner */
  var MOMENTUM_MIN_VEL = 0.00025; /* slots/ms below which we stop coasting and settle */

  function stopMomentum(){
    if(momentumRAF){ cancelAnimationFrame(momentumRAF); momentumRAF = null; }
    stopSpinSound();
  }

  function startMomentum(slotVel){
    stopMomentum();
    function finish(){
      momentumRAF = null;
      fan.classList.remove("dragging");
      scrollPos = settleScroll(scrollPos);
      cancelScheduledRender();
      renderSpread();
      stopSpinSound();
    }
    if(Math.abs(slotVel) < MOMENTUM_MIN_VEL){
      finish();
      return;
    }
    if(reduceMotion){
      finish();
      return;
    }
    playSpinTick(true);
    var lastT = performance.now();
    function step(now){
      var dt = Math.min(now - lastT, 48); /* guard against a huge jump after e.g. a tab switch */
      lastT = now;
      scrollPos += slotVel * dt;
      slotVel *= Math.exp(-MOMENTUM_FRICTION * dt); /* framerate-independent decay */
      scrollPos = wrapScroll(scrollPos);
      playSpinTick(false);
      renderSpread();
      if(Math.abs(slotVel) < MOMENTUM_MIN_VEL){
        finish();
        return;
      }
      momentumRAF = requestAnimationFrame(step);
    }
    momentumRAF = requestAnimationFrame(step);
  }

  fanArea.addEventListener("pointerdown", function(e){
    stopMomentum(); /* grabbing a still-coasting wheel interrupts the spin right where it is */
    gestureActive = true;
    dragging = false;
    pulling = false;
    startX = e.clientX; startY = e.clientY;
    startScrollPos = scrollPos;
    startTime = performance.now();
    velocity = 0;
    lastSampleTime = 0;
    lastSampleDelta = 0;
    var hit = e.target.closest ? e.target.closest(".fan-card") : null;
    targetCard = hit ? hit._card : null;
    pullEl = hit;
    dragAxis = null;
    var faRect = fanArea.getBoundingClientRect();
    var relX = faRect.width ? (startX - faRect.left) / faRect.width : 0.5;
    dragSide = relX < SIDE_ZONE ? "left" : (relX > 1 - SIDE_ZONE ? "right" : null);
    fanArea.setPointerCapture && fanArea.setPointerCapture(e.pointerId);
  });

  fanArea.addEventListener("pointermove", function(e){
    if(!gestureActive) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if(!dragging && !pulling){
      /* pull-to-flip is a front-card gesture, so it's the one exception that
         needs an actual card under the finger; every other drag spins the
         ring — like one continuous, gapless invisible cylinder — no matter
         whether it starts on a card or over an empty gap in the spread */
      if(!dragSide && pullEl && dy < 0 && Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)){
        pulling = true;
        pullBaseTransform = pullEl.style.transform;
        pullEl.classList.add("pulling");
      }else if(Math.abs(dx) > 6 && Math.abs(dx) >= Math.abs(dy)){
        dragging = true;
        dragAxis = "x";
        fan.classList.add("dragging");
        playSpinTick(true);
      }else if(Math.abs(dy) > 6){
        dragging = true;
        dragAxis = "y";
        fan.classList.add("dragging");
        playSpinTick(true);
      }else{
        return;
      }
    }
    if(pulling){
      var lift = Math.min(Math.max(-dy, 0), PULL_MAX);
      var progress = lift / PULL_MAX;
      pullEl.style.transform =
        "perspective(700px) " + pullBaseTransform +
        " translateY(-" + lift + "px) rotateY(" + (progress * 180) + "deg)";
      return;
    }
    /* on the right side, dragging down should spin the ring the same way
       dragging left does at the front (and dragging up on the left side is
       that same rotation direction too) — flip dy's sign only for "right" */
    var delta = dragAxis === "y" ? (dragSide === "right" ? -dy : dy) : dx;
    scrollPos = wrapScroll(startScrollPos - delta / pxPerCard);
    playSpinTick(false);
    scheduleSpreadRender();

    /* track how fast "delta" is currently moving, smoothed a little so one
       noisy sample right at release doesn't fling the wheel unrealistically */
    var now = performance.now();
    if(lastSampleTime){
      var dtSample = now - lastSampleTime;
      if(dtSample > 0){
        var instVel = (delta - lastSampleDelta) / dtSample;
        velocity = velocity * 0.7 + instVel * 0.3;
      }
    }
    lastSampleTime = now;
    lastSampleDelta = delta;
  });

  function endGesture(e){
    if(!gestureActive) return;
    var dt = performance.now() - startTime;
    if(pulling){
      stopSpinSound();
      cancelScheduledRender();
      var dy = (e && typeof e.clientY === "number") ? (e.clientY - startY) : 0;
      var progress = Math.min(Math.max(-dy, 0), PULL_MAX) / PULL_MAX;
      pullEl.classList.remove("pulling");
      if(progress >= PULL_COMMIT){
        drawCard(targetCard);
      }else{
        pullEl.style.transform = pullBaseTransform;
      }
    }else if(dragging){
      /* if the finger sat still for a moment right before lifting, the last
         sampled velocity is stale — treat that as a deliberate stop, not a
         flick, so pausing before release always snaps immediately */
      var heldStill = lastSampleTime && (performance.now() - lastSampleTime) > 80;
      /* d(scrollPos)/dt = -velocity/pxPerCard, matching the sign convention
         pointermove uses above — releasing mid-flick keeps that direction
         going and lets it glide down like a roulette wheel, not stop dead */
      if(heldStill){
        stopSpinSound();
        startMomentum(0);
      }else{
        startMomentum(-velocity / pxPerCard);
      }
    }else if(targetCard && dt < 600){
      drawCard(targetCard);
    }
    gestureActive = false;
    dragging = false;
    pulling = false;
    pullEl = null;
    targetCard = null;
    dragSide = null;
    dragAxis = null;
  }
  fanArea.addEventListener("pointerup", endGesture);
  fanArea.addEventListener("pointercancel", function(){
    fan.classList.remove("dragging");
    stopSpinSound();
    cancelScheduledRender();
    if(pullEl){
      pullEl.classList.remove("pulling");
      pullEl.style.transform = pullBaseTransform;
    }
    gestureActive = false;
    dragging = false;
    pulling = false;
    pullEl = null;
    targetCard = null;
    dragSide = null;
    dragAxis = null;
  });

  /* keyboard: left/right slide the spread by one card */
  fanArea.setAttribute("tabindex", "0");
  fanArea.setAttribute("role", "group");
  fanArea.setAttribute("aria-label", "牌堆：拖动或使用左右方向键浏览，点击或上拉一张牌进行抽取");
  fanArea.addEventListener("keydown", function(e){
    if(e.key === "ArrowLeft" || e.key === "ArrowRight"){
      e.preventDefault();
      scrollPos = wrapScroll(scrollPos + (e.key === "ArrowLeft" ? -1 : 1));
      renderSpread();
    }
  });

  /* ---------- shuffle ---------- */
  document.getElementById("shuffleBtn").addEventListener("click", buildDeck);

  function stopTransientPlayback(){
    stopSpinSound();
    clearBombSoundTimer();
    stopBombSounds();
  }

  window.addEventListener("blur", stopTransientPlayback);
  window.addEventListener("pagehide", stopTransientPlayback);
  document.addEventListener("visibilitychange", function(){
    if(document.hidden) stopTransientPlayback();
  });

  /* ---------- go ---------- */
  prepareFxVideos();
  updateLayout();
  buildDeck();
  warmImages();
  warmSounds();

  var resizeTimer = null;
  window.addEventListener("resize", function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){
      updateLayout();
      cancelScheduledRender();
      renderSpread();
    }, 120);
  });

  function warmImages(){
    var urls = [];
    var key;
    for(key in CARD_ART){
      if(Object.prototype.hasOwnProperty.call(CARD_ART, key)) urls.push(CARD_ART[key]);
    }
    for(key in BOMB_ART){
      if(Object.prototype.hasOwnProperty.call(BOMB_ART, key)) urls.push(BOMB_ART[key]);
    }
    var run = function(){
      for(var i = 0; i < urls.length; i++){
        if(!urls[i]) continue;
        var img = new Image();
        img.decoding = "async";
        img.src = urls[i];
        if(img.decode) img.decode().catch(function(){});
      }
    };
    if("requestIdleCallback" in window){
      window.requestIdleCallback(run, {timeout:1200});
    }else{
      setTimeout(run, 300);
    }
  }

  function warmSounds(){
    warmSoundPool(drawSounds);
    warmSoundPool(spinSounds);
    for(var key in bombSounds){
      if(Object.prototype.hasOwnProperty.call(bombSounds, key)){
        warmSoundPool(bombSounds[key]);
      }
    }
  }

  function warmSoundPool(pool){
    for(var i = 0; i < pool.length; i++){
      try{ pool[i].load(); }catch(e){}
    }
  }
})();
