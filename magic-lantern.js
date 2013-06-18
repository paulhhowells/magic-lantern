/*jslint bitwise: true, eqeq: false, sloppy: true, white: true, browser: true, devel: true, indent: 2, nomen: true, maxerr: 1000 */

var phh = phh || {};

(function ($) {
  "use strict";

  window.requestAniFrame = (function () {
    // v1.0
    // based on https://gist.github.com/joelambert/1002116 & Paul Irish shim
    // but does not fallback to setInterval

    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      false;
  }());

  phh.init = function () {
    phh.magic_lantern.init();
  };

  phh.magic_lantern = {
    // version: 0.2
    //
    prefs: {
      slides_selector : '#block-views-front-page-slideshow-block',
      slide_frame_selector : '.view-content',
      slide_selector : '.views-row',
      transition: {
        duration : 2100, // milliseconds
        start: {
          x: -20,       // percentage of width
          y: 0,         // percentage of height
          width: 160,   // percentage of width
          height: 140,  // percentage of height
          opacity: 0    // 0 ~ 1
        },
        end: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          opacity: 1
        }
      }
    },
    init: function () {
      var the = this;

      // use canvas based slideshow, or fallback to sliding slideshow
      if (phh.test.canvas) {
        $(the.prefs.slides_selector).each(function () {
          the.canvas_slideshow(this);
        });
      } else {
        $(the.prefs.slides_selector).each(function () {
          the.mechanical_slideshow(this);
        });
      }
    },
    canvas_slideshow: function (slideshow_container) {
      var
        o,
        $wrapper,
        THREESIXTY = (Math.PI/180) * 360;

      $wrapper = $(slideshow_container);
      $wrapper.
        wrapInner('<canvas />'). // wrap contents of selector in canvas
        addClass('slides slides-base');

      $('<canvas />').
        addClass('slides-overlay').
        appendTo($wrapper);
      $('<canvas />').
        addClass('slides-ui').
        appendTo($wrapper);

      o = {
        settings: {},
        backing_scale: null,
        init: function () {

          o.ui.init();
        },
        resize: function () {

          o.ui.resize();
        },
        engine: function () {},
        display: {
          init: function () {},
          // css: {},
          updateSize: function () {},
          background: {
            cv: null,
            cx: null
          },
          foreground: {
            cv: null,
            cx: null
          }
        },
        ui: (function () {
          var
            _ui,
            ui;

          _ui = {
            cv: null,
            cx: null,
            addHandlers: function () {},
            show: function () {},
            hide: function () {},
            getTouchLoc: function () {},
            paint: function () {}
          };
          ui = {
            init: function () {},
            resize: function () {},
            mouse: {},
            touch: {}
          };
          return ui;
        }())
      };

      o.init();


    }
  }; // /phh.slides

}(jQuery));