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
      pageHistory: []
    };

    function recordEvent(type, data) {
      state.events.push({
        type: type,
        ts: nowMs(),
        data: data || {}
      });
      state.events = pruneEvents(
        state.events,
        config.rollingWindowSeconds * 1000
      );
      saveEvents(state.events);
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
      if (now - state.lastExitIntentAt < config.cooldowns.exitIntentSeconds * 1000)
        return;
      if (event && typeof event.clientY === "number" && event.clientY > 0) return;
      state.lastExitIntentAt = now;
      recordEvent("exit_intent", {});
    }

    function trackVariantSwitch() {
      var now = nowMs();
      if (
        now - state.lastVariantSwitchAt <
        config.cooldowns.variantSwitchSeconds * 1000
      )
        return;
      state.lastVariantSwitchAt = now;
      recordEvent("variant_switch", {});
      recordMeaningfulAction("variant_switch");
    }

    function trackCouponSeek(reason) {
      var now = nowMs();
      if (
        now - state.lastCouponSeekAt <
        config.cooldowns.couponSeekSeconds * 1000
      )
        return;
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
          }
        }
      }

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

    function init() {
      document.addEventListener("click", handleClick);
      document.addEventListener("change", handleChange);
      document.addEventListener("focusin", handleFocusIn);
      document.addEventListener("mouseleave", trackExitIntent);
      window.addEventListener("beforeunload", function () {
        closeCart("page_leave");
      });
      registerHistoryListeners();
      handleNavigationChange();
    }

    function eventsInWindow(type, now, windowMs) {
      return state.events.filter(function (event) {
        return (
          event.type === type && now - event.ts <= windowMs
        );
      });
    }

    function getSignals(now) {
      var nowTime = now || nowMs();
      var windowMs = config.rollingWindowSeconds * 1000;
      var recentEvents = state.events.filter(function (event) {
        return nowTime - event.ts <= windowMs;
      });
      var lastEventTs = recentEvents.length
        ? recentEvents[recentEvents.length - 1].ts
        : 0;

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
      var variantSwitchTs = eventsInWindow(
        "variant_switch",
        nowTime,
        windowMs
      ).map(function (event) {
        return event.ts;
      });
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

      var signals = {
        temporal: {
          microPauseSeconds: microPauseSeconds,
          cartDwellSeconds: cartDwellSeconds
        },
        repetition: {
          cartRevisitsTimestamps: cartOpenTs,
          cartVisitTimestamps: cartOpenTs
        },
        optimization: {
          variantSwitchTimestamps: variantSwitchTs,
          couponSeekTimestamps: couponSeekTs
        },
        navigation: {
          loopTimestamps: loopTs,
          exitIntentTimestamps: exitIntentTs
        },
        engagement: {
          cartOpenedTimestamps: cartOpenTs,
          addToCartTimestamps: addToCartTs,
          pdpViewTimestamps: pdpViewTs,
          intentInfoOpenTimestamps: infoOpenTs
        },
        secondsSinceLastSignal: lastEventTs ? (nowTime - lastEventTs) / 1000 : 0,
        nowMs: nowTime
      };
      signals.engagementGateMet = computeEngagementGate(signals);
      return signals;
    }

    function getScore() {
      if (!global.convertBoostHesitationScore) return null;
      return global.convertBoostHesitationScore.calculate(getSignals());
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
