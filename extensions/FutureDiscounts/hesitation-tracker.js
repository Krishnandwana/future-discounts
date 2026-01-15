/* Convert Boost - Hesitation Event Tracker (first-party, deterministic) */
(function (global) {
  "use strict";

  var STORAGE_KEY = "convertBoostHesitationEvents";
  var DEFAULTS = {
    rollingWindowSeconds: 1800,
    cooldowns: {
      exitIntentSeconds: 45,
      variantSwitchSeconds: 2,
      loopSeconds: 5,
      couponSeekSeconds: 30
    },
    loopBackWindowSeconds: 300,
    microPauseMinSeconds: 2,
    microPauseMaxSeconds: 15
  };

  function nowMs() {
    return Date.now();
  }

  function safeJSONParse(value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  }

  function loadEvents() {
    var stored = sessionStorage.getItem(STORAGE_KEY);
    var parsed = safeJSONParse(stored);
    return Array.isArray(parsed) ? parsed : [];
  }

  function saveEvents(events) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {}
  }

  function pruneEvents(events, windowMs) {
    var now = nowMs();
    // Keep events from the last 2x the rolling window (60 minutes) to ensure we don't lose recent events
    // The actual scoring window is 30 minutes, but we keep 60 minutes of data
    return events.filter(function (event) {
      return now - event.ts <= windowMs * 2;
    });
  }

  function getPageType(pathname) {
    if (pathname.indexOf("/products/") !== -1) return "pdp";
    if (pathname.indexOf("/collections/") !== -1) return "collection";
    if (pathname.indexOf("/cart") !== -1) return "cart";
    if (pathname.indexOf("/search") !== -1) return "search";
    if (pathname.indexOf("/pages/") !== -1) return "page";
    if (pathname.indexOf("/account") !== -1) return "account";
    return "other";
  }

  function createTracker(configOverrides) {
    var config = mergeDefaults(configOverrides);
    var state = {
      events: pruneEvents(
        loadEvents(),
        config.rollingWindowSeconds * 1000
      ),
      lastMeaningfulActionAt: null,
      lastExitIntentAt: 0,
      lastVariantSwitchAt: 0,
      lastLoopAt: 0,
      lastCouponSeekAt: 0,
      cartOpenAt: null,
      cartProgressed: false,
      pageHistory: [],
      maxScrollDepth: 0,
      lastScoreUpdate: 0,
      userLeftSite: false,
      lastPageLeaveTime: null
    };

    var updateScoreCallback = null;
    
    function recordEvent(type, data) {
      var timestamp = nowMs();
      var eventData = data || {};
      var event = {
        type: type,
        ts: timestamp,
        data: eventData
      };
      state.events.push(event);
      state.events = pruneEvents(
        state.events,
        config.rollingWindowSeconds * 1000
      );
      saveEvents(state.events);
      
      // Console logging for debugging
      var timeStr = new Date(timestamp).toLocaleTimeString();
      var dataStr = Object.keys(eventData).length > 0 
        ? JSON.stringify(eventData) 
        : '';
      console.log(
        '[HesitationTracker] 📊 Event Recorded:',
        type,
        dataStr ? '| Data: ' + dataStr : '',
        '| Time: ' + timeStr,
        '| Total Events: ' + state.events.length
      );
      
      // Trigger score update if callback is set (debounced)
      if (updateScoreCallback && nowMs() - state.lastScoreUpdate >= 1000) {
        setTimeout(updateScoreCallback, 100);
      }
    }

    function recordMeaningfulAction(actionType) {
      var now = nowMs();
      if (state.lastMeaningfulActionAt) {
        var deltaSeconds = (now - state.lastMeaningfulActionAt) / 1000;
        if (
          deltaSeconds >= config.microPauseMinSeconds &&
          deltaSeconds <= config.microPauseMaxSeconds
        ) {
          recordEvent("micro_pause", { seconds: deltaSeconds });
        } else if (deltaSeconds > config.microPauseMaxSeconds) {
          console.log('[HesitationTracker] ⏭️ Micro pause skipped (duration: ' + deltaSeconds.toFixed(2) + 's, outside range ' + config.microPauseMinSeconds + '-' + config.microPauseMaxSeconds + 's)');
        }
      }
      state.lastMeaningfulActionAt = now;
      recordEvent("meaningful_action", { action: actionType });
    }

    function openCart(reason) {
      if (!state.cartOpenAt) {
        state.cartOpenAt = nowMs();
        state.cartProgressed = false;
        recordEvent("cart_open", { reason: reason || "unknown" });
        recordMeaningfulAction("cart_open");
      }
    }

    function progressCart(reason) {
      if (state.cartOpenAt) {
        state.cartProgressed = true;
        recordEvent("cart_progress", { reason: reason || "unknown" });
      }
    }

    function closeCart(reason) {
      if (!state.cartOpenAt) return;
      var durationSeconds = (nowMs() - state.cartOpenAt) / 1000;
      if (!state.cartProgressed && durationSeconds >= 1) {
        recordEvent("cart_dwell", {
          seconds: durationSeconds,
          reason: reason || "unknown"
        });
      }
      recordEvent("cart_close", { reason: reason || "unknown" });
      state.cartOpenAt = null;
      state.cartProgressed = false;
    }

    function trackExitIntent(event) {
      var now = nowMs();
      if (now - state.lastExitIntentAt < config.cooldowns.exitIntentSeconds * 1000) {
        var remainingCooldown = Math.ceil((config.cooldowns.exitIntentSeconds * 1000 - (now - state.lastExitIntentAt)) / 1000);
        console.log('[HesitationTracker] ⏳ Exit intent skipped (cooldown: ' + remainingCooldown + 's remaining)');
        return;
      }
      if (event && typeof event.clientY === "number" && event.clientY > 0) {
        console.log('[HesitationTracker] ⏭️ Exit intent skipped (mouse not at top)');
        return;
      }
      state.lastExitIntentAt = now;
      recordEvent("exit_intent", {});
    }

    function trackVariantSwitch() {
      var now = nowMs();
      if (
        now - state.lastVariantSwitchAt <
        config.cooldowns.variantSwitchSeconds * 1000
      ) {
        var remainingCooldown = Math.ceil((config.cooldowns.variantSwitchSeconds * 1000 - (now - state.lastVariantSwitchAt)) / 1000);
        console.log('[HesitationTracker] ⏳ Variant switch skipped (cooldown: ' + remainingCooldown + 's remaining)');
        return;
      }
      state.lastVariantSwitchAt = now;
      recordEvent("variant_switch", {});
      recordMeaningfulAction("variant_switch");
    }

    function trackCouponSeek(reason) {
      var now = nowMs();
      if (
        now - state.lastCouponSeekAt <
        config.cooldowns.couponSeekSeconds * 1000
      ) {
        var remainingCooldown = Math.ceil((config.cooldowns.couponSeekSeconds * 1000 - (now - state.lastCouponSeekAt)) / 1000);
        console.log('[HesitationTracker] ⏳ Coupon seek skipped (cooldown: ' + remainingCooldown + 's remaining)');
        return;
      }
      state.lastCouponSeekAt = now;
      recordEvent("coupon_seek", { reason: reason || "unknown" });
      recordMeaningfulAction("coupon_seek");
    }

    function handleNavigationChange() {
      var currentType = getPageType(window.location.pathname);
      var now = nowMs();
      state.pageHistory.push({ type: currentType, ts: now });
      state.pageHistory = state.pageHistory.slice(-5);

      var len = state.pageHistory.length;
      if (len >= 3) {
        var a = state.pageHistory[len - 3];
        var b = state.pageHistory[len - 2];
        var c = state.pageHistory[len - 1];
        var loopWindowMs = config.loopBackWindowSeconds * 1000;
        if (
          a.type === c.type &&
          a.type !== b.type &&
          c.ts - a.ts <= loopWindowMs
        ) {
          var cooldownMs = config.cooldowns.loopSeconds * 1000;
          if (now - state.lastLoopAt >= cooldownMs) {
            state.lastLoopAt = now;
            recordEvent("back_and_forth_loop", {
              from: a.type,
              through: b.type
            });
          } else {
            var remainingCooldown = Math.ceil((cooldownMs - (now - state.lastLoopAt)) / 1000);
            console.log('[HesitationTracker] ⏳ Navigation loop skipped (cooldown: ' + remainingCooldown + 's remaining)');
          }
        }
      }

      // Reset scroll depth on page change
      state.maxScrollDepth = 0;
      
      if (currentType === "pdp") {
        recordEvent("pdp_view", { path: window.location.pathname });
        recordMeaningfulAction("pdp_view");
      }
      if (currentType === "cart") {
        openCart("navigation");
      } else {
        closeCart("page_leave");
      }

      if (
        window.location.pathname.indexOf("sale") !== -1 ||
        window.location.pathname.indexOf("offers") !== -1 ||
        window.location.pathname.indexOf("discount") !== -1
      ) {
        recordEvent("offers_page_view", { path: window.location.pathname });
        trackCouponSeek("offers_page");
      }
    }

    function handleClick(event) {
      var target = event.target;
      if (!target || !target.closest) return;

      var addToCart = target.closest(
        'form[action*="/cart/add"] button[type="submit"], [name="add"], [data-action="add-to-cart"], .add-to-cart'
      );
      if (addToCart) {
        recordEvent("add_to_cart", {});
        recordMeaningfulAction("add_to_cart");
      }

      var cartTrigger = target.closest(
        '[href*="/cart"], [data-cart-toggle], .cart, .cart-icon, .cart-button, [aria-controls*="cart"]'
      );
      if (cartTrigger) {
        openCart("click");
      }

      var cartClose = target.closest(
        "[data-cart-close], .cart-close, .drawer-close, .cart-drawer__close, [aria-label*=\"close\"][aria-controls*=\"cart\"], .close-cart"
      );
      if (cartClose) {
        closeCart("cart_close");
      }

      var checkout = target.closest(
        'form[action*="/checkout"] button[type="submit"], [name="checkout"], [href*="/checkout"], [data-checkout]'
      );
      if (checkout) {
        progressCart("checkout_start");
        recordEvent("checkout_start", {});
        recordMeaningfulAction("checkout_start");
      }

      var reviews = target.closest(
        '[href*="#reviews"], [data-reviews], [aria-controls*="reviews"], .reviews'
      );
      if (reviews) {
        recordEvent("reviews_open", {});
        recordMeaningfulAction("reviews_open");
      }

      var sizeGuide = target.closest(
        '[href*="size"], [data-size-guide], [data-size]'
      );
      if (sizeGuide) {
        recordEvent("size_guide_open", {});
        recordMeaningfulAction("size_guide_open");
      }

      var returns = target.closest('[href*="return"], [data-returns]');
      if (returns) {
        recordEvent("returns_open", {});
        recordMeaningfulAction("returns_open");
      }

      var shipping = target.closest('[href*="shipping"], [data-shipping]');
      if (shipping) {
        recordEvent("shipping_open", {});
        recordMeaningfulAction("shipping_open");
      }
    }

    function handleChange(event) {
      var target = event.target;
      if (!target || !target.closest) return;

      var variant = target.closest(
        '[data-product-option], select[name*="options"], .single-option-selector, [data-index="option"], .product-form__controls-group select, .variant-input-wrap input, .swatch input[type="radio"], .product-form__input input[type="radio"], [data-variant-selector]'
      );
      if (variant) {
        trackVariantSwitch();
      }

      var quantity = target.closest(
        'input[name*="quantity"], [data-quantity], .cart-quantity'
      );
      if (quantity) {
        progressCart("quantity_change");
        recordEvent("cart_quantity_change", {});
        recordMeaningfulAction("cart_quantity_change");
      }
    }

    function handleFocusIn(event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var coupon = target.closest(
        'input[name*="discount"], input[id*="discount"], input[name*="coupon"], input[id*="coupon"], input[name*="promo"], input[id*="promo"], input[name*="gift"], input[id*="gift"]'
      );
      if (coupon) {
        trackCouponSeek("coupon_focus");
      }
    }

    function registerHistoryListeners() {
      var pushState = history.pushState;
      var replaceState = history.replaceState;
      history.pushState = function () {
        var result = pushState.apply(this, arguments);
        handleNavigationChange();
        return result;
      };
      history.replaceState = function () {
        var result = replaceState.apply(this, arguments);
        handleNavigationChange();
        return result;
      };
      window.addEventListener("popstate", handleNavigationChange);
    }

    function trackScrollDepth() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var documentHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      var windowHeight = window.innerHeight || document.documentElement.clientHeight;
      var scrollDepth = documentHeight > 0 
        ? Math.round(((scrollTop + windowHeight) / documentHeight) * 100) 
        : 0;
      
      if (scrollDepth > state.maxScrollDepth) {
        state.maxScrollDepth = scrollDepth;
        recordEvent("scroll_depth", { 
          depth: scrollDepth,
          scrollTop: scrollTop,
          documentHeight: documentHeight
        });
      }
    }

    function updateScoreInStorage() {
      if (!global.convertBoostHesitationScore) return;
      
      var score = getScore();
      if (!score) return;
      
      var now = nowMs();
      // Update at most once per 2 seconds to reduce rapid fluctuations
      if (now - state.lastScoreUpdate < 2000) return;
      state.lastScoreUpdate = now;
      
      // Get desired threshold from localStorage or use default
      var desiredThreshold = 50; // Default threshold
      try {
        var stored = localStorage.getItem("convertBoostHesitationThreshold");
        if (stored) {
          var parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            desiredThreshold = parsed;
          }
        }
      } catch (e) {
        console.warn('[HesitationTracker] Failed to read threshold from localStorage', e);
      }
      
      var scoreData = {
        currentScore: Math.round(score.score * 100) / 100,
        desiredThreshold: desiredThreshold,
        shouldShowPopup: score.score >= desiredThreshold,
        rawH: Math.round(score.rawH * 100) / 100,
        engagementGateMet: score.details.gateMet,
        timestamp: now,
        categoryScores: {
          temporal: Math.round(score.categoryScores.temporal * 100) / 100,
          repetition: Math.round(score.categoryScores.repetition * 100) / 100,
          optimization: Math.round(score.categoryScores.optimization * 100) / 100,
          navigation: Math.round(score.categoryScores.navigation * 100) / 100
        }
      };
      
      try {
        localStorage.setItem("convertBoostHesitationScore", JSON.stringify(scoreData));
        console.log('[HesitationTracker] 💾 Score updated in localStorage:', {
          current: scoreData.currentScore,
          threshold: scoreData.desiredThreshold,
          shouldShow: scoreData.shouldShowPopup ? '✅ YES' : '❌ NO'
        });
      } catch (e) {
        console.warn('[HesitationTracker] Failed to save score to localStorage', e);
      }
    }

    function init() {
      console.log('[HesitationTracker] 🚀 Initializing hesitation tracker...');
      console.log('[HesitationTracker] 📋 Configuration:', {
        rollingWindowSeconds: config.rollingWindowSeconds,
        cooldowns: config.cooldowns,
        microPauseRange: config.microPauseMinSeconds + '-' + config.microPauseMaxSeconds + 's'
      });
      console.log('[HesitationTracker] 📊 Loaded ' + state.events.length + ' existing events from storage');
      
      document.addEventListener("click", handleClick);
      document.addEventListener("change", handleChange);
      document.addEventListener("focusin", handleFocusIn);
      document.addEventListener("mouseleave", trackExitIntent);
      document.addEventListener("scroll", trackScrollDepth, { passive: true });
      // Track when user leaves the site
      window.addEventListener("beforeunload", function () {
        closeCart("page_leave");
        state.userLeftSite = true;
        state.lastPageLeaveTime = nowMs();
        updateScoreInStorage();
      });
      
      // Also track pagehide (more reliable than beforeunload)
      window.addEventListener("pagehide", function () {
        state.userLeftSite = true;
        state.lastPageLeaveTime = nowMs();
      });
      
      // Reset "left site" flag when user comes back (visibility change)
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
          // User came back to the page
          state.userLeftSite = false;
          state.lastPageLeaveTime = null;
        }
      });
      registerHistoryListeners();
      handleNavigationChange();
      
      // Initialize scroll depth tracking
      trackScrollDepth();
      
      // Set up score update callback
      updateScoreCallback = updateScoreInStorage;
      
      // Update score in localStorage periodically (every 5 seconds to reduce rapid changes)
      setInterval(function() {
        updateScoreInStorage();
      }, 5000);
      
      // Initial score update
      setTimeout(updateScoreInStorage, 500);
      
      console.log('[HesitationTracker] ✅ Tracker initialized and ready');
      console.log('[HesitationTracker] 💡 Score will be updated in localStorage every 5 seconds');
      console.log('[HesitationTracker] 💡 Set threshold with: localStorage.setItem("convertBoostHesitationThreshold", "50")');
      console.log('[HesitationTracker] 💡 View current score: JSON.parse(localStorage.getItem("convertBoostHesitationScore"))');
      console.log('[HesitationTracker] 📊 All events and scores will be logged to console');
    }

    function eventsInWindow(type, now, windowMs) {
      var filtered = state.events.filter(function (event) {
        return (
          event.type === type && now - event.ts <= windowMs
        );
      });
      // Debug for variant switches
      if (type === "variant_switch") {
        var allOfType = state.events.filter(function(e) { return e.type === type; });
        console.log('[HesitationTracker] 🔍 eventsInWindow for variant_switch:', {
          totalInState: allOfType.length,
          inWindow: filtered.length,
          windowSeconds: windowMs/1000,
          eventAges: filtered.map(function(e) { return ((now - e.ts)/1000).toFixed(1) + 's ago'; })
        });
      }
      return filtered;
    }

    function getSignals(now) {
      var nowTime = now || nowMs();
      var windowMs = config.rollingWindowSeconds * 1000;
      var recentEvents = state.events.filter(function (event) {
        return nowTime - event.ts <= windowMs;
      });
      // Find the most recent meaningful event (not just any event)
      // Meaningful events are those that contribute to hesitation
      var meaningfulEventTypes = [
        "cart_open", "add_to_cart", "cart_dwell", "variant_switch",
        "coupon_seek", "back_and_forth_loop", "exit_intent", "micro_pause",
        "pdp_view", "intent_info_open"
      ];
      var lastMeaningfulEvent = recentEvents
        .filter(function(event) {
          return meaningfulEventTypes.indexOf(event.type) !== -1;
        })
        .sort(function(a, b) {
          return b.ts - a.ts;
        })[0];
      var lastEventTs = lastMeaningfulEvent ? lastMeaningfulEvent.ts : 0;

      var microPauseSeconds = eventsInWindow("micro_pause", nowTime, windowMs).map(
        function (event) {
          return event.data.seconds;
        }
      );
      var cartDwellEvents = eventsInWindow("cart_dwell", nowTime, windowMs).map(
        function (event) {
          return { seconds: event.data.seconds, timestamp: event.ts };
        }
      );
      var cartDwellSeconds = cartDwellEvents.length
        ? Math.max.apply(
            null,
            cartDwellEvents.map(function (event) {
              return event.seconds;
            })
          )
        : 0;
      var cartOpenTs = eventsInWindow("cart_open", nowTime, windowMs).map(
        function (event) {
          return event.ts;
        }
      );
      var addToCartTs = eventsInWindow("add_to_cart", nowTime, windowMs).map(
        function (event) {
          return event.ts;
        }
      );
      var pdpViewTs = eventsInWindow("pdp_view", nowTime, windowMs).map(
        function (event) {
          return event.ts;
        }
      );
      var infoOpenTs = state.events
        .filter(function (event) {
          return (
            ["reviews_open", "size_guide_open", "returns_open", "shipping_open"].indexOf(
              event.type
            ) !== -1 && nowTime - event.ts <= windowMs
          );
        })
        .map(function (event) {
          return event.ts;
        });
      // Get variant switch events
      var variantSwitchEvents = eventsInWindow("variant_switch", nowTime, windowMs);
      var variantSwitchTs = variantSwitchEvents.map(function (event) {
        return event.ts;
      });
      
      // ALWAYS log variant switch count for debugging
      var allVariantSwitches = state.events.filter(function(event) {
        return event.type === "variant_switch";
      });
      console.log('[HesitationTracker] 🔍 Variant Switches - Total in state:', allVariantSwitches.length, '| In window:', variantSwitchEvents.length, '| Will be counted:', variantSwitchTs.length);
      var couponSeekTs = state.events
        .filter(function (event) {
          return (
            ["coupon_seek", "offers_page_view"].indexOf(event.type) !== -1 &&
            nowTime - event.ts <= windowMs
          );
        })
        .map(function (event) {
          return event.ts;
        });
      
      // Get cart quantity change events
      var cartQuantityChangeEvents = eventsInWindow("cart_quantity_change", nowTime, windowMs);
      var cartQuantityChangesCount = cartQuantityChangeEvents.length;
      var loopTs = eventsInWindow(
        "back_and_forth_loop",
        nowTime,
        windowMs
      ).map(function (event) {
        return event.ts;
      });
      var exitIntentTs = eventsInWindow("exit_intent", nowTime, windowMs).map(
        function (event) {
          return event.ts;
        }
      );

      // Get max scroll depth from events
      var scrollDepthEvents = eventsInWindow("scroll_depth", nowTime, windowMs);
      var maxScrollDepth = state.maxScrollDepth;
      if (scrollDepthEvents.length > 0) {
        maxScrollDepth = Math.max.apply(
          null,
          scrollDepthEvents.map(function (event) {
            return event.data.depth || 0;
          })
        );
      }

      var signals = {
        temporal: {
          microPauseSeconds: microPauseSeconds,
          cartDwellSeconds: cartDwellSeconds
        },
        repetition: {
          cartRevisitsTimestamps: cartOpenTs,
          cartVisitTimestamps: cartOpenTs,
          cartRevisitsCount: cartOpenTs.length  // Count for scorer
        },
        optimization: {
          variantSwitchTimestamps: variantSwitchTs,
          variantSwitches: variantSwitchTs.length,  // Count for scorer
          couponSeekTimestamps: couponSeekTs,
          couponSeeking: couponSeekTs.length > 0,  // Boolean for scorer
          cartQuantityChanges: cartQuantityChangesCount  // Count for scorer
        },
        navigation: {
          loopTimestamps: loopTs,
          exitIntentTimestamps: exitIntentTs,
          backAndForthLoops: loopTs.length,  // Count for scorer
          exitIntent: exitIntentTs.length > 0,  // Boolean for scorer
          scrollDepth: maxScrollDepth
        },
        engagement: {
          cartOpenedTimestamps: cartOpenTs,
          addToCartTimestamps: addToCartTs,
          pdpViewTimestamps: pdpViewTs,
          intentInfoOpenTimestamps: infoOpenTs
        },
        secondsSinceLastSignal: lastEventTs ? (nowTime - lastEventTs) / 1000 : 0,
        nowMs: nowTime,
        userLeftSite: state.userLeftSite  // Pass flag to scorer
      };
      signals.engagementGateMet = computeEngagementGate(signals);
      
      // Debug logging for signal counts
            console.log('[HesitationTracker] 🔍 Signal Counts:', {
              variantSwitches: signals.optimization.variantSwitches,
              cartQuantityChanges: signals.optimization.cartQuantityChanges || 0,
              cartRevisits: signals.repetition.cartRevisitsCount,
              microPauses: signals.temporal.microPauseSeconds.length,
              cartDwell: signals.temporal.cartDwellSeconds,
              loops: signals.navigation.backAndForthLoops,
              exitIntent: signals.navigation.exitIntent,
              scrollDepth: signals.navigation.scrollDepth
            });
      
      return signals;
    }

    function getScore() {
      if (!global.convertBoostHesitationScore) {
        console.warn('[HesitationTracker] ⚠️ Score calculator not loaded yet');
        return null;
      }
      var signals = getSignals();
      var score = global.convertBoostHesitationScore.calculate(signals);
      
      // Get desired threshold
      var desiredThreshold = 50;
      try {
        var stored = localStorage.getItem("convertBoostHesitationThreshold");
        if (stored) {
          var parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            desiredThreshold = parsed;
          }
        }
      } catch (e) {}
      
      console.log('[HesitationTracker] 🎯 Hesitation Score:', {
        score: score.score.toFixed(2),
        threshold: desiredThreshold,
        shouldShow: score.score >= desiredThreshold ? '✅ YES' : '❌ NO',
        rawH: score.rawH.toFixed(2),
        categoryScores: {
          temporal: score.categoryScores.temporal.toFixed(2),
          repetition: score.categoryScores.repetition.toFixed(2),
          optimization: score.categoryScores.optimization.toFixed(2),
          navigation: score.categoryScores.navigation.toFixed(2)
        },
        engagementGateMet: signals.engagementGateMet,
        scrollDepth: signals.navigation.scrollDepth || 0
      });
      return score;
    }

    function computeEngagementGate(signals) {
      return Boolean(
        signals.engagement.cartOpenedTimestamps.length ||
          signals.engagement.addToCartTimestamps.length ||
          signals.engagement.pdpViewTimestamps.length >= 2 ||
          signals.engagement.intentInfoOpenTimestamps.length
      );
    }

    function mergeDefaults(overrides) {
      var merged = JSON.parse(JSON.stringify(DEFAULTS));
      if (!overrides) return merged;
      if (typeof overrides.rollingWindowSeconds === "number")
        merged.rollingWindowSeconds = overrides.rollingWindowSeconds;
      if (overrides.cooldowns) {
        merged.cooldowns = mergeObject(merged.cooldowns, overrides.cooldowns);
      }
      if (typeof overrides.loopBackWindowSeconds === "number")
        merged.loopBackWindowSeconds = overrides.loopBackWindowSeconds;
      if (typeof overrides.microPauseMinSeconds === "number")
        merged.microPauseMinSeconds = overrides.microPauseMinSeconds;
      if (typeof overrides.microPauseMaxSeconds === "number")
        merged.microPauseMaxSeconds = overrides.microPauseMaxSeconds;
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

    return {
      init: init,
      recordEvent: recordEvent,
      getSignals: getSignals,
      getScore: getScore,
      getEvents: function () {
        return state.events.slice();
      },
      config: config
    };
  }

  global.convertBoostHesitationTracker = createTracker();
  global.convertBoostHesitationTracker.init();
})(window);
