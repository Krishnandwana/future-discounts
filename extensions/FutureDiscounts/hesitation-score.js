/* Convert Boost - Hesitation Score Calculator (deterministic, explainable) */
(function (global) {
  "use strict";

  var DEFAULTS = {
    k: 40,
    tauSeconds: 300,
    rollingWindowSeconds: 1800,
    exitIntentMinBaseRaw: 20,
    weights: {
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
        exitIntent: 4
      }
    },
    caps: {
      temporal: 25,
      repetition: 35,
      optimization: 25,
      navigation: 15
    }
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

  function resolveArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  }

  function applyDecay(rawH, secondsSinceLastSignal, tauSeconds) {
    if (!secondsSinceLastSignal || secondsSinceLastSignal <= 0) return rawH;
    return rawH * Math.exp(-secondsSinceLastSignal / tauSeconds);
  }

  function filterWindow(timestamps, nowMs, windowMs) {
    return resolveArray(timestamps).filter(function (ts) {
      return typeof ts === "number" && nowMs - ts <= windowMs;
    });
  }

  function countWithinWindow(timestamps, nowMs, windowMs) {
    return filterWindow(timestamps, nowMs, windowMs).length;
  }

  function hasReturnWithinWindow(timestamps, maxGapMs, nowMs, windowMs) {
    var filtered = filterWindow(timestamps, nowMs, windowMs)
      .slice()
      .sort(function (a, b) {
        return a - b;
      });
    for (var i = 1; i < filtered.length; i += 1) {
      if (filtered[i] - filtered[i - 1] <= maxGapMs) return true;
    }
    return false;
  }

  function computeEngagementGate(input, config, nowMs) {
    var windowMs = config.rollingWindowSeconds * 1000;
    var engagement = (input && input.engagement) || {};

    var cartOpenCount = engagement.cartOpenedTimestamps
      ? countWithinWindow(engagement.cartOpenedTimestamps, nowMs, windowMs)
      : engagement.cartOpenedCount || 0;
    var addToCartCount = engagement.addToCartTimestamps
      ? countWithinWindow(engagement.addToCartTimestamps, nowMs, windowMs)
      : engagement.addToCartCount || 0;
    var pdpViewCount = engagement.pdpViewTimestamps
      ? countWithinWindow(engagement.pdpViewTimestamps, nowMs, windowMs)
      : engagement.pdpViewsCount || 0;
    var infoOpenCount = engagement.intentInfoOpenTimestamps
      ? countWithinWindow(engagement.intentInfoOpenTimestamps, nowMs, windowMs)
      : engagement.intentInfoOpenCount || 0;

    var gateMet =
      cartOpenCount > 0 ||
      addToCartCount > 0 ||
      pdpViewCount >= 2 ||
      infoOpenCount > 0;

    return {
      gateMet: gateMet,
      signals: {
        cartOpenCount: cartOpenCount,
        addToCartCount: addToCartCount,
        pdpViewCount: pdpViewCount,
        infoOpenCount: infoOpenCount
      }
    };
  }

  function extractMicroPauseEvidence(temporal, nowMs, windowMs) {
    var pauseSeconds = resolveArray(temporal.microPauseSeconds);
    if (temporal.microPauseEvents) {
      pauseSeconds = filterWindow(
        temporal.microPauseEvents.map(function (e) {
          return e && typeof e.seconds === "number" ? e.seconds : null;
        }),
        nowMs,
        windowMs
      );
    }
    return pauseSeconds.reduce(function (max, s) {
      return Math.max(max, microPauseEvidence(s));
    }, 0);
  }

  function extractCartDwellEvidence(temporal, nowMs, windowMs) {
    if (temporal.cartDwellEvents) {
      var dwellSeconds = filterWindow(
        temporal.cartDwellEvents.map(function (e) {
          return e && typeof e.seconds === "number" ? e.seconds : null;
        }),
        nowMs,
        windowMs
      );
      return dwellSeconds.reduce(function (max, s) {
        return Math.max(max, cartDwellEvidence(s));
      }, 0);
    }
    return cartDwellEvidence(temporal.cartDwellSeconds || 0);
  }

  function calculateHesitationScore(input, options) {
    var config = options ? mergeDefaults(options) : DEFAULTS;
    var nowMs = (input && input.nowMs) || Date.now();
    var windowMs = config.rollingWindowSeconds * 1000;
    var gate = computeEngagementGate(input, config, nowMs);

    if (!gate.gateMet) {
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
        details: {
          gateMet: false,
          gateSignals: gate.signals
        }
      };
    }

    var temporal = (input && input.temporal) || {};
    var repetition = (input && input.repetition) || {};
    var optimization = (input && input.optimization) || {};
    var navigation = (input && input.navigation) || {};

    var microPauseMax = extractMicroPauseEvidence(temporal, nowMs, windowMs);
    var cartDwell = extractCartDwellEvidence(temporal, nowMs, windowMs);

    var cartRevisits = repetition.cartRevisitsTimestamps
      ? countEvidence(
          countWithinWindow(
            repetition.cartRevisitsTimestamps,
            nowMs,
            windowMs
          ),
          3
        )
      : countEvidence(repetition.cartRevisitsCount || 0, 3);
    var returnWithin30Min = repetition.cartVisitTimestamps
      ? booleanEvidence(
          hasReturnWithinWindow(
            repetition.cartVisitTimestamps,
            30 * 60 * 1000,
            nowMs,
            windowMs
          )
        )
      : booleanEvidence(repetition.returnWithin30Min || false);

    var variantSwitches = optimization.variantSwitchTimestamps
      ? countEvidence(
          countWithinWindow(
            optimization.variantSwitchTimestamps,
            nowMs,
            windowMs
          ),
          5
        )
      : countEvidence(optimization.variantSwitches || 0, 5);
    var couponSeeking = optimization.couponSeekTimestamps
      ? booleanEvidence(
          countWithinWindow(
            optimization.couponSeekTimestamps,
            nowMs,
            windowMs
          ) > 0
        )
      : booleanEvidence(optimization.couponSeeking || false);

    var backAndForthLoops = navigation.loopTimestamps
      ? countEvidence(
          countWithinWindow(navigation.loopTimestamps, nowMs, windowMs),
          4
        )
      : countEvidence(navigation.backAndForthLoops || 0, 4);
    var exitIntent = navigation.exitIntentTimestamps
      ? booleanEvidence(
          countWithinWindow(
            navigation.exitIntentTimestamps,
            nowMs,
            windowMs
          ) > 0
        )
      : booleanEvidence(navigation.exitIntent || false);

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
        exitIntent: exitIntent
      }
    };

    var temporalRaw =
      config.weights.temporal.microPause * evidence.temporal.microPause +
      config.weights.temporal.cartDwell * evidence.temporal.cartDwell;
    var repetitionRaw =
      config.weights.repetition.cartRevisits *
        evidence.repetition.cartRevisits +
      config.weights.repetition.returnWithin30Min *
        evidence.repetition.returnWithin30Min;
    var optimizationRaw =
      config.weights.optimization.variantSwitches *
        evidence.optimization.variantSwitches +
      config.weights.optimization.couponSeeking *
        evidence.optimization.couponSeeking;
    var navigationRawBase =
      config.weights.navigation.backAndForthLoops *
      evidence.navigation.backAndForthLoops;

    var temporalCapped = Math.min(temporalRaw, config.caps.temporal);
    var repetitionCapped = Math.min(repetitionRaw, config.caps.repetition);
    var optimizationCapped = Math.min(optimizationRaw, config.caps.optimization);
    var navigationCappedBase = Math.min(
      navigationRawBase,
      config.caps.navigation
    );

    var rawHBase =
      temporalCapped +
      repetitionCapped +
      optimizationCapped +
      navigationCappedBase;

    var exitIntentApplied =
      evidence.navigation.exitIntent > 0 &&
      rawHBase >= config.exitIntentMinBaseRaw;
    var navigationRaw = navigationRawBase;
    if (exitIntentApplied) {
      navigationRaw +=
        config.weights.navigation.exitIntent * evidence.navigation.exitIntent;
    }
    var navigationCapped = Math.min(navigationRaw, config.caps.navigation);

    var rawHBeforeDecay =
      temporalCapped + repetitionCapped + optimizationCapped + navigationCapped;
    var rawH = applyDecay(
      rawHBeforeDecay,
      input && input.secondsSinceLastSignal
        ? input.secondsSinceLastSignal
        : 0,
      config.tauSeconds
    );
    var score = 100 * (1 - Math.exp(-rawH / config.k));

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
        gateSignals: gate.signals,
        exitIntentApplied: exitIntentApplied,
        k: config.k,
        tauSeconds: config.tauSeconds
      }
    };
  }

  function mergeDefaults(overrides) {
    var merged = JSON.parse(JSON.stringify(DEFAULTS));
    if (!overrides) return merged;
    if (typeof overrides.k === "number") merged.k = overrides.k;
    if (typeof overrides.tauSeconds === "number")
      merged.tauSeconds = overrides.tauSeconds;
    if (typeof overrides.rollingWindowSeconds === "number")
      merged.rollingWindowSeconds = overrides.rollingWindowSeconds;
    if (typeof overrides.exitIntentMinBaseRaw === "number")
      merged.exitIntentMinBaseRaw = overrides.exitIntentMinBaseRaw;

    if (overrides.weights) {
      merged.weights = mergeObject(merged.weights, overrides.weights);
    }
    if (overrides.caps) {
      merged.caps = mergeObject(merged.caps, overrides.caps);
    }
    return merged;
  }

  function mergeObject(target, source) {
    var output = JSON.parse(JSON.stringify(target));
    if (!source) return output;
    Object.keys(source).forEach(function (key) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        output[key] = mergeObject(output[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
    return output;
  }

  global.convertBoostHesitationScore = {
    calculate: calculateHesitationScore,
    defaults: DEFAULTS
  };
})(window);
