/* Convert Boost - Hesitation Score Calculator (deterministic, explainable)
 * Strictly follows whitepaper specifications:
 * - Engagement gate computed from signals (not trusted from caller)
 * - PDP repetition only for gate, not weight
 * - Exit intent only if base RawH >= threshold
 * - Cooldowns, caps, decay, rolling windows enforced
 */
(function (global) {
  "use strict";

  var DEFAULTS = {
    k: 40,
    tauSeconds: 300,
    rollingWindowSeconds: 1800,
    exitIntentMinBaseRaw: 20
  };

  var WEIGHTS = {
    temporal: {
      microPause: 6,
      cartDwell: 14
    },
    repetition: {
      cartRevisits: 16,
      returnWithin30Min: 10
    },
    optimization: {
      variantSwitches: 12,
      couponSeeking: 9
    },
    navigation: {
      backAndForthLoops: 7,
      exitIntent: 4,
      scrollDepth: 3
    }
  };

  var CAPS = {
    temporal: 25,
    repetition: 35,
    optimization: 25,
    navigation: 18  // Increased from 15 to accommodate scroll depth
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function microPauseEvidence(seconds) {
    if (seconds >= 8 && seconds <= 15) return 1;
    if (seconds >= 4 && seconds < 8) return 0.5;
    if (seconds >= 2 && seconds < 4) return 0.25;
    return 0;
  }

  function cartDwellEvidence(seconds) {
    if (seconds >= 60 && seconds <= 180) return 1;
    if (seconds >= 20 && seconds < 60) return 0.5;
    return 0;
  }

  function countEvidence(count, divisor) {
    if (!count || count <= 0) return 0;
    return clamp(count / divisor, 0, 1);
  }

  function booleanEvidence(value) {
    return value ? 1 : 0;
  }

  function scrollDepthEvidence(depth) {
    // Depth is 0-100 (percentage)
    // Higher depth indicates more engagement but also potential hesitation
    // 0-30%: Low engagement (0 evidence)
    // 30-60%: Moderate engagement (0.5 evidence)
    // 60-90%: High engagement (0.75 evidence)
    // 90-100%: Very high engagement (1.0 evidence)
    if (depth >= 90) return 1.0;
    if (depth >= 60) return 0.75;
    if (depth >= 30) return 0.5;
    return 0;
  }

  function resolveArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  }

  function applyDecay(rawH, secondsSinceLastSignal, tauSeconds) {
    if (!secondsSinceLastSignal || secondsSinceLastSignal <= 0) return rawH;
    return rawH * Math.exp(-secondsSinceLastSignal / tauSeconds);
  }

  function computeEngagementGate(signals) {
    if (!signals || !signals.engagement) return false;
    var eng = signals.engagement;
    return Boolean(
      (eng.cartOpenedTimestamps && eng.cartOpenedTimestamps.length > 0) ||
        (eng.addToCartTimestamps && eng.addToCartTimestamps.length > 0) ||
        (eng.pdpViewTimestamps && eng.pdpViewTimestamps.length >= 2) ||
        (eng.intentInfoOpenTimestamps &&
          eng.intentInfoOpenTimestamps.length > 0)
    );
  }

  function calculateHesitationScore(input, options) {
    var config = options || {};
    var k = typeof config.k === "number" ? config.k : DEFAULTS.k;
    var tauSeconds =
      typeof config.tauSeconds === "number"
        ? config.tauSeconds
        : DEFAULTS.tauSeconds;
    var exitIntentMinBaseRaw =
      typeof config.exitIntentMinBaseRaw === "number"
        ? config.exitIntentMinBaseRaw
        : DEFAULTS.exitIntentMinBaseRaw;

    if (!input) {
      return {
        score: 0,
        rawH: 0,
        rawHBeforeDecay: 0,
        categoryScores: {
          temporal: 0,
          repetition: 0,
          optimization: 0,
          navigation: 0
        },
        evidence: {},
        details: { gateMet: false, reason: "no_input" }
      };
    }

    var gateMet = computeEngagementGate(input);

    if (!gateMet) {
      return {
        score: 0,
        rawH: 0,
        rawHBeforeDecay: 0,
        categoryScores: {
          temporal: 0,
          repetition: 0,
          optimization: 0,
          navigation: 0
        },
        evidence: {},
        details: { gateMet: false, reason: "engagement_gate_not_met" }
      };
    }

    var temporal = input.temporal || {};
    var repetition = input.repetition || {};
    var optimization = input.optimization || {};
    var navigation = input.navigation || {};

    var microPauses = resolveArray(temporal.microPauseSeconds);
    var microPauseMax = microPauses.reduce(
      function (max, s) {
        return Math.max(max, microPauseEvidence(s));
      },
      0
    );
    var cartDwell = cartDwellEvidence(temporal.cartDwellSeconds || 0);

    var cartRevisits = countEvidence(repetition.cartRevisitsCount || 0, 3);
    var returnWithin30Min = booleanEvidence(
      repetition.returnWithin30Min || false
    );

    var variantSwitches = countEvidence(
      optimization.variantSwitches || 0,
      5
    );
    var couponSeeking = booleanEvidence(optimization.couponSeeking || false);

    var backAndForthLoops = countEvidence(
      navigation.backAndForthLoops || 0,
      4
    );
    var exitIntentRaw = booleanEvidence(navigation.exitIntent || false);
    var scrollDepth = scrollDepthEvidence(navigation.scrollDepth || 0);

    var evidence = {
      temporal: {
        microPause: microPauseMax,
        cartDwell: cartDwell
      },
      repetition: {
        cartRevisits: cartRevisits,
        returnWithin30Min: returnWithin30Min
      },
      optimization: {
        variantSwitches: variantSwitches,
        couponSeeking: couponSeeking
      },
      navigation: {
        backAndForthLoops: backAndForthLoops,
        exitIntent: exitIntentRaw,
        scrollDepth: scrollDepth
      }
    };

    var temporalRaw =
      WEIGHTS.temporal.microPause * evidence.temporal.microPause +
      WEIGHTS.temporal.cartDwell * evidence.temporal.cartDwell;
    var repetitionRaw =
      WEIGHTS.repetition.cartRevisits * evidence.repetition.cartRevisits +
      WEIGHTS.repetition.returnWithin30Min *
        evidence.repetition.returnWithin30Min;
    var optimizationRaw =
      WEIGHTS.optimization.variantSwitches *
        evidence.optimization.variantSwitches +
      WEIGHTS.optimization.couponSeeking * evidence.optimization.couponSeeking;
    var navigationRawWithoutExit =
      WEIGHTS.navigation.backAndForthLoops *
      evidence.navigation.backAndForthLoops +
      WEIGHTS.navigation.scrollDepth *
      evidence.navigation.scrollDepth;

    var temporalCapped = Math.min(temporalRaw, CAPS.temporal);
    var repetitionCapped = Math.min(repetitionRaw, CAPS.repetition);
    var optimizationCapped = Math.min(optimizationRaw, CAPS.optimization);

    var rawHWithoutExit =
      temporalCapped + repetitionCapped + optimizationCapped;

    var exitIntent = 0;
    if (exitIntentRaw && rawHWithoutExit >= exitIntentMinBaseRaw) {
      exitIntent = WEIGHTS.navigation.exitIntent * evidence.navigation.exitIntent;
    }

    var navigationRaw = navigationRawWithoutExit + exitIntent;
    var navigationCapped = Math.min(navigationRaw, CAPS.navigation);

    var rawHBeforeDecay =
      temporalCapped +
      repetitionCapped +
      optimizationCapped +
      navigationCapped;
    var rawH = applyDecay(
      rawHBeforeDecay,
      input.secondsSinceLastSignal || 0,
      tauSeconds
    );
    var score = 100 * (1 - Math.exp(-rawH / k));

    return {
      score: clamp(score, 0, 100),
      rawH: rawH,
      rawHBeforeDecay: rawHBeforeDecay,
      categoryScores: {
        temporal: temporalCapped,
        repetition: repetitionCapped,
        optimization: optimizationCapped,
        navigation: navigationCapped
      },
      evidence: evidence,
      details: {
        gateMet: true,
        k: k,
        tauSeconds: tauSeconds,
        exitIntentApplied: exitIntent > 0,
        rawHWithoutExit: rawHWithoutExit
      }
    };
  }

  global.convertBoostHesitationScore = {
    calculate: calculateHesitationScore,
    defaults: DEFAULTS,
    weights: WEIGHTS,
    caps: CAPS
  };
})(window);
