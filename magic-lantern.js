/*jslint bitwise: true, eqeq: false, sloppy: true, white: true, browser: true, devel: true, indent: 2, nomen: true, maxerr: 1000 */

/* style

  SYMBOLIC_CONSTANTS
  variable_names and object_properties
  $jquery_objects
  functionNames
  methodNames
  ConstructorClassNames
  css-class-names

  _o private object, encapsulated within a closure
  o  return object
  r  return object

  el  element
  ev  event
  tv  touch event

  str string
  arr array
  obj object

  i, j, k loop iterators
*/

var phh = phh || {};

(function ($) {
  "use strict";

  window.requestAniFrame = (function () {
    // v1.0
    // based on https://gist.github.com/joelambert/1002116 & Paul Irish shim
    // but does not fallback to setInterval

    //console.log(window.requestAnimationFrame);      // undefined
    //console.log(!!(window.requestAnimationFrame));  // false
    //console.log(!(window.requestAnimationFrame));   // true
    // shim requestAnimationFrame instead of requestAniFrame ?

    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      false;
  }());

  $(function () { // readyState
    phh.init();
  });

  phh.init = function () {
    phh.magic_lantern.init();
  };

  phh.magic_lantern = {
    // version: 0.2
    //
    prefs: {
      slides_selector: '#block-views-front-page-slideshow-block',
      slide_frame_selector: '.view-content',
      slide_selector: '.views-row',
      slides_base_class: 'slides-base',
      slides_overlay_class: 'slides-overlay',
      slides_ui_class: 'slides-ui',
      slides_ui_hidden_class: 'slides-ui-hidden',
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
      },
      tilesheet_src: {
        // resolution based on o.backing_scale
        //x1: "../sites/all/themes/inhouse/chr/slippy-tilesheet_x1.png",
        //x2: "../sites/all/themes/inhouse/chr/slippy-tilesheet_x2.png"
        x1: "slippy-tilesheet_x1.png",
        x2: "slippy-tilesheet_x2.png"
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
        the = this,
        $wrapper,
        THREESIXTY = (Math.PI / 180) * 360;

// console.log('canvas_slideshow');

      $wrapper = $(slideshow_container);
      $wrapper.
        wrapInner('<canvas/>'). // wrap contents of selector in canvas
        addClass('slides');

      $('canvas', $wrapper).addClass(the.prefs.slides_base_class);

      $('<canvas />').
        addClass(the.prefs.slides_overlay_class).
        appendTo($wrapper);

      $('<canvas />').
        addClass(the.prefs.slides_ui_class).
        appendTo($wrapper);


      o = {
        settings: {
          first_pause : 3000, // used only once on first run, milliseconds
          pause : 40000, //8000,       // pause between transitions, milliseconds
          transition: {
            delta: {}         // to be populated
          }
        },
        backing_scale: null,
        backing_store_ratio: null,
        imgs: [], // a short cut to img objects in slides // an array of all the slide images
        slides: [], // {text, img {el, width, height}, link }
        state: {
          pause_while_ui_visible: false, // was: ui.ui_visible_pause
          looping: false,
          transitioning: false // read by resize, written by transition()
          //current_slide: 0,
          //target_slide: 0
        },
        init: function () {
          $.extend(true, o.settings.transition, the.prefs.transition);
          o.setBackingScale();

          // build imgs array
          // $('img', $wrapper).each(function () { // could swap 'img' for a slide selector?
          //   o.imgs.push({
          //     el: this
          //   });
          // });

console.log('o.init');

          // build slides array and imgs array
          $(the.prefs.slide_selector, $wrapper).each(function () {
            var img = {
              el: $('img', this)[0]
            };

            o.imgs.push(img);
            o.slides.push({
              img: img
            });
          });

          // get references to the canvas within the dom
          //o.canvas = $('canvas', $wrapper)[0];
          //o.context = o.canvas.getContext("2d");

          o.display.init();

// fg equivalent to o.overlay

          // convert transition percentages into decimals
          o.settings.transition.start.x =      o.settings.transition.start.x * 0.01;
          o.settings.transition.start.y =      o.settings.transition.start.y * 0.01;
          o.settings.transition.start.width =  o.settings.transition.start.width * 0.01;
          o.settings.transition.start.height = o.settings.transition.start.height * 0.01;

          o.settings.transition.end.x =      o.settings.transition.end.x * 0.01;
          o.settings.transition.end.y =      o.settings.transition.end.y * 0.01;
          o.settings.transition.end.width =  o.settings.transition.end.width * 0.01;
          o.settings.transition.end.height = o.settings.transition.end.height * 0.01;

          // calculate transition deltas
          o.settings.transition.delta = {
            x: (o.settings.transition.end.x - o.settings.transition.start.x).toFixed(10),                  // percentage of width / made into a decimal
            y: (o.settings.transition.end.y - o.settings.transition.start.y).toFixed(10),                  // percentage of height / made into a decimal
            width: (o.settings.transition.end.width - o.settings.transition.start.width).toFixed(10),      // percentage of width
            height: (o.settings.transition.end.height - o.settings.transition.start.height).toFixed(10),   // percentage of height
            opacity: (o.settings.transition.end.opacity - o.settings.transition.start.opacity).toFixed(10) // 0 ~ 1
          };

          // o.ui.init(); should be called from a callback on img load
        }, /// init
        resize: function () {
          // var first_img = o.slides[0].img;
          // this must be the wrong image to repaint with (most of the time)
          // so pick the correct image or replace with a 'paint' function that paints the right thing

console.log('o.resize');

          o.display.updateSize();
          o.ui.resize();

          // if not animating / transitioning then re-draw
          // and then draw the current state, cos changing width will wipe the canvas
          if (!o.state.transitioning) {
            o.display.paint();
          }
        },
        engine: { // (function () {
          // operate the looping and transitioning
          looping: {
            current: 0,
            next : 1,
            timeout: null
          },
          loop: function (looping_flag) {
            // loop to the next slide
            // optional argument can turn looping on or off
            // called by: init() callback, transition()

            if (arguments.length) {
              o.state.looping = looping_flag;
            }

            if (o.state.looping && !o.state.pause_while_ui_visible) {
              o.engine.inc();
              o.engine.pause();
            }
          },
          fast_loop_restart: function () {
            // called by: processXY()

            o.state.looping = true;
            o.engine.inc();
            o.engine.transition();
          },
          inc: function () {
            // increment current slide

            o.engine.looping.next = o.engine.looping.current + 1;
            if (o.engine.looping.next >= o.slides.length) {
              o.engine.looping.next = 0;
            }
          },
          dec: function () {
            // decrement current slide

            o.engine.looping.next = o.engine.looping.current - 1;
            if (o.engine.looping.next < 0) {
              o.engine.looping.next = o.slides.length - 1;
            }
          },
          pause: function () {
            // pause between transitions

            clearTimeout(o.engine.looping.timeout);
            o.engine.looping.timeout = setTimeout(function () {
              if (o.state.looping && !o.state.pause_while_ui_visible) {
                o.engine.transition();
              }
              clearTimeout(o.engine.looping.timeout);
            }, o.settings.pause);
          },
          transition: function () {
// console.log('transition');
            var
              transition_id,
              transition_func,
              start = Date.now ? Date.now() : +new Date, // = Date.now() || +new Date
              finish = start + o.settings.transition.duration;
              // +new Date == lteIE8 hack == create a new Date object and then cast it to a number using the unary + operator to call the internal ToNumber.

            // todo: remove this line when dev is finished
            if (o.state.transitioning) {console.log('transition ERROR');}

            o.state.transitioning = true;

            o.display.background.paint();

            transition_func = function () {
              var
                current_time,
                position,
                x, y,
                width,
                height,
                opacity;

              current_time = (Date.now) ? Date.now() : +new Date;
              position = current_time > finish ? 1 : (current_time - start) / o.settings.transition.duration;

              o.display.foreground.x = o.display.foreground.cv.width * (o.settings.transition.start.x + (o.settings.transition.delta.x * position));
              o.display.foreground.y = o.display.foreground.cv.height * (o.settings.transition.start.y + (o.settings.transition.delta.y * position));
              o.display.foreground.width =  o.display.foreground.cv.width * (o.settings.transition.start.width + (o.settings.transition.delta.width * position));
              o.display.foreground.height = o.display.foreground.cv.height * (o.settings.transition.start.height + (o.settings.transition.delta.height * position));
              o.display.foreground.opacity = o.settings.transition.start.opacity + (o.settings.transition.delta.opacity * position);

              // retina / hi-dpi displays do not need to be integers, nor modern browsers with requestAnimationFrame
              if (!phh.test.shimRequestAnimationFrame) {
                // bitwise math floor-truncation
                o.display.foreground.x = ~~o.display.foreground.x;
                o.display.foreground.y = ~~o.display.foreground.y;
                o.display.foreground.cv.width = ~~o.display.foreground.width;
                o.display.foreground.cv.height = ~~o.display.foreground.height;
              }

              // o.display.background.paint();
              o.display.foreground.paint();

              if (current_time > finish) {
                // todo:
                //if (phh.test.shimRequestAnimationFrame) {
                //   window.cancelAnimationFrame(transition_id);
                // } else {
                clearInterval(transition_id);
                // }
                o.engine.looping.current = o.engine.looping.next;
                o.display.background.paint();
                o.state.transitioning = false;
                o.engine.loop();
              } else {
                if (phh.test.shimRequestAnimationFrame) {
                  requestAniFrame(transition_func); // behaves more like a setTimeout than a setInterval
                }
              }
            };

            if (phh.test.shimRequestAnimationFrame) {
              transition_func();
            } else {
              transition_id = setInterval(transition_func, 20);
            }
          } // /transition
        }, /// engine
        // }()),
        display: {
          init: function () {
            // called by: o.init()

console.log('display.init');

            o.display.background.cv = $('canvas.' + the.prefs.slides_base_class, $wrapper)[0];
            o.display.background.cx = o.display.background.cv.getContext("2d");
            o.display.background.cx.globalAlpha = 1;

            o.display.foreground.cv = $('canvas.' + the.prefs.slides_overlay_class, $wrapper)[0];
            o.display.foreground.cx = o.display.foreground.cv.getContext("2d");
          },
          css: {}, // defined by: updateSize(), used by:
          updateSize: function () {
            var
              img,
              wrapper_width;
            // this === o.display

console.log('display.updateSize');

            // img = o.imgs[0];
            img = o.slides[0].img;

            wrapper_width = $wrapper.width();

            // todo: check in the code if these properties are used elsewhere
            //img.width = img.el.width;
            //img.height = img.el.height;
//console.log(img.el.width);
//console.log(img.el.height);

            o.display.css = {
                width: wrapper_width, // can assume it's already an integer
                height: Math.round(wrapper_width * (img.el.height / img.el.width))
              };

            // set canvas attributes (css * backing_scale)
            o.display.background.cv.width  = o.display.css.width  * o.backing_scale;
            o.display.background.cv.height = o.display.css.height * o.backing_scale;
            o.display.foreground.cv.width  = o.display.css.width  * o.backing_scale;
            o.display.foreground.cv.height = o.display.css.height * o.backing_scale;

            $(o.display.background.cv).css(o.display.css);
            $(o.display.foreground.cv).css(o.display.css);
          },
          background: {
            cv: null,
            cx: null,
            // opacity: 0,
            // x: 0,
            // y: 0,
            // width: null,
            // height: null
            paint: function () {
// console.log('paint current' + o.engine.looping.current);
              // this == o.display.background

              o.display.background.cx.drawImage(
                o.slides[o.engine.looping.current].img.el,
                0,
                0,
                o.display.background.cv.width,
                o.display.background.cv.height
              );
            }
          },
          foreground: {
            cv: null,
            cx: null,
            opacity: 0,
            x: 0,
            y: 0,
            width: null,
            height: null,
            paint: function () {
// console.log('paint next' + o.engine.looping.next);
              // this == o.display.foreground
              o.display.foreground.cx.clearRect(0, 0, o.display.foreground.cv.width, o.display.foreground.cv.height);

              o.display.foreground.cx.globalAlpha = o.display.foreground.opacity;
              o.display.foreground.cx.drawImage(
                o.slides[o.engine.looping.next].img.el,
                o.display.foreground.x,
                o.display.foreground.y,
                o.display.foreground.cv.width,
                o.display.foreground.cv.height
              );
            }
          },
          paint: function () {
// console.log('o.display.paint');

            o.display.background.paint();
            o.display.foreground.paint();
          }
        }, /// display
        ui: (function () {
          var
            _ui,
            ui;

          _ui = {
            cv: null,
            cx: null,
            show: function () {
              ui.visible = true;
              o.state.pause_while_ui_visible = true;

console.log(o.state.looping);

              _ui.paint();
              $(_ui.cv).removeClass(the.prefs.slides_ui_hidden_class);
            },
            hide: function () {
              ui.visible = false;
              o.state.pause_while_ui_visible = false;

 console.log(o.state.looping);

              $(_ui.cv).addClass(the.prefs.slides_ui_hidden_class);
              _ui.paint();

              o.engine.pause();
            },
            getTouchLoc: function () {},
            paint: function () {
              // draw controls
              //  prev
              //  play_pause
              //  next
              var image_data;

console.log('_ui.paint');
//debugger;


              // draw plain or hover according to state
              image_data = _ui.chrome.prev.plain;
              _ui.cx.putImageData(image_data, _ui.chrome.prev.x, _ui.chrome.prev.y);

              image_data = _ui.chrome.play.plain;
              _ui.cx.putImageData(image_data, _ui.chrome.play.x, _ui.chrome.play.y);

              image_data = _ui.chrome.next.plain;
              _ui.cx.putImageData(image_data, _ui.chrome.next.x, _ui.chrome.next.y);

              /*
              image_data = _ui.chrome.prev.hover;
              _ui.cx.putImageData(image_data, _ui.chrome.prev.x, _ui.chrome.prev.y + 90);

              image_data = _ui.chrome.play.hover;
              _ui.cx.putImageData(image_data, _ui.chrome.play.x, _ui.chrome.play.y + 90);

              image_data = _ui.chrome.next.hover;
              _ui.cx.putImageData(image_data, _ui.chrome.next.x, _ui.chrome.next.y + 90);
              */


              // draw footer
              //  footer bg
              _ui.cx.putImageData(_ui.chrome.footer, 0, o.display.background.cv.height);

              //  show / hide

              // calc these on init / resize
              var show_hide_x = (o.display.background.cv.width / 2) - (_ui.tilesheet.show.width / 2);
              var show_hide_y = o.display.background.cv.height + (6 * o.backing_scale);

              _ui.cx.drawImage(
                  _ui.tilesheet.img,
                  _ui.tilesheet.show.x,
                  _ui.tilesheet.show.y,
                  _ui.tilesheet.show.width,
                  _ui.tilesheet.show.height,
                  show_hide_x,
                  show_hide_y,
                  _ui.tilesheet.show.width,
                  _ui.tilesheet.show.height
                  );

//console.log('/_ui.paint');
            },
            tilesheet: {
              ready: false,
              img: new Image(), // to load tilesheet into
              shadow: {
                left:  {x: 144, y: 0, width: 5, height: 5},
                mid:   {x: 149, y: 0, width: 1, height: 5},
                right: {x: 150, y: 0, width: 5, height: 5}
              },
              footer_tab: {x: 0, y: 0, width: 144, height: 35},
              show: {x: 144, y: 19, width: 20, height: 16},
              hide: {x: 164, y: 19, width: 20, height: 16}
            },
            // icon: {},
            chrome: {
              footer: null, // img_data

              // x:
              // y:
              // plain: img_data
              // hover: img_data
              prev: {},
              next: {},
              play: {},
              pause: {}
            },
            make: {
              cv: null, // a scratchpad canvas for use by make
              cx: null,
              init: function () {
console.log('_ui.make.init');
                // this == _ui.make
                this.cv = document.createElement('canvas');
                this.cx = this.cv.getContext('2d');

                this.buttons.init();
              },
              footer: function () {
                // make footer background
                var
                  cv = _ui.make.cv,
                  cx = _ui.make.cx,
                  tilesheet_img = _ui.tilesheet.img,
                  y = 0,
                  x_left,
                  x_right,
                  x_mid,
                  width_mid,
                  x_footer_tab,
                  y_footer_tab;

console.log('make.footer');

                // set dimensions and clear the make scratchpad canvas
                cv.width = _ui.cv.width;
                cv.height = tilesheet_img.height;

                // calculate where to draw the shadow
                x_left = 0;
                x_right = cv.width - _ui.tilesheet.shadow.right.width;
                x_mid = x_left + _ui.tilesheet.shadow.left.width;
                width_mid = x_right - x_mid;

                // calculate the x location to draw the tab graphic from
                x_footer_tab = Math.round((cv.width - _ui.tilesheet.footer_tab.width) / 2);
                y_footer_tab = 0;

                // draw shadow
                cx.drawImage(
                  tilesheet_img,
                  _ui.tilesheet.shadow.left.x,
                  _ui.tilesheet.shadow.left.y,
                  _ui.tilesheet.shadow.left.width,
                  _ui.tilesheet.shadow.left.height,
                  x_left,
                  y,
                  _ui.tilesheet.shadow.left.width,
                  _ui.tilesheet.shadow.left.height
                  );
                cx.drawImage(
                  tilesheet_img,
                  _ui.tilesheet.shadow.mid.x,
                  _ui.tilesheet.shadow.mid.y,
                  _ui.tilesheet.shadow.mid.width,
                  _ui.tilesheet.shadow.mid.height,
                  x_mid,
                  y,
                  width_mid,
                  _ui.tilesheet.shadow.mid.height
                  );
                cx.drawImage(
                  tilesheet_img,
                  _ui.tilesheet.shadow.right.x,
                  _ui.tilesheet.shadow.right.y,
                  _ui.tilesheet.shadow.right.width,
                  _ui.tilesheet.shadow.right.height,
                  x_right,
                  y,
                  _ui.tilesheet.shadow.right.width,
                  _ui.tilesheet.shadow.right.height
                  );

                // draw tab
                cx.drawImage(
                  tilesheet_img,
                  _ui.tilesheet.footer_tab.x,
                  _ui.tilesheet.footer_tab.y,
                  _ui.tilesheet.footer_tab.width,
                  _ui.tilesheet.footer_tab.height,
                  x_footer_tab,
                  y_footer_tab,
                  _ui.tilesheet.footer_tab.width,
                  _ui.tilesheet.footer_tab.height
                  );

                // take img data from make.canvas and store it ready for use
                _ui.chrome.footer = cx.getImageData(0, 0, cv.width, cv.height);
              },
              buttons: (function () {
                // creates and stores img data for control buttons: play, pause, prev, next
                // called by: resize
                // notes: _defaults.icon is only scaled once (by init) so there is no need to clone it and move it into _buttons
                var
                  _defaults,
                  _buttons,
                  f;

                _defaults = {
                  button_height: 40,
                  edge_offset: 45,
                  hovered_icon_fill_style: 'rgba(0, 0, 0, 0.2)',
                  icon: { // todo: should this be here, or use _ui.icon? the icons are specific to the buttons!
                    prev: {
                      width: 18, height: 17,
                      arr: [[18, 0], [0, 8.5], [18, 17],  [18, 11], [13, 8.5], [18, 6], [18, 0]],
                      centre: {}, adjust: {x: -2}
                    },
                    next: {
                      width: 18, height: 17,
                      arr: [[0, 0], [0, 6], [5, 8.5], [0, 11], [0, 17], [18, 8.5], [0, 0]],
                      centre: {}, adjust: {x: 2}
                    },
                    play: {
                      width: 21, height: 21,
                      arr: [[0, 0], [0, 21], [21, 11.5], [0, 0]],
                      centre: {}, adjust: {x: 3, y: -1}
                    },
                    pause: {
                      width: 15, height: 21,
                      arr: [[0, 0], [0, 21], [6, 21], [6, 0], [0, 0], [9, 0], [9, 21], [15, 21], [15, 0], [9, 0]],
                      centre: {}
                    },
                    show_hide: {}
                  }
                };

                _buttons = {
                  gap_between_buttons: null,
                  edge_offset: null,
                  button_height: null
                };

                f = function () {
                  var
                    cv = _ui.make.cv,
                    cx = _ui.make.cx,
                    play_pause_width,
                    one_third_width,
                    centre_width,
                    half_centre_width,
                    half_height,
                    buttons_y,
                    gr; // gradient

                  cv.height = _buttons.button_height;
                  one_third_width = ~~(_ui.cv.width / 3);
                  centre_width = _ui.cv.width - (one_third_width * 2);
                  play_pause_width = one_third_width - _buttons.gap_between_buttons;
                  half_centre_width = ~~(centre_width / 2);
                  half_height = ~~(cv.height / 2);
                  buttons_y = o.display.background.cv.height - _buttons.button_height;

                  // define gradient
                  gr = cx.createLinearGradient(0, 0, 0, cv.height);
                  gr.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
                  gr.addColorStop(1, 'rgba(255, 255, 255, 1)');

                  _buttons.icon.prev.centre.x = _buttons.edge_offset;
                  _buttons.icon.prev.centre.y = half_height;
                  _buttons.icon.prev.x = _buttons.icon.prev.centre.x - ~~(_buttons.icon.prev.width / 2);
                  _buttons.icon.prev.y = _buttons.icon.prev.centre.y - ~~(_buttons.icon.prev.height / 2);

                  _buttons.icon.next.centre.x = one_third_width - _buttons.edge_offset;
                  _buttons.icon.next.centre.y = half_height;
                  _buttons.icon.next.x = _buttons.icon.next.centre.x - ~~(_buttons.icon.next.width / 2);
                  _buttons.icon.next.y = _buttons.icon.next.centre.y - ~~(_buttons.icon.next.height / 2);

                  _buttons.icon.play.centre.x = half_centre_width;
                  _buttons.icon.play.centre.y = half_height;
                  _buttons.icon.play.x = ~~((centre_width - _buttons.icon.play.width) / 2);
                  _buttons.icon.play.y = _buttons.icon.play.centre.y - ~~(_buttons.icon.play.height / 2);

                  _buttons.icon.pause.centre.x = half_centre_width;
                  _buttons.icon.pause.centre.y = half_height;
                  _buttons.icon.pause.x = ~~((centre_width - _buttons.icon.pause.width) / 2);
                  _buttons.icon.pause.y = _buttons.icon.pause.centre.y - ~~(_buttons.icon.pause.height / 2);

                  // prev button
                  _ui.chrome.prev.x = 0;
                  _ui.chrome.prev.y = buttons_y;
                  cv.width = play_pause_width; // sets correct width and resets canvas
                  cx.fillStyle = gr;
                  _ui.make.cutStaticButton(cv, cx, _buttons.icon.prev);
                  _ui.make.darkenIcon(cx, _buttons.icon.prev);
                  _ui.chrome.prev.plain = cx.getImageData(0, 0, cv.width, cv.height);

                  // prev hover
                  _ui.make.cutHoverButton(cx, _buttons.icon.prev, half_height);
                  _ui.make.darkenIcon(cx, _buttons.icon.prev, _defaults.hovered_icon_fill_style);
                  _ui.chrome.prev.hover = cx.getImageData(0, 0, cv.width, cv.height);

                  // next button
                  _ui.chrome.next.x = _ui.cv.width - play_pause_width; // - cv.width;
                  _ui.chrome.next.y = buttons_y;
                  cv.width = play_pause_width;
                  cx.fillStyle = gr;
                  _ui.make.cutStaticButton(cv, cx, _buttons.icon.next);
                  _ui.make.darkenIcon(cx, _buttons.icon.next);
                  _ui.chrome.next.plain = cx.getImageData(0, 0, cv.width, cv.height);

                  // next hover
                  _ui.make.cutHoverButton(cx, _buttons.icon.next, half_height);
                  _ui.make.darkenIcon(cx, _buttons.icon.next, _defaults.hovered_icon_fill_style);
                  _ui.chrome.next.hover = cx.getImageData(0, 0, cv.width, cv.height);

                  // play / pause button
                  _ui.chrome.play.x = _ui.chrome.pause.x = one_third_width;
                  _ui.chrome.play.y = _ui.chrome.pause.y = buttons_y;
                  cv.width = centre_width; // sets correct width and resets canvas
                  cx.fillStyle = gr;

                  // play
                  _ui.make.cutStaticButton(cv, cx, _buttons.icon.play);
                  _ui.make.darkenIcon(cx, _buttons.icon.play);
                  _ui.chrome.play.plain = cx.getImageData(0, 0, cv.width, cv.height);

                  // play hover
                  _ui.make.cutHoverButton(cx, _buttons.icon.play, half_height);
                  _ui.make.darkenIcon(cx, _buttons.icon.play, _defaults.hovered_icon_fill_style);
                  _ui.chrome.play.hover = cx.getImageData(0, 0, cv.width, cv.height);

                  // pause
                  cv.width = centre_width; // sets correct width and resets canvas
                  cx.fillStyle = gr;
                  _ui.make.cutStaticButton(cv, cx, _buttons.icon.pause);
                  _ui.make.darkenIcon(cx, _buttons.icon.pause);
                  _ui.chrome.pause.plain = cx.getImageData(0, 0, cv.width, cv.height);

                  // pause hover
                  _ui.make.cutHoverButton(cx, _buttons.icon.pause, half_height);
                  _ui.make.darkenIcon(cx, _buttons.icon.pause, _defaults.hovered_icon_fill_style);
                  _ui.chrome.pause.hover = cx.getImageData(0, 0, cv.width, cv.height);
                };

                f.init = function () {
console.log('buttons.init');
                  _buttons.gap_between_buttons = (o.backing_scale === 1) ? 1 : ~~(o.backing_scale); // an integer for a crisply rendered line
                  _buttons.edge_offset = (o.backing_scale === 1) ? 45 : 45 * o.backing_scale;
                  _buttons.button_height = (o.backing_scale === 1) ? _defaults.button_height : _defaults.button_height * o.backing_scale;

                  // scale the icon coordinates to match backing scale
                  if (o.backing_scale !== 1) {
                    _ui.make.scaleIcons(_defaults.icon);
                  }
                  _buttons.icon = _defaults.icon;
                };
                return f;
              }()),
              scaleIcons: function (icons) {
                // scale up icons when they need to match a backing scale > 1
                // arguments: icons is an object, passed by reference
                // so this should only be called once from an init()
                var
                  icon,
                  button,
                  button_name,
                  i,
                  i_loc,
                  length;

console.log('make.scaleIcons');

                //if (o.backing_scale !== 1) {
                for (button_name in icons) {
                  if (icons.hasOwnProperty(button_name)) {
                    icon = icons[button_name];
                    // adjust the various properties of icon accordingly

                    icon.width = icon.width * o.backing_scale;
                    icon.height = icon.height * o.backing_scale;

                    if (icon.adjust) {
                      if(icon.adjust.x) {
                        icon.adjust.x *= o.backing_scale;
                      }
                      if(icon.adjust.y) {
                        icon.adjust.y *= o.backing_scale;
                      }
                    }

                    if (icon.arr) {
                      for (i = 0, length = icon.arr.length; i < length; i += 1) {
                        i_loc = icon.arr[i];
                        i_loc[0] *= o.backing_scale;
                        i_loc[1] *= o.backing_scale;
                      }
                    }
                  }
                }
                //}

                return icons; // returns reference not value!
//console.log('/make.scaleIcons');
              },
              cutIcon: function (cx, icon) {
                // cut an icon shape out of a shape drawn on the canvas
                // requires: coordinates that overlap and are anti clockwise
                // called by: cutStaticButton(), cutHoverButton(), darkenIcon()
                var
                  i,
                  i_x, i_y,
                  x, y,
                  length;

//console.log('make.cutIcon');
                x = icon.x;
                y = icon.y;

                if (icon.hasOwnProperty('adjust')) {
                  x += icon.adjust.x || 0;
                  y += icon.adjust.y || 0;
                }

                cx.moveTo(icon.x, icon.y);

                for (i = 0, length = icon.arr.length; i < length; i += 1) {
                  i_x = x + icon.arr[i][0];
                  i_y = y + icon.arr[i][1];
                  cx.lineTo(i_x, i_y);
                }
//console.log('/make.cutIcon');
              },
              cutStaticButton: function (cv, cx, icon) {
//console.log('cutStaticButton');
                cx.beginPath();
                cx.rect(0, 0, cv.width, cv.height); // clockwise
                _ui.make.cutIcon(cx, icon);
                cx.fill();
                cx.closePath();
              },
              cutHoverButton: function (cx, icon, half_height, fill_style) {
                // arguments: fill_style is optional, defaults to white
//console.log('cutHoverButton');
                var radius = half_height - 2;
                cx.fillStyle = fill_style || "#fff";
                cx.beginPath();
                cx.arc(icon.centre.x, icon.centre.y, radius, 0, THREESIXTY, false);
                _ui.make.cutIcon(cx, icon);
                cx.fill();
                cx.closePath();
              },
              darkenIcon: function (cx, icon, fill_style) {
//console.log('darkenIcon');
                // arguments: fill_style is optional
                cx.fillStyle = fill_style || 'rgba(0, 0, 0, 0.4)';
                cx.beginPath();
                _ui.make.cutIcon(cx, icon);
                cx.fill();
                cx.closePath();
              }
            },
            addHandlers: function () {
console.log('addHandlers');
              _ui.cv.addEventListener("touchstart",  ui.touch.start,  false);
              _ui.cv.addEventListener("touchmove",   ui.touch.move,   false);
              _ui.cv.addEventListener("touchend",    ui.touch.end,    false);
              _ui.cv.addEventListener("touchcancel", ui.touch.cancel, false);

              // standards
              _ui.cv.addEventListener("mouseover",   ui.mouse.over,   false);
              _ui.cv.addEventListener("mouseout",    ui.mouse.out,    false);
              _ui.cv.addEventListener("mousemove",   ui.mouse.move,   false);
              _ui.cv.addEventListener("mousedown",   ui.mouse.down,   false);
              _ui.cv.addEventListener("mouseup",     ui.mouse.up,     false);

              // microsoft
              _ui.cv.addEventListener("mouseenter",  ui.mouse.over,  false);
              _ui.cv.addEventListener("mouseleave",  ui.mouse.out,  false);
            }
          };
          ui = {
            footer_height: 40, // todo: move this to o.settings?
            init: function () {
              // runs once only
              // called by callback on first image load
              var tilesheetLoaded;

console.log('ui.init');
              _ui.make.init();

              // scale up the button icons if hi-res or retina
              if (o.backing_scale !== 1) {
                _ui.make.scaleIcons(_ui.icon);
              }

              _ui.cv = $('canvas.' +the.prefs.slides_ui_class, $wrapper)[0];
              _ui.cx = _ui.cv.getContext("2d");
              _ui.cv.width = o.display.background.cv.width;
              _ui.cv.height = o.display.background.cv.height + ui.footer_height;

              _ui.make.buttons(); // doesn’t need to wait for tilesheet to load, but must run before paint()

              // load o.settings.tilesheet
              // and fire callback once it's loaded
              // load in tilesheet, and run a callback to process it once it has loaded
              tilesheetLoaded = function () {
                _ui.make.footer(); // makes footer from tilesheet source
                _ui.tilesheet.ready = true;

                // todo: should only paint if visible!
                _ui.paint();

                // todo: remove this commented out line
                // just for testing proto $('.wrapper').append(_ui.make.cv);
              };
              _ui.tilesheet.img = new Image();
              _ui.tilesheet.img.onload = tilesheetLoaded;
              _ui.tilesheet.img.src = (o.backing_scale === 1) ? the.prefs.tilesheet_src.x1 : the.prefs.tilesheet_src.x2;

              // while perhaps waiting for tilesheet to load

              _ui.addHandlers();
            },
            resize: function () {
// console.log('ui.resize');

              // o.resizeCanvas used to call these
              // o.ui.calculateSizes();
              // o.ui.paint();

              // need to reset dimensions, but also to clear the canvas before painting (which is a byproduct of setting dims)
              // do this before make.buttons and/or make.footer due to a dependency one (or both) of them has
              _ui.cv.width = o.display.background.cv.width;
              _ui.cv.height = o.display.background.cv.height + ui.footer_height;


              // could there be a race condition where this runs before ui.init() ?
              // dont want to make buttons or footer if there could be!
              // todo: test for this
              _ui.make.buttons();
              _ui.make.footer();

              _ui.paint();
            },
            mouse: {
              over: function (ev) {},
              out: function (ev) {},
              move: function (ev) {},
              down: function (ev) {},
              up: function (ev) {}
            },
            touch: {
              start: function (tv) {},
              move: function (tv) {},
              end: function (tv) {},
              cancel: function (tv) {}
            }
          };
          return ui;
        }()), /// ui
        setBackingScale: function () {
          // assume that canvas & 2d context are supported
          // after test by magic_lantern.init()
          // this function accomodates both iOS and OSX retina
          var
            cv = document.createElement('canvas'),
            cx = cv.getContext('2d');

          o.backing_store_ratio = cx.webkitBackingStorePixelRatio ||
            cx.mozBackingStorePixelRatio ||
            cx.msBackingStorePixelRatio ||
            cx.oBackingStorePixelRatio ||
            cx.backingStorePixelRatio || 1;

          // calculate backing scale
          o.backing_scale = ((window.devicePixelRatio > 1) && !(o.backing_store_ratio > 1)) ? window.devicePixelRatio : 1;

          cv = null; // will garbage collection destroy cv when function is finished?
        } /// setBackingScale
      }; /// o

      o.init(); // calls: display.init()

      // when first image loaded, do this:
      phh.imgLoader([o.imgs[0]], function () {
        var
          first_img = o.slides[0].img;

        o.display.updateSize();

        // draw current state
        o.display.background.cx.drawImage(
          first_img.el,
          0,
          0,
          o.display.background.cv.width,
          o.display.background.cv.height
          );

        o.ui.init();

        // call resize instead?
        // and only draw current state if it IS animating? (cos then method would skip it)
      });

      // when all images loaded, do this:
      phh.imgLoader(o.imgs, function () {
        // set a timer for animation start
        // when time is up check that all images have loaded
        // if not then start animation when all images have loaded
        // when all images have loaded


        // phh.log('all loaded callback');
        // var date = Date.now ? Date.now() : +new Date; // lte IE8, unary + operator == valueOf
        // the.dateNow = Date.now || function() { return +new Date; };

        o.engine.looping.timeout = setTimeout(function () {
          // uncalibrated rough first pause running after unknown everything loaded

          // start animation
          o.engine.loop(true); // the.loop(o, true);
        }, o.settings.first_pause);
      });

      // watch out for window resize event, and adjust canvas accordingly
      // <body onorientationchange="updateOrientation();">
      // could this be added only once window has finished loading,
      // and thus do a resize once if required at end of init?
      // todo: need to check that the initialisation is not reliant on this callback - for browsers that do not trigger resize
      $(window).load(function () {
        $(window).resize(
          (function (o) {
            return function () {
              o.resize();
            };
          }(o))
        );
      });


    }
  }; // /phh.magic_lantern


  // move slideLoader into magic_lantern
  // or build imgs[] in parallel?
  phh.slideLoader = function (slide_array, all_loaded_callback) {
    var
      i,
      img_array = [],
      length;

    for (i = 0, length = slide_array.length; i < length; i += 1) {
      img_array.push(slide_array[i].img);
    }

    phh.imgLoader(img_array, all_loaded_callback);
  };

  phh.imgLoader = function (img_array, all_loaded_callback) {
    // v 1.0
    // runs a callback when all images in array are loaded
    //
    // arguments:
    //   all_loaded_callback is called when all image tags in array have loaded
    //   img_array may be an array of Image objects, a jQuery object or an
    //     array of objects with .el properties
    //
    // not intended for use with dynamically added image objects
    // beware that a 404 will trigger as a loaded img
    var
      i,
      i_img,
      length,
      unloaded_total = 0,
      all_loaded_callback_called = false,
      load_callback,
      final_callback;

    final_callback = function () {
      if ((typeof all_loaded_callback === 'function') && (all_loaded_callback_called === false)) {
        all_loaded_callback_called = true;
        all_loaded_callback();
      }
    };

    load_callback = function () {
      unloaded_total -= 1;
      if (unloaded_total === 0) {
        final_callback();
      }
    };

    // loop through all images & check if image is already loaded or cached
    for (i = 0, length = img_array.length; i < length; i += 1) {
      i_img = img_array[i];

      // use an array of img elements, or jQuery object, or array of objects with .el properties
      if (!i_img.hasOwnProperty('src')) {
        i_img = i_img.el;
      }

      if (!i_img.complete && !(i_img.width + i_img.height > 1)) {
        // then this img is not loaded yet

        unloaded_total += 1;

        // add callback to img load
        $(i_img).load(load_callback);
      }
    }

    if (unloaded_total === 0) {
      // then images loaded (or zero images)
      final_callback();
    } else {
      // images still to load

      // belt & braces backup, all assets (including img tags) will have been loaded when this is called
      // carries on despite 404s however
      $(window).load(function () {
        final_callback();
      });
    }
  }; // phh.imgLoader

  phh.test = (function () {
    // v1.0
    // similar to a very stripped down modernizr
    var
      r, // public object
      t, // tests object
      name;
    r = {};
    t = {
      version: function () {
        return $.fn.jquery;
      },
      mobile: function () {
        /* do not use for feature detection, only use for debugging or context, beware inferrence! */
        return !!(navigator.userAgent.match(/(iPhone|iPod|BlackBerry|Android.*Mobile|webOS|Windows CE|IEMobile|Opera Mini|Opera Mobi|HTC|LG-|LGE|SAMSUNG|Samsung|SEC-SGH|Symbian|Nokia|PlayStation|PLAYSTATION|Nintendo DSi)/i));
      },
      canvas: function () {
        var el = document.createElement('canvas');
        return !!(el.getContext && el.getContext('2d'));
        // !!document.createElement('testcanvas').getContext;
      },
      requestAnimationFrame: function () {
        return !!(window.requestAnimationFrame);
      },
      vendorRequestAnimationFrame: function () {
        return !!(window.mozRequestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.oRequestAnimationFrame ||
          window.msRequestAnimationFrame);
      },
      shimRequestAnimationFrame: function () {
        return !!(window.requestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.oRequestAnimationFrame ||
          window.msRequestAnimationFrame);
      }
    };

    // return a public object listing the test results
    for (name in t) {
      if (t.hasOwnProperty(name)) {
        r[name] = t[name]();
      }
    }
    return r;
  }());

  phh.getObjectValue = function (o) {
    // v1.0
    // returns the value of the object passed in as an argument
    // rather than returning a reference to the object
    // arguments: o may be an object, or a property of the object (i.e. string, number, array etc.)
    // but not expecting a function as an argument
    // todo: include functions by reference
    // todo: test in IE and firefox
    var
      p, // property
      r; // return object

    // if (phh.isArray(o)) {
    //   r = [];
    //} else {
      r = (o.constructor) ? new o.constructor() : {};
    //}

    for (p in o) {
      if (o.hasOwnProperty(p)) {
        // if the property is an array or an object then recurse
        r[p] = (typeof o[p] === "object") ? phh.getObjectValue(o[p]) : o[p];
      }
    }
    return r;
  };

  phh.isArray = (function () {
    // v1.1
    // usually could use jQuery function isArray
    // have used memoization to avoid repeatedly defining toString
    var toString = Object.prototype.toString;

    return function (t) {
      return !!(toString.call(t) === "[object Array]");
    };
  }());

}(jQuery));