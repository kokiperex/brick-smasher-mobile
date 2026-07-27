(function exposeLevels(root) {
  "use strict";

  const BLOCK_TYPES = Object.freeze({
    0: Object.freeze({ id: "empty", hitPoints: 0, breakable: false }),
    1: Object.freeze({ id: "normal", hitPoints: 1, breakable: true }),
    2: Object.freeze({ id: "reinforced", hitPoints: 2, breakable: true }),
    3: Object.freeze({ id: "armored", hitPoints: 3, breakable: true }),
    X: Object.freeze({ id: "indestructible", hitPoints: 0, breakable: false }),
    E: Object.freeze({ id: "explosive", hitPoints: 1, breakable: true }),
    M: Object.freeze({ id: "moving", hitPoints: 1, breakable: true }),
    G: Object.freeze({ id: "regenerative", hitPoints: 2, breakable: true }),
    S: Object.freeze({ id: "surprise", hitPoints: 1, breakable: true }),
    B: Object.freeze({ id: "boss", hitPoints: 12, breakable: true }),
  });

  const PALETTES = Object.freeze({
    dawn: Object.freeze(["#ff4d83", "#ff8c32", "#ffdd35", "#35e070"]),
    pulse: Object.freeze(["#8d5cff", "#36d7ff", "#35e070", "#ffdd35", "#ff647f"]),
    plasma: Object.freeze(["#ff3b74", "#ff8c32", "#ffe23b", "#39df83", "#30bfff", "#a35cff"]),
    frost: Object.freeze(["#4de8ff", "#4f8cff", "#8d5cff", "#ff5ebc", "#f2f7ff"]),
  });

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function analyzePattern(pattern) {
    const rows = pattern.length;
    const columns = Math.max(...pattern.map((row) => row.length));
    const grid = pattern.map((row) => Array.from(row.padEnd(columns, "0")));
    let breakableBlocks = 0;
    let totalResistance = 0;
    let movingBlocks = 0;
    let indestructibleBlocks = 0;
    let occupiedBlocks = 0;
    let transitions = 0;
    let possibleTransitions = 0;
    let mirrorDifferences = 0;
    let mirrorComparisons = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const symbol = grid[row][column];
        const definition = BLOCK_TYPES[symbol];
        if (!definition) {
          throw new Error(`Símbolo de bloque desconocido: ${symbol}`);
        }
        if (symbol !== "0") {
          occupiedBlocks += 1;
        }
        if (definition.breakable) {
          breakableBlocks += 1;
          totalResistance += definition.hitPoints;
        }
        if (symbol === "M") {
          movingBlocks += 1;
        }
        if (symbol === "X") {
          indestructibleBlocks += 1;
        }
        if (column + 1 < columns) {
          transitions += Number((symbol === "0") !== (grid[row][column + 1] === "0"));
          possibleTransitions += 1;
        }
        if (row + 1 < rows) {
          transitions += Number((symbol === "0") !== (grid[row + 1][column] === "0"));
          possibleTransitions += 1;
        }
        if (column < Math.floor(columns / 2)) {
          mirrorDifferences += Number(
            (symbol === "0") !== (grid[row][columns - 1 - column] === "0"),
          );
          mirrorComparisons += 1;
        }
      }
    }

    const totalCells = rows * columns;
    const emptyRatio = 1 - occupiedBlocks / totalCells;
    const transitionRatio = possibleTransitions ? transitions / possibleTransitions : 0;
    const rowVariety = new Set(pattern).size / rows;
    const balancedEmptySpace = clamp(1 - Math.abs(emptyRatio - 0.35) / 0.35, 0, 1);
    const asymmetry = mirrorComparisons ? mirrorDifferences / mirrorComparisons : 0;
    const patternComplexity = Number(
      (10 * (
        transitionRatio * 0.35
        + rowVariety * 0.20
        + balancedEmptySpace * 0.20
        + asymmetry * 0.25
      )).toFixed(2),
    );

    return {
      rows,
      columns,
      occupiedBlocks,
      breakableBlocks,
      totalResistance,
      movingBlocks,
      indestructibleBlocks,
      patternComplexity,
    };
  }

  function calculateDifficulty(level) {
    const stats = level.stats || analyzePattern(level.pattern);
    return Number((
      stats.breakableBlocks * 0.55
      + stats.totalResistance * 0.85
      + Math.max(0, level.ballSpeed - 220) * 0.11
      + Math.max(0, 100 - level.paddleWidth) * 0.70
      + stats.movingBlocks * 2.40
      + stats.indestructibleBlocks * 1.70
      + level.penaltyChance * 45
      - level.prizeChance * 28
      + stats.patternComplexity * 3
    ).toFixed(1));
  }

  function defineLevel(configuration) {
    const stats = Object.freeze(analyzePattern(configuration.pattern));
    const level = {
      ...configuration,
      colors: Object.freeze(Array.from(configuration.colors)),
      pattern: Object.freeze(Array.from(configuration.pattern)),
      stats,
      dropChance: Number((configuration.prizeChance + configuration.penaltyChance).toFixed(3)),
    };
    level.difficultyScore = calculateDifficulty(level);
    return Object.freeze(level);
  }

  const RAW_LEVELS = [
    {
      id: 1, name: "Primer pulso", ballSpeed: 235, paddleWidth: 98, maxBalls: 3,
      prizeChance: 0.18, penaltyChance: 0.01, targetDuration: 35, colors: PALETTES.dawn,
      pattern: ["11111111", "11111111", "01111110", "00111100"],
    },
    {
      id: 2, name: "Escalera solar", ballSpeed: 240, paddleWidth: 98, maxBalls: 3,
      prizeChance: 0.18, penaltyChance: 0.012, targetDuration: 38, colors: PALETTES.dawn,
      pattern: ["11000000", "11110000", "01111100", "00111111"],
    },
    {
      id: 3, name: "Puente de luz", ballSpeed: 245, paddleWidth: 97, maxBalls: 3,
      prizeChance: 0.175, penaltyChance: 0.014, targetDuration: 40, colors: PALETTES.dawn,
      pattern: ["11111111", "10000001", "01111110", "00111100"],
    },
    {
      id: 4, name: "Doble flecha", ballSpeed: 250, paddleWidth: 97, maxBalls: 3,
      prizeChance: 0.17, penaltyChance: 0.016, targetDuration: 42, colors: PALETTES.dawn,
      pattern: ["10011001", "11011011", "01111110", "00111100"],
    },
    {
      id: 5, name: "Corona ámbar", ballSpeed: 255, paddleWidth: 96, maxBalls: 3,
      prizeChance: 0.17, penaltyChance: 0.018, targetDuration: 45, colors: PALETTES.dawn,
      pattern: ["10111101", "11111111", "01111110", "11000011"],
    },
    {
      id: 6, name: "Carriles cruzados", ballSpeed: 260, paddleWidth: 96, maxBalls: 3,
      prizeChance: 0.165, penaltyChance: 0.02, targetDuration: 48, colors: PALETTES.pulse,
      pattern: ["21000012", "12100121", "01211210", "00122100"],
    },
    {
      id: 7, name: "Órbita partida", ballSpeed: 265, paddleWidth: 95, maxBalls: 3,
      prizeChance: 0.16, penaltyChance: 0.022, targetDuration: 50, colors: PALETTES.pulse,
      pattern: ["02211220", "21000012", "10111101", "01100110"],
    },
    {
      id: 8, name: "Malla turquesa", ballSpeed: 270, paddleWidth: 95, maxBalls: 3,
      prizeChance: 0.16, penaltyChance: 0.024, targetDuration: 52, colors: PALETTES.pulse,
      pattern: ["21212121", "12121212", "01111110", "00100100"],
    },
    {
      id: 9, name: "Vórtice doble", ballSpeed: 275, paddleWidth: 94, maxBalls: 3,
      prizeChance: 0.155, penaltyChance: 0.026, targetDuration: 55, colors: PALETTES.pulse,
      pattern: ["22011022", "01222210", "10100101", "01111110", "00011000"],
    },
    {
      id: 10, name: "Portal violeta", ballSpeed: 280, paddleWidth: 94, maxBalls: 3,
      prizeChance: 0.15, penaltyChance: 0.03, targetDuration: 58, colors: PALETTES.pulse,
      pattern: ["22222222", "21000012", "20111102", "21011012", "02222220"],
    },
    {
      id: 11, name: "Muralla coral", ballSpeed: 285, paddleWidth: 93, maxBalls: 4,
      prizeChance: 0.15, penaltyChance: 0.032, targetDuration: 60, colors: PALETTES.plasma,
      pattern: ["33333333", "22111122", "11000011", "01122110", "00111100"],
    },
    {
      id: 12, name: "Canal explosivo", ballSpeed: 290, paddleWidth: 93, maxBalls: 4,
      prizeChance: 0.145, penaltyChance: 0.035, targetDuration: 62, colors: PALETTES.plasma,
      pattern: ["3E3003E3", "22300322", "11222211", "01100110", "00111100"],
    },
    {
      id: 13, name: "Anillos de acero", ballSpeed: 295, paddleWidth: 92, maxBalls: 4,
      prizeChance: 0.145, penaltyChance: 0.038, targetDuration: 65, colors: PALETTES.plasma,
      pattern: ["X333333X", "32000023", "30202203", "32011023", "03X33X30"],
    },
    {
      id: 14, name: "Cometa sorpresa", ballSpeed: 300, paddleWidth: 92, maxBalls: 4,
      prizeChance: 0.14, penaltyChance: 0.04, targetDuration: 68, colors: PALETTES.plasma,
      pattern: ["S3000003", "23S00032", "123S0321", "0123S210", "00123S00", "000123S0", "33333333"],
    },
    {
      id: 15, name: "Fortaleza prisma", ballSpeed: 305, paddleWidth: 91, maxBalls: 4,
      prizeChance: 0.14, penaltyChance: 0.043, targetDuration: 70, colors: PALETTES.plasma,
      pattern: ["X3X33X3X", "33322233", "32011023", "30222203", "033XX330"],
    },
    {
      id: 16, name: "Diagonal cinética", ballSpeed: 310, paddleWidth: 91, maxBalls: 4,
      prizeChance: 0.135, penaltyChance: 0.046, targetDuration: 72, colors: PALETTES.frost,
      pattern: ["M3000003", "2M300032", "12M30321", "012MM210", "00122100", "33333333"],
    },
    {
      id: 17, name: "Péndulo neón", ballSpeed: 315, paddleWidth: 90, maxBalls: 4,
      prizeChance: 0.135, penaltyChance: 0.049, targetDuration: 75, colors: PALETTES.frost,
      pattern: ["M3M33M3M", "33322233", "20300302", "12033021", "01122110"],
    },
    {
      id: 18, name: "Espiral polar", ballSpeed: 320, paddleWidth: 90, maxBalls: 4,
      prizeChance: 0.13, penaltyChance: 0.052, targetDuration: 78, colors: PALETTES.frost,
      pattern: ["33333330", "30000030", "30222330", "30200300", "30222220", "00333300"],
    },
    {
      id: 19, name: "Cruce móvil", ballSpeed: 325, paddleWidth: 89, maxBalls: 4,
      prizeChance: 0.13, penaltyChance: 0.055, targetDuration: 80, colors: PALETTES.frost,
      pattern: ["30M22M03", "230MM032", "M223322M", "03M22M30", "00333300"],
    },
    {
      id: 20, name: "Reloj de plasma", ballSpeed: 330, paddleWidth: 89, maxBalls: 4,
      prizeChance: 0.125, penaltyChance: 0.058, targetDuration: 82, colors: PALETTES.frost,
      pattern: ["X33MM33X", "3M2002M3", "32011023", "3M2002M3", "X33MM33X", "00122100"],
    },
    {
      id: 21, name: "Colmena blindada", ballSpeed: 335, paddleWidth: 88, maxBalls: 4,
      prizeChance: 0.125, penaltyChance: 0.061, targetDuration: 85, colors: PALETTES.dawn,
      pattern: ["30330330", "03333303", "33033033", "30330330", "03333303", "00333000"],
    },
    {
      id: 22, name: "Jardín regenerativo", ballSpeed: 340, paddleWidth: 88, maxBalls: 4,
      prizeChance: 0.12, penaltyChance: 0.064, targetDuration: 88, colors: PALETTES.dawn,
      pattern: ["33G33G3G", "3G3223G3", "233GG332", "32300323", "03333330"],
    },
    {
      id: 23, name: "Tridente de hierro", ballSpeed: 345, paddleWidth: 87, maxBalls: 4,
      prizeChance: 0.12, penaltyChance: 0.067, targetDuration: 90, colors: PALETTES.dawn,
      pattern: ["33033033", "3X333X33", "30333303", "00333300", "00300300", "03300330"],
    },
    {
      id: 24, name: "Laberinto vivo", ballSpeed: 350, paddleWidth: 87, maxBalls: 4,
      prizeChance: 0.115, penaltyChance: 0.07, targetDuration: 92, colors: PALETTES.dawn,
      pattern: ["GG33333G", "G000030G", "G033G30G", "G030030G", "G033333G", "GGG00GGG"],
    },
    {
      id: 25, name: "Nexo de titanio", ballSpeed: 355, paddleWidth: 86, maxBalls: 4,
      prizeChance: 0.115, penaltyChance: 0.073, targetDuration: 95, colors: PALETTES.dawn,
      pattern: ["X3G33G3X", "33X33X33", "G333333G", "330XX033", "3G3333G3", "03333330"],
    },
    {
      id: 26, name: "Carrera magnética", ballSpeed: 360, paddleWidth: 86, maxBalls: 5,
      prizeChance: 0.11, penaltyChance: 0.076, targetDuration: 98, colors: PALETTES.pulse,
      pattern: ["M3M3M3M3", "3M3M3M3M", "23033032", "032MM230", "20300302", "03333330"],
    },
    {
      id: 27, name: "Garganta estrecha", ballSpeed: 365, paddleWidth: 85, maxBalls: 5,
      prizeChance: 0.11, penaltyChance: 0.079, targetDuration: 100, colors: PALETTES.pulse,
      pattern: ["XX3333XX", "X3M33M3X", "X333303X", "X33MM33X", "X303303X", "03333330"],
    },
    {
      id: 28, name: "Gravedad rota", ballSpeed: 370, paddleWidth: 85, maxBalls: 5,
      prizeChance: 0.105, penaltyChance: 0.082, targetDuration: 102, colors: PALETTES.pulse,
      pattern: ["M000333X", "3M0033X3", "33M03X33", "333MX333", "33X3M333", "3X330M33"],
    },
    {
      id: 29, name: "Cámara de ecos", ballSpeed: 375, paddleWidth: 84, maxBalls: 5,
      prizeChance: 0.105, penaltyChance: 0.085, targetDuration: 105, colors: PALETTES.pulse,
      pattern: ["X3M33M3X", "33X33X33", "M303303M", "33MXXM33", "303MM303", "03333330"],
    },
    {
      id: 30, name: "Tormenta vectorial", ballSpeed: 380, paddleWidth: 84, maxBalls: 5,
      prizeChance: 0.10, penaltyChance: 0.088, targetDuration: 108, colors: PALETTES.pulse,
      pattern: ["MX3M3XM3", "3M3X3M3X", "X3M3X3M3", "3X3M3X3M", "M3X3M3X3", "03333330"],
    },
    {
      id: 31, name: "Bastión escarlata", ballSpeed: 390, paddleWidth: 83, maxBalls: 5,
      prizeChance: 0.095, penaltyChance: 0.092, targetDuration: 110, colors: PALETTES.plasma,
      pattern: ["XX3333XX", "X333333X", "33X33X33", "333XX333", "33G33G33", "G333333G", "03333330"],
    },
    {
      id: 32, name: "Circuito hostil", ballSpeed: 400, paddleWidth: 82, maxBalls: 5,
      prizeChance: 0.09, penaltyChance: 0.096, targetDuration: 112, colors: PALETTES.plasma,
      pattern: ["M3X33X3M", "3G3MM3G3", "X33GG33X", "3M3003M3", "G33XX33G", "33333333", "03333330"],
    },
    {
      id: 33, name: "Prisma fracturado", ballSpeed: 410, paddleWidth: 81, maxBalls: 5,
      prizeChance: 0.085, penaltyChance: 0.10, targetDuration: 115, colors: PALETTES.plasma,
      pattern: ["3X3M0G3X", "X3G3M0X3", "3M3X3G3M", "G3X03XG3", "3G3M3X33", "33333333", "03333330"],
    },
    {
      id: 34, name: "Asedio de fotones", ballSpeed: 420, paddleWidth: 80, maxBalls: 5,
      prizeChance: 0.08, penaltyChance: 0.105, targetDuration: 118, colors: PALETTES.plasma,
      pattern: ["XMX30XMX", "M3G33G3M", "XG3033GX", "33XGGX33", "G33MM33G", "3X3333X3", "03333330"],
    },
    {
      id: 35, name: "Cúpula imposible", ballSpeed: 430, paddleWidth: 79, maxBalls: 5,
      prizeChance: 0.075, penaltyChance: 0.11, targetDuration: 120, colors: PALETTES.plasma,
      pattern: ["XXM33MXX", "XG3033GX", "M33XX33M", "330GG033", "3M3333M3", "G33MM33G", "03333330"],
    },
    {
      id: 36, name: "Falla cuántica", ballSpeed: 440, paddleWidth: 78, maxBalls: 5,
      prizeChance: 0.07, penaltyChance: 0.115, targetDuration: 122, colors: PALETTES.frost,
      pattern: ["MXG3XG3M", "3X3MG3XG", "G3M0XG3X", "XG3M30G3", "3XG3M33G", "G3XG3M3X", "03333330"],
    },
    {
      id: 37, name: "Horizonte oscuro", ballSpeed: 450, paddleWidth: 77, maxBalls: 5,
      prizeChance: 0.065, penaltyChance: 0.12, targetDuration: 125, colors: PALETTES.frost,
      pattern: ["XXX33XXX", "XG3MM3GX", "M30XX03M", "3XG33GX3", "G3MXXM3G", "X33GG33X", "03333330"],
    },
    {
      id: 38, name: "Máquina del caos", ballSpeed: 460, paddleWidth: 76, maxBalls: 5,
      prizeChance: 0.06, penaltyChance: 0.125, targetDuration: 128, colors: PALETTES.frost,
      pattern: ["MXGX3XGM", "XG3MM3GX", "G3X00X3G", "3MX33XM3", "X3GMMG3X", "GM3XX3MG", "03333330"],
    },
    {
      id: 39, name: "Umbral final", ballSpeed: 470, paddleWidth: 75, maxBalls: 5,
      prizeChance: 0.055, penaltyChance: 0.13, targetDuration: 132, colors: PALETTES.frost,
      pattern: ["XXXMMXXX", "XG3333GX", "M3XGGX3M", "3GXMMXG3", "G3MXXM3G", "X33GG33X", "3X3333X3", "03333330"],
    },
    {
      id: 40, name: "Corazón del vacío", ballSpeed: 485, paddleWidth: 74, maxBalls: 5,
      prizeChance: 0.05, penaltyChance: 0.14, targetDuration: 150, colors: PALETTES.plasma,
      pattern: ["XXX33XXX", "XG3MM3GX", "M33XX33M", "3X3BB3X3", "3X3BB3X3", "M33XX33M", "XG3MM3GX", "XXX33XXX"],
    },
  ];

  const LEVELS = Object.freeze(RAW_LEVELS.map(defineLevel));

  function countBlocks(level) {
    return analyzePattern(level.pattern).breakableBlocks;
  }

  function patternFingerprint(level) {
    return level.pattern
      .map((row) => Array.from(row, (cell) => (cell === "0" ? "0" : "1")).join(""))
      .join("|");
  }

  const api = {
    BLOCK_TYPES,
    LEVELS,
    analyzePattern,
    calculateDifficulty,
    countBlocks,
    patternFingerprint,
  };
  root.BrickSmasherLevels = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
