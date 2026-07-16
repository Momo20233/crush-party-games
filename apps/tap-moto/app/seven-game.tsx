"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drawWithoutRepeat, randomItem, secureIndex } from "./game-core";

type Phase = "rules" | "playing" | "reveal" | "penalty";
type ReactionName = "happy" | "playful" | "surprised" | "proud" | "shy";
type PenaltyCategory = "饮品" | "表演" | "真心话" | "互动";

interface CharacterReaction {
  name: ReactionName;
  caption: string;
}

interface PenaltyCard {
  id: number;
  category: PenaltyCategory;
  text: string;
  drink: boolean;
}

interface GameState {
  phase: Phase;
  dangerIndex: number;
  clicked: number[];
  leavingIndex: number | null;
  reaction: CharacterReaction | null;
  locked: boolean;
}

const TOTAL = 16;
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const assetPath = (path: string) => `${BASE_PATH}${path}`;

const REACTIONS: CharacterReaction[] = [
  { name: "happy", caption: "嘿嘿，安全！" },
  { name: "playful", caption: "略略略，不是我～" },
  { name: "surprised", caption: "哇！差一点点！" },
  { name: "proud", caption: "这都能躲过？" },
  { name: "shy", caption: "下一位要小心哦…" },
];

const PENALTIES: PenaltyCard[] = [
  { id: 1, category: "饮品", text: "喝一口你自己的饮品", drink: true },
  { id: 2, category: "饮品", text: "和左手边的人轻轻碰杯", drink: true },
  { id: 3, category: "饮品", text: "选一位朋友和你一起喝一口饮品", drink: true },
  { id: 4, category: "饮品", text: "用一句祝酒词敬大家一口", drink: true },
  { id: 5, category: "饮品", text: "把饮品当麦克风，唱一句歌", drink: false },
  { id: 6, category: "饮品", text: "大声说出今晚最开心的一件事", drink: false },
  { id: 7, category: "表演", text: "模仿一只动物10秒", drink: false },
  { id: 8, category: "表演", text: "用播音腔介绍一位在场朋友", drink: false },
  { id: 9, category: "表演", text: "做出小毛头的得意表情，保持5秒", drink: false },
  { id: 10, category: "表演", text: "哼唱一首歌，让大家猜歌名", drink: false },
  { id: 11, category: "表演", text: "走一段5秒钟的夸张模特步", drink: false },
  { id: 12, category: "表演", text: "用最严肃的语气说一个冷笑话", drink: false },
  { id: 13, category: "真心话", text: "说出你最近最想完成的一件事", drink: false },
  { id: 14, category: "真心话", text: "你第一印象反差最大的人是谁？", drink: false },
  { id: 15, category: "真心话", text: "分享一个最近的小确幸", drink: false },
  { id: 16, category: "真心话", text: "如果马上放假，你最想去哪里？", drink: false },
  { id: 17, category: "真心话", text: "说出自己一个隐藏优点", drink: false },
  { id: 18, category: "真心话", text: "你最想拥有哪种超能力？", drink: false },
  { id: 19, category: "互动", text: "和右手边的人击掌三次", drink: false },
  { id: 20, category: "互动", text: "点名一人，互相夸对方一句", drink: false },
  { id: 21, category: "互动", text: "所有人同时指向今晚最会搞气氛的人", drink: false },
  { id: 22, category: "互动", text: "选一人和你摆同款造型拍照", drink: false },
  { id: 23, category: "互动", text: "发起一轮五秒钟石头剪刀布", drink: false },
  { id: 24, category: "互动", text: "选一位玩家，一起做个夸张鬼脸", drink: false },
];

const CATEGORY_ICON: Record<PenaltyCategory, string> = {
  "饮品": "🥂",
  "表演": "🎭",
  "真心话": "💬",
  "互动": "✨",
};

function useSevenAudio(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);

  const ensureContext = useCallback(() => {
    if (!enabled || typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!contextRef.current) contextRef.current = new AudioContextClass();
    if (contextRef.current.state === "suspended") void contextRef.current.resume();
    return contextRef.current;
  }, [enabled]);

  const tone = useCallback((frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.08) => {
    const context = ensureContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, [ensureContext]);

  return {
    unlock: ensureContext,
    tap: () => tone(540, 0.055, "sine", 0.045),
    safe: () => tone(760, 0.07, "sine", 0.055),
    danger: () => { tone(120, 0.55, "sawtooth", 0.16); window.setTimeout(() => tone(76, 0.55, "square", 0.1), 100); },
    card: () => { tone(440, 0.12); window.setTimeout(() => tone(660, 0.18), 100); },
  };
}

export function SevenGame() {
  const [game, setGame] = useState<GameState>({
    phase: "playing",
    dangerIndex: -1,
    clicked: [],
    leavingIndex: null,
    reaction: null,
    locked: true,
  });
  const [soundOn, setSoundOn] = useState(true);
  const [onlyLose, setOnlyLose] = useState(false);
  const [penalty, setPenalty] = useState<PenaltyCard | null>(null);
  const [toast, setToast] = useState("");
  const [rageActive, setRageActive] = useState(false);
  const remainingPenaltyIds = useRef<number[]>([]);
  const rulesReturnPhase = useRef<"playing" | "penalty">("playing");
  const timers = useRef<number[]>([]);
  const audio = useSevenAudio(soundOn);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      const savedSound = localStorage.getItem("seven-sound");
      if (savedSound !== null) setSoundOn(savedSound === "on");
      setGame((current) => ({
        ...current,
        dangerIndex: secureIndex(TOTAL),
        locked: false,
      }));
      setToast("请第一位出手");
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      timers.current.forEach(window.clearTimeout);
    };
  }, []);

  const later = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timers.current.push(timer);
  };

  const toggleSound = () => {
    setSoundOn((current) => {
      const next = !current;
      localStorage.setItem("seven-sound", next ? "on" : "off");
      return next;
    });
  };

  const drawPenalty = useCallback(() => {
    const id = drawWithoutRepeat(PENALTIES.map((card) => card.id), remainingPenaltyIds.current);
    return PENALTIES.find((card) => card.id === id) ?? PENALTIES[0];
  }, []);

  const startGame = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    audio.unlock();
    audio.tap();
    setPenalty(null);
    setToast("轮流点一个，看看谁会惹毛小毛头");
    setRageActive(false);
    setGame({
      phase: "playing",
      dangerIndex: secureIndex(TOTAL),
      clicked: [],
      leavingIndex: null,
      reaction: null,
      locked: false,
    });
    later(() => setToast("请第一位出手"), 1800);
  };

  const openRules = () => {
    audio.unlock();
    audio.tap();
    rulesReturnPhase.current = game.phase === "penalty" ? "penalty" : "playing";
    setGame((current) => ({ ...current, phase: "rules" }));
  };

  const closeRules = () => {
    audio.tap();
    setGame((current) => ({ ...current, phase: rulesReturnPhase.current, locked: false }));
  };

  const handlePick = (index: number) => {
    if (game.locked || game.clicked.includes(index) || game.phase !== "playing") return;
    audio.unlock();

    if (index === game.dangerIndex) {
      setToast("");
      setGame((current) => ({ ...current, phase: "reveal", locked: true, leavingIndex: index }));
      later(() => {
        setRageActive(true);
        audio.danger();
        if (navigator.vibrate) navigator.vibrate([120, 60, 240]);
      }, 250);
      later(() => {
        const nextPenalty = onlyLose ? null : drawPenalty();
        setPenalty(nextPenalty);
        if (nextPenalty) audio.card();
        setGame((current) => ({ ...current, phase: "penalty", locked: false }));
      }, 1500);
      return;
    }

    const reaction = randomItem(REACTIONS);
    setToast(reaction.caption);
    setGame((current) => ({ ...current, locked: true, leavingIndex: index, reaction }));
    audio.safe();
    later(() => {
      setGame((current) => ({
        ...current,
        clicked: [...current.clicked, index],
        leavingIndex: null,
        reaction: null,
        locked: false,
      }));
      setToast("安全！下一位");
    }, 220);
  };

  const changePenalty = () => {
    const nextPenalty = drawPenalty();
    setPenalty(nextPenalty);
    audio.card();
  };

  const remaining = TOTAL - game.clicked.length;
  const tense = game.phase === "playing" && remaining <= 4;

  return (
    <main className={`game-shell ${tense ? "is-tense" : ""} ${rageActive ? "is-raging" : ""}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="neon-scribble scribble-two">⚡</div>

      {game.phase === "rules" && (
        <section className="screen rules-screen" aria-labelledby="rules-title">
          <div className="top-row rules-top">
            <button className="back-button" onClick={closeRules} aria-label="返回游戏">←</button>
            <span className="mini-logo">MOTO <b>M</b></span>
            <div className="top-actions">
              <button className="sound-button" onClick={toggleSound} aria-label={soundOn ? "关闭声音" : "开启声音"}>
                {soundOn ? "🔊" : "🔇"}
              </button>
              <a className="lobby-inline" href="../../">游戏大厅</a>
            </div>
          </div>
          <div className="rules-heading">
            <span className="crown">♕</span>
            <p>DRINK · PLAY · RULE</p>
            <h2 id="rules-title">3步开玩</h2>
          </div>
          <ol className="rules-list">
            <li><span>01</span><div><b>轮流点一个小毛头</b><p>所有人围着一台手机，每人一次。</p></div><i>☝️</i></li>
            <li><span>02</span><div><b>普通小毛头会安全离场</b><p>看看他的表情，然后把手机交给下一位。</p></div><i>✨</i></li>
            <li><span>03</span><div><b>点中暴怒小毛头就输</b><p>小心，他就藏在16个里面！</p></div><i>💥</i></li>
          </ol>
          <label className="mode-toggle">
            <span><b>随机挑战卡</b><small>关闭后只判定输家</small></span>
            <input type="checkbox" checked={!onlyLose} onChange={(event) => setOnlyLose(!event.target.checked)} />
            <i />
          </label>
          <button className="primary-button" onClick={closeRules}><span>我懂了，返回游戏</span><b>→</b></button>
        </section>
      )}

      {(game.phase === "playing" || game.phase === "reveal") && (
        <section className="screen board-screen" aria-label="小毛头游戏棋盘">
          <div className="top-row board-top">
            <a className="lobby-inline" href="../../" aria-label="返回游戏大厅">← 大厅</a>
            <div className="remaining"><small>还剩</small><strong>{remaining}</strong><small>个</small></div>
            <div className="top-actions">
              <button className="sound-button" onClick={toggleSound} aria-label={soundOn ? "关闭声音" : "开启声音"}>
                {soundOn ? "🔊" : "🔇"}
              </button>
              <button className="how-to-button" onClick={openRules} aria-label="查看玩法">怎么玩？</button>
            </div>
          </div>
          <div className="board-heading">
            <p>{tense ? "心跳加速…" : "轮到谁了？"}</p>
            <h2>{tense ? "越来越危险了" : "挑一个小毛头"}</h2>
          </div>
          <div className="board" role="group" aria-label="16个可点击的小毛头">
            {Array.from({ length: TOTAL }, (_, index) => {
              const gone = game.clicked.includes(index);
              const reacting = game.leavingIndex === index;
              const reactionName = reacting && game.phase === "playing" ? game.reaction?.name : "idle";
              return (
                <button
                  key={index}
                  className={`seven-tile ${gone ? "is-gone" : ""} ${reacting ? "is-reacting" : ""}`}
                  disabled={gone || game.locked}
                  onClick={() => handlePick(index)}
                  aria-label={gone ? `第${index + 1}个小毛头已离场` : `点击第${index + 1}个小毛头`}
                >
                  {!gone && <picture><source srcSet={assetPath(`/assets/seven-${reactionName}.webp`)} type="image/webp" /><img src={assetPath(`/assets/seven-${reactionName}.png`)} alt="" /></picture>}
                  <span className="tile-number">{String(index + 1).padStart(2, "0")}</span>
                </button>
              );
            })}
          </div>
          <div className="status-pill" role="status">{toast || "别急，慢慢选…"}</div>
          <p className="pass-phone">点完记得把手机交给下一位</p>
        </section>
      )}

      {game.phase === "reveal" && (
        <div className={`rage-overlay ${rageActive ? "active" : ""}`} role="alert">
          <div className="rage-burst">💥</div>
          <picture><source srcSet={assetPath("/assets/seven-angry.webp")} type="image/webp" /><img src={assetPath("/assets/seven-angry.png")} alt="暴怒的小毛头" /></picture>
          <p>BOOM!</p>
          <h2>你把小毛头惹毛了！</h2>
        </div>
      )}

      {game.phase === "penalty" && (
        <section className="screen penalty-screen" aria-labelledby="penalty-title">
          <div className="confetti" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <div className="top-row penalty-top">
            <a className="lobby-inline" href="../../" aria-label="返回游戏大厅">← 大厅</a>
            <button className="sound-button" onClick={toggleSound} aria-label={soundOn ? "关闭声音" : "开启声音"}>
              {soundOn ? "🔊" : "🔇"}
            </button>
          </div>
          <span className="result-label">GAME OVER</span>
          <picture className="result-character"><source srcSet={assetPath("/assets/seven-angry.webp")} type="image/webp" /><img src={assetPath("/assets/seven-angry.png")} alt="生气的小毛头" /></picture>
          <h2 id="penalty-title">这下惹毛了！</h2>
          <p className="result-subtitle">点中暴怒小毛头，这轮你输啦</p>
          {penalty ? (
            <div className="penalty-card">
              <div className="card-top"><span>{CATEGORY_ICON[penalty.category]}</span><b>{penalty.category}挑战</b><small>#{String(penalty.id).padStart(2, "0")}</small></div>
              <p>{penalty.text}</p>
              {penalty.drink && <small>可以选择任何适合自己的饮品</small>}
              <button className="shuffle-button" onClick={changePenalty}>↻ 换一张</button>
            </div>
          ) : (
            <div className="penalty-card loser-only"><span>👑</span><p>本轮只判定输家<br />惩罚由现场决定</p></div>
          )}
          <label className="simple-check"><input type="checkbox" checked={onlyLose} onChange={(event) => setOnlyLose(event.target.checked)} /> 下局仅判输，不抽挑战</label>
          <div className="result-actions">
            <button className="primary-button" onClick={startGame}><span>再来一局</span><b>↻</b></button>
            <button className="text-button result-help-button" onClick={openRules}>怎么玩？</button>
          </div>
        </section>
      )}

      <div className="rotate-notice"><span>📱</span><b>请竖起手机</b><p>竖屏玩更刺激</p></div>
    </main>
  );
}
