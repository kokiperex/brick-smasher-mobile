(function exposeEffectCatalog(root) {
  "use strict";

  const EFFECTS = Object.freeze([
    Object.freeze({
      id: "sticky",
      type: "prize",
      name: "Bola pegajosa",
      icon: "P",
      duration: 12,
      incompatible: [],
      behavior: Object.freeze({ kind: "sticky" }),
    }),
    Object.freeze({
      id: "wide",
      type: "prize",
      name: "Plataforma grande",
      icon: "G",
      duration: 12,
      incompatible: ["small"],
      behavior: Object.freeze({ kind: "paddle-width", width: 122 }),
    }),
    Object.freeze({
      id: "multiball",
      type: "prize",
      name: "Multibola",
      icon: "3",
      duration: 0,
      incompatible: [],
      behavior: Object.freeze({ kind: "multiball" }),
    }),
    Object.freeze({
      id: "shooting",
      type: "prize",
      name: "Disparos",
      icon: "D",
      duration: 10,
      incompatible: [],
      behavior: Object.freeze({ kind: "shooting" }),
    }),
    Object.freeze({
      id: "slow",
      type: "prize",
      name: "Bola lenta",
      icon: "L",
      duration: 10,
      incompatible: ["fast"],
      behavior: Object.freeze({ kind: "ball-speed", multiplier: 0.72 }),
    }),
    Object.freeze({
      id: "small",
      type: "penalty",
      name: "Plataforma pequeña",
      icon: "p",
      duration: 10,
      incompatible: ["wide"],
      exclusiveGroup: "penalty",
      behavior: Object.freeze({ kind: "paddle-width", width: 58 }),
    }),
    Object.freeze({
      id: "fast",
      type: "penalty",
      name: "Aceleración",
      icon: "A",
      duration: 8,
      incompatible: ["slow"],
      exclusiveGroup: "penalty",
      behavior: Object.freeze({ kind: "ball-speed", multiplier: 1.35 }),
    }),
    Object.freeze({
      id: "inverted",
      type: "penalty",
      name: "Controles invertidos",
      icon: "↔",
      duration: 8,
      incompatible: [],
      exclusiveGroup: "penalty",
      behavior: Object.freeze({ kind: "inverted-controls" }),
    }),
    Object.freeze({
      id: "darkness",
      type: "penalty",
      name: "Oscuridad",
      icon: "O",
      duration: 6,
      incompatible: [],
      exclusiveGroup: "penalty",
      behavior: Object.freeze({ kind: "darkness" }),
    }),
    Object.freeze({
      id: "slippery",
      type: "penalty",
      name: "Plataforma resbaladiza",
      icon: "R",
      duration: 8,
      incompatible: [],
      exclusiveGroup: "penalty",
      behavior: Object.freeze({ kind: "slippery-paddle" }),
    }),
  ]);

  const effectMap = new Map(EFFECTS.map((effect) => [effect.id, effect]));

  const LIFE_REWARD = Object.freeze({
    id: "life",
    type: "life",
    name: "Vida extra",
    icon: "♥",
    duration: 0,
    behavior: Object.freeze({ kind: "extra-life" }),
  });

  function get(id) {
    return effectMap.get(id) || (id === LIFE_REWARD.id ? LIFE_REWARD : null);
  }

  function randomId(random = Math.random, type = null) {
    const candidates = type
      ? EFFECTS.filter((effect) => effect.type === type)
      : EFFECTS;
    if (candidates.length === 0) {
      return null;
    }
    return candidates[Math.floor(random() * candidates.length)].id;
  }

  const api = { EFFECTS, LIFE_REWARD, get, randomId };
  root.EffectCatalog = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
