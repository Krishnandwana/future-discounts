/* Convert Boost - Hesitation Event Tracker (first-party, deterministic) */
(function (global) {
  "use strict";

  var STORAGE_KEY = "convertBoostHesitationEvents";
  var LAST_VISIT_KEY = "convertBoostLastVisit";
  var RETURN_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
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
      cartDwellThresholdsFired: { t20: false, t60: false },  // Track which thresholds fired
      cartDwellCheckInterval: null,
      pageHistory: [],
      maxScrollDepth: 0,
      lastScoreUpdate: 0,
      userLeftSite: false,
      lastPageLeaveTime: null,
      returnedWithin30Min: false,
      lastCheckoutStartAt: null,  // For checkout backtracking detection
      lastFilterChangeAt: 0,  // For price evaluation signals
      lastInfoOpenBySubtype: {},  // Per-subtype cooldowns for decision-aid signals
      distinctProductsViewed: [],  // For low-intent suppressor
      pdpDwellTimes: [],  // Track dwell times per PDP
      currentPdpPath: null,  // Current PDP being viewed
      currentPdpStartTime: null  // When current PDP was opened
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
      // FIX: Update lastScoreUpdate HERE to properly debounce (prevent wasteful CPU)
      if (updateScoreCallback && nowMs() - state.lastScoreUpdate >= 1000) {
        state.lastScoreUpdate = nowMs();  // Set immediately to prevent re-queuing
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
        var now = nowMs();
        
        // B) Checkout backtracking detection
        // If user started checkout recently and now opens cart again → strong hesitation
        if (state.lastCheckoutStartAt) {
          var BACKTRACK_WINDOW_MS = 5 * 60 * 1000;  // 5 minutes (reduced to avoid false positives)
          var timeSinceCheckout = now - state.lastCheckoutStartAt;
          if (timeSinceCheckout <= BACKTRACK_WINDOW_MS) {
            recordEvent("checkout_backtrack", {
              secondsSinceCheckout: Math.round(timeSinceCheckout / 1000)
            });
            recordMeaningfulAction("checkout_backtrack");
            console.log('[HesitationTracker] 🔙 Checkout backtracking detected! User started checkout ' + Math.round(timeSinceCheckout / 1000) + 's ago');
          }
          state.lastCheckoutStartAt = null;  // Reset to avoid double counting
        }
        
        state.cartOpenAt = now;
        state.cartProgressed = false;
        state.cartDwellThresholdsFired = { t20: false, t60: false };
        recordEvent("cart_open", { reason: reason || "unknown" });
        recordMeaningfulAction("cart_open");
        
        // Start interval to check cart dwell thresholds
        if (state.cartDwellCheckInterval) {
          clearInterval(state.cartDwellCheckInterval);
        }
        state.cartDwellCheckInterval = setInterval(function() {
          checkCartDwellThresholds();
        }, 5000);  // Check every 5 seconds
      }
    }
    
    function checkCartDwellThresholds() {
      if (!state.cartOpenAt || state.cartProgressed) return;
      
      var dwellSeconds = (nowMs() - state.cartOpenAt) / 1000;
      
      // Fire at 20 seconds threshold
      if (dwellSeconds >= 20 && !state.cartDwellThresholdsFired.t20) {
        state.cartDwellThresholdsFired.t20 = true;
        recordEvent("cart_dwell", {
          seconds: 20,
          threshold: "20s",
          reason: "threshold"
        });
        console.log('[HesitationTracker] ⏱️ Cart dwell threshold reached: 20 seconds');
      }
      
      // Fire at 60 seconds threshold
      if (dwellSeconds >= 60 && !state.cartDwellThresholdsFired.t60) {
        state.cartDwellThresholdsFired.t60 = true;
        recordEvent("cart_dwell", {
          seconds: 60,
          threshold: "60s",
          reason: "threshold"
        });
        console.log('[HesitationTracker] ⏱️ Cart dwell threshold reached: 60 seconds');
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
      
      // Clear the threshold check interval
      if (state.cartDwellCheckInterval) {
        clearInterval(state.cartDwellCheckInterval);
        state.cartDwellCheckInterval = null;
      }
      
      var durationSeconds = (nowMs() - state.cartOpenAt) / 1000;
      // Only record final cart_dwell if no thresholds were fired and cart wasn't progressed
      if (!state.cartProgressed && durationSeconds >= 1 && 
          !state.cartDwellThresholdsFired.t20 && !state.cartDwellThresholdsFired.t60) {
        recordEvent("cart_dwell", {
          seconds: durationSeconds,
          reason: reason || "unknown"
        });
      }
      recordEvent("cart_close", { reason: reason || "unknown" });
      state.cartOpenAt = null;
      state.cartProgressed = false;
      state.cartDwellThresholdsFired = { t20: false, t60: false };
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
      var currentPath = window.location.pathname;
      var currentType = getPageType(currentPath);
      var now = nowMs();
      // Store both type AND path for accurate loop detection
      state.pageHistory.push({ type: currentType, path: currentPath, ts: now });
      state.pageHistory = state.pageHistory.slice(-5);

      var len = state.pageHistory.length;
      if (len >= 3) {
        var a = state.pageHistory[len - 3];
        var b = state.pageHistory[len - 2];
        var c = state.pageHistory[len - 1];
        var loopWindowMs = config.loopBackWindowSeconds * 1000;
        // FIX: Use path, not just type - only count as loop if returning to SAME page/product
        // This prevents false loops like: product A → collection → product B
        var isSamePath = a.path === c.path;
        var isDifferentMiddle = a.path !== b.path;
        var isWithinWindow = c.ts - a.ts <= loopWindowMs;
        
        if (isSamePath && isDifferentMiddle && isWithinWindow) {
          var cooldownMs = config.cooldowns.loopSeconds * 1000;
          if (now - state.lastLoopAt >= cooldownMs) {
            state.lastLoopAt = now;
            recordEvent("back_and_forth_loop", {
              from: a.path,
              through: b.path,
              type: a.type
            });
            console.log('[HesitationTracker] 🔄 Navigation loop detected:', a.path, '→', b.path, '→', c.path);
          } else {
            var remainingCooldown = Math.ceil((cooldownMs - (now - state.lastLoopAt)) / 1000);
            console.log('[HesitationTracker] ⏳ Navigation loop skipped (cooldown: ' + remainingCooldown + 's remaining)');
          }
        }
      }

      // Reset scroll depth on page change
      state.maxScrollDepth = 0;
      
      // D) Low-intent suppressor - record PDP dwell time for previous page
      if (state.currentPdpPath && state.currentPdpStartTime) {
        var dwellSeconds = (nowMs() - state.currentPdpStartTime) / 1000;
        state.pdpDwellTimes.push({
          path: state.currentPdpPath,
          dwellSeconds: dwellSeconds,
          ts: nowMs()
        });
        // Keep only last 20 PDP visits
        if (state.pdpDwellTimes.length > 20) {
          state.pdpDwellTimes.shift();
        }
      }
      state.currentPdpPath = null;
      state.currentPdpStartTime = null;
      
      if (currentType === "pdp") {
        var productPath = window.location.pathname;
        recordEvent("pdp_view", { path: productPath });
        recordMeaningfulAction("pdp_view");
        
        // D) Track distinct products for low-intent suppressor
        if (state.distinctProductsViewed.indexOf(productPath) === -1) {
          state.distinctProductsViewed.push(productPath);
          // Keep only products viewed in current session (last 30 min window handled in getSignals)
        }
        state.currentPdpPath = productPath;
        state.currentPdpStartTime = nowMs();
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
        state.lastCheckoutStartAt = nowMs();  // B) Track for backtracking detection
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
      
      // A) Additional decision-aid signals (uncertainty reduction)
      // FIX: Per-subtype cooldown (10s) to prevent inflation from noisy selectors
      var INFO_OPEN_COOLDOWN_MS = 10 * 1000;  // 10 seconds per subtype
      var now = nowMs();
      
      function recordInfoOpenWithCooldown(subtype) {
        var lastTime = state.lastInfoOpenBySubtype[subtype] || 0;
        if (now - lastTime >= INFO_OPEN_COOLDOWN_MS) {
          state.lastInfoOpenBySubtype[subtype] = now;
          recordEvent("info_open", { subtype: subtype });
          recordMeaningfulAction("info_open");
          return true;
        }
        return false;
      }
      
      var faq = target.closest(
        '[data-faq], .faq, .accordion, [aria-controls*="faq"], details summary, .collapsible-trigger, [data-accordion]'
      );
      if (faq) {
        recordInfoOpenWithCooldown("faq");
      }
      
      var specs = target.closest(
        '[data-specs], [data-specifications], .product-specs, .specifications, [aria-controls*="spec"], .tabs [data-tab*="spec"]'
      );
      if (specs) {
        recordInfoOpenWithCooldown("specs");
      }
      
      var delivery = target.closest(
        '[data-delivery], [data-eta], .delivery-estimate, .shipping-estimate, [href*="delivery"], .delivery-info'
      );
      if (delivery) {
        recordInfoOpenWithCooldown("delivery_eta");
      }
      
      var materials = target.closest(
        '[data-materials], [data-care], .materials, .care-instructions, [aria-controls*="material"], [aria-controls*="care"]'
      );
      if (materials) {
        recordInfoOpenWithCooldown("materials_care");
      }
      
      // C) Sale/offers collection navigation from PDP
      var saleLink = target.closest('[href*="/sale"], [href*="/offers"], [href*="/clearance"], [href*="/discount"]');
      if (saleLink) {
        recordEvent("sale_navigation", { from: window.location.pathname });
        recordMeaningfulAction("sale_navigation");
        console.log('[HesitationTracker] 🏷️ Sale/offers navigation detected');
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
      
      // C) Price filter changes (repeated filter application)
      var priceFilter = target.closest(
        'input[name*="price"], select[name*="price"], [data-filter*="price"], .price-filter input, .price-range input'
      );
      if (priceFilter) {
        var now = nowMs();
        var FILTER_COOLDOWN_MS = 3000;  // 3 second cooldown
        if (now - state.lastFilterChangeAt > FILTER_COOLDOWN_MS) {
          recordEvent("price_filter_change", { value: target.value || "unknown" });
          recordMeaningfulAction("price_filter_change");
          state.lastFilterChangeAt = now;
          console.log('[HesitationTracker] 💰 Price filter change detected');
        }
      }
      
      // C) Price sort detection - FIX: Track in change handler, not click
      // This reliably catches when user changes sort dropdown
      var sortSelect = target.closest('select[name*="sort"], select.sort-by, [data-sort-select]');
      if (sortSelect && target.value) {
        var sortValue = target.value.toLowerCase();
        if (sortValue.indexOf('price') !== -1) {
          recordEvent("price_sort", { 
            direction: sortValue.indexOf('asc') !== -1 ? 'low-to-high' : 
                       sortValue.indexOf('desc') !== -1 ? 'high-to-low' : sortValue 
          });
          recordMeaningfulAction("price_sort");
          console.log('[HesitationTracker] 💰 Price sort detected:', sortValue);
        }
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
      
      // Check if user returned within 30 minutes
      try {
        var lastVisit = localStorage.getItem(LAST_VISIT_KEY);
        if (lastVisit) {
          var lastVisitTime = parseInt(lastVisit, 10);
          var timeSinceLastVisit = nowMs() - lastVisitTime;
          if (timeSinceLastVisit <= RETURN_WINDOW_MS && timeSinceLastVisit > 5000) {
            // User returned within 30 minutes (but not immediately - at least 5 seconds)
            state.returnedWithin30Min = true;
            recordEvent("return_within_30min", {
              timeSinceLastVisit: Math.round(timeSinceLastVisit / 1000),
              lastVisitTime: lastVisitTime
            });
            console.log('[HesitationTracker] 🔄 User returned within 30 minutes! Time since last visit:', Math.round(timeSinceLastVisit / 1000) + 's');
          }
        }
        // Update last visit timestamp
        localStorage.setItem(LAST_VISIT_KEY, nowMs().toString());
      } catch (e) {
        console.warn('[HesitationTracker] Failed to track return visit:', e);
      }
      
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
        // Update last visit time for return tracking
        try {
          localStorage.setItem(LAST_VISIT_KEY, nowMs().toString());
        } catch (e) {}
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
        "pdp_view", "reviews_open", "size_guide_open", "returns_open", "shipping_open",
        "cart_quantity_change", "return_within_30min",
        // New high-impact signals
        "checkout_backtrack", "info_open", "price_filter_change", "price_sort", "sale_navigation"
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
            ["reviews_open", "size_guide_open", "returns_open", "shipping_open", "info_open"].indexOf(
              event.type
            ) !== -1 && nowTime - event.ts <= windowMs
          );
        })
        .map(function (event) {
          return event.ts;
        });
      
      // A) Decision-aid usage count
      var decisionAidCount = infoOpenTs.length;
      
      // B) Checkout backtracking
      var checkoutBacktrackEvents = eventsInWindow("checkout_backtrack", nowTime, windowMs);
      var hasCheckoutBacktrack = checkoutBacktrackEvents.length > 0;
      
      // C) Price evaluation signals
      var priceFilterEvents = eventsInWindow("price_filter_change", nowTime, windowMs);
      var priceSortEvents = eventsInWindow("price_sort", nowTime, windowMs);
      var saleNavEvents = eventsInWindow("sale_navigation", nowTime, windowMs);
      var priceEvaluationCount = priceFilterEvents.length + priceSortEvents.length + saleNavEvents.length;
      
      // D) Low-intent suppressor: calculate browsing indicators
      var recentPdpViews = eventsInWindow("pdp_view", nowTime, windowMs);
      var distinctPdpPaths = [];
      recentPdpViews.forEach(function(event) {
        if (event.data && event.data.path && distinctPdpPaths.indexOf(event.data.path) === -1) {
          distinctPdpPaths.push(event.data.path);
        }
      });
      var distinctPdpCount = distinctPdpPaths.length;
      
      // Check for repeat PDP views (same product viewed multiple times)
      var pdpViewCounts = {};
      recentPdpViews.forEach(function(event) {
        if (event.data && event.data.path) {
          pdpViewCounts[event.data.path] = (pdpViewCounts[event.data.path] || 0) + 1;
        }
      });
      var hasRepeatPdpViews = Object.keys(pdpViewCounts).some(function(path) {
        return pdpViewCounts[path] >= 2;
      });
      
      // Calculate average PDP dwell time from recent dwells
      var recentDwells = state.pdpDwellTimes.filter(function(d) {
        return nowTime - d.ts <= windowMs;
      });
      var avgPdpDwellSeconds = 0;
      if (recentDwells.length > 0) {
        var totalDwell = recentDwells.reduce(function(sum, d) { return sum + d.dwellSeconds; }, 0);
        avgPdpDwellSeconds = totalDwell / recentDwells.length;
      }
      
      // Low-intent browsing: many distinct PDPs, no repeats, no cart, short dwell
      var isLowIntentBrowsing = (
        distinctPdpCount >= 6 &&
        !hasRepeatPdpViews &&
        cartOpenTs.length === 0 &&
        infoOpenTs.length === 0 &&
        avgPdpDwellSeconds < 15
      );
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
          // FIX: First cart open is not a "revisit" - subtract 1
          cartRevisitsCount: Math.max(0, cartOpenTs.length - 1),
          cartOpensCount: cartOpenTs.length,  // Raw count for reference
          returnWithin30Min: state.returnedWithin30Min,  // Boolean for scorer
          checkoutBacktrack: hasCheckoutBacktrack  // B) Very strong signal
        },
        optimization: {
          variantSwitchTimestamps: variantSwitchTs,
          variantSwitches: variantSwitchTs.length,  // Count for scorer
          couponSeekTimestamps: couponSeekTs,
          couponSeeking: couponSeekTs.length > 0,  // Boolean for scorer
          cartQuantityChanges: cartQuantityChangesCount,  // Count for scorer
          priceEvaluationCount: priceEvaluationCount  // C) Price evaluation signals
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
          intentInfoOpenTimestamps: infoOpenTs,
          decisionAidCount: decisionAidCount  // A) Decision-aid usage
        },
        // D) Low-intent suppressor indicators
        browsingIndicators: {
          distinctPdpCount: distinctPdpCount,
          hasRepeatPdpViews: hasRepeatPdpViews,
          avgPdpDwellSeconds: avgPdpDwellSeconds,
          isLowIntentBrowsing: isLowIntentBrowsing
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
              checkoutBacktrack: signals.repetition.checkoutBacktrack ? '✅' : '❌',
              priceEvaluation: signals.optimization.priceEvaluationCount || 0,
              decisionAid: signals.engagement.decisionAidCount || 0,
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
