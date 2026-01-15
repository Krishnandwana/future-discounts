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
      couponSeeking: 9,
      cartQuantityChanges: 10  // Moderate weight - changing cart quantity indicates hesitation
    },
    navigation: {
      backAndForthLoops: 7,
      exitIntent: 4,
      scrollDepth: 3  // Weak indicator - deep scrolling is supplementary signal
    }
  };

  var CAPS = {
    temporal: 25,
    repetition: 35,
    optimization: 30,  // Increased to accommodate cart quantity changes
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

  function scrollDepthEvidence(depth, hasConflictSignal) {
    // Depth is 0-100 (percentage)
    // Scroll depth is engagement/information consumption, not uniquely hesitation
    // It only becomes hesitation when paired with conflict signals
    // (variantSwitches, cartDwell, cartRevisits, backAndForthLoops)
    if (!hasConflictSignal) return 0;  // No contribution without conflict
    
    // 0-20%: Low engagement (0 evidence)
    // 20-50%: Moderate engagement (0.4 evidence)
    // 50-70%: High engagement (0.7 evidence)
    // 70-85%: Very high engagement (0.9 evidence)
    // 85-100%: Deep exploration (1.0 evidence)
    if (depth >= 85) return 1.0;
    if (depth >= 70) return 0.9;
    if (depth >= 50) return 0.7;
    if (depth >= 20) return 0.4;
    return 0;
  }

  function resolveArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  }

  function applyDecay(rawH, secondsSinceLastSignal, tauSeconds, baseRawH) {
    // Decay applies when user is INACTIVE (no meaningful actions)
    // This prevents "tab left open / phone call / interruption" from keeping high score
    // Decay starts after 2 minutes of inactivity, regardless of whether they left the site
    
    var INACTIVITY_GRACE_PERIOD = 120; // 2 minutes grace period before decay starts
    
    if (!secondsSinceLastSignal || secondsSinceLastSignal <= INACTIVITY_GRACE_PERIOD) {
      return rawH; // No decay during active browsing or short inactivity
    }
    
    // Apply decay only to time beyond grace period
    var decayTime = secondsSinceLastSignal - INACTIVITY_GRACE_PERIOD;
    // Use tau for half-life calculation (default 5 minutes = 300s)
    var decayed = rawH * Math.exp(-decayTime / tauSeconds);
    
    // Set a minimum floor - never let score decay below 10% of original base
    var minRawH = (baseRawH || rawH) * 0.1;
    return Math.max(decayed, minRawH);
  }

  function computeEngagementGate(signals) {
    if (!signals || !signals.engagement) return false;
    var eng = signals.engagement;
    
    // Gate requires explicit purchase intent signals, NOT just scrolling
    // Deep scroll is engagement/info consumption, not purchase intent
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

    var variantSwitchCount = optimization.variantSwitches || 0;
    var variantSwitches = countEvidence(variantSwitchCount, 5);
    var couponSeeking = booleanEvidence(optimization.couponSeeking || false);
    var cartQuantityChanges = countEvidence(optimization.cartQuantityChanges || 0, 2);
    
    // Debug logging
    if (variantSwitchCount > 0) {
      console.log('[HesitationScore] 🔍 Variant switches:', {
        count: variantSwitchCount,
        evidence: variantSwitches,
        points: (variantSwitches * WEIGHTS.optimization.variantSwitches).toFixed(2)
      });
    }
    if ((optimization.cartQuantityChanges || 0) > 0) {
      console.log('[HesitationScore] 🔍 Cart quantity changes:', {
        count: optimization.cartQuantityChanges,
        evidence: cartQuantityChanges,
        points: (cartQuantityChanges * WEIGHTS.optimization.cartQuantityChanges).toFixed(2)
      });
    }

    var backAndForthLoops = countEvidence(
      navigation.backAndForthLoops || 0,
      4
    );
    var exitIntentRaw = booleanEvidence(navigation.exitIntent || false);
    
    // Scroll depth only contributes if there's at least one conflict signal
    // Conflict signals indicate decision-making struggle, not just reading
    var hasConflictSignal = (
      variantSwitchCount > 0 ||
      (temporal.cartDwellSeconds || 0) > 0 ||
      (repetition.cartRevisitsCount || 0) > 0 ||
      (navigation.backAndForthLoops || 0) > 0
    );
    var scrollDepth = scrollDepthEvidence(navigation.scrollDepth || 0, hasConflictSignal);

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
        couponSeeking: couponSeeking,
        cartQuantityChanges: cartQuantityChanges
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
      WEIGHTS.optimization.couponSeeking * evidence.optimization.couponSeeking +
      WEIGHTS.optimization.cartQuantityChanges *
        evidence.optimization.cartQuantityChanges;
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
    
    // Debug logging for category scores (after all are computed)
    console.log('[HesitationScore] 📊 Category Scores:', {
      temporal: temporalCapped.toFixed(2) + '/' + CAPS.temporal,
      repetition: repetitionCapped.toFixed(2) + '/' + CAPS.repetition,
      optimization: optimizationCapped.toFixed(2) + '/' + CAPS.optimization + ' (variants: ' + variantSwitchCount + ')',
      navigation: navigationCapped.toFixed(2) + '/' + CAPS.navigation + ' (scroll: ' + (navigation.scrollDepth || 0) + '%, conflict: ' + hasConflictSignal + ')'
    });

    var rawHBeforeDecay =
      temporalCapped +
      repetitionCapped +
      optimizationCapped +
      navigationCapped;
    
    // Store the base score before decay for minimum floor calculation
    var baseRawH = rawHBeforeDecay;
    
    var rawH = applyDecay(
      rawHBeforeDecay,
      input.secondsSinceLastSignal || 0,
      tauSeconds,
      baseRawH  // Pass base for minimum floor
    );
    var score = 100 * (1 - Math.exp(-rawH / k));
    
    // Ensure score never goes below a reasonable minimum if there was any hesitation
    // If rawHBeforeDecay was > 0, maintain at least 5% of the original score
    if (baseRawH > 0 && score < 5) {
      var minScore = 100 * (1 - Math.exp(-(baseRawH * 0.05) / k));
      score = Math.max(score, minScore);
      rawH = Math.max(rawH, baseRawH * 0.05);
    }

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
