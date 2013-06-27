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
        x1: "../sites/all/themes/inhouse/chr/slippy-tilesheet_x1.png",
        x2: "../sites/all/themes/inhouse/chr/slippy-tilesheet_x2.png"
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

      $wrapper = $(slideshow_container);
      $wrapper.
        wrapInner('<canvas />'). // wrap contents of selector in canvas
        addClass('slides').
        addClass('slides-base'); // the.prefs.slides_base_class

      $('<canvas />').
        addClass('slides-overlay'). // the.prefs.slides_overlay_class
        appendTo($wrapper);
      $('<canvas />').
        addClass('slides-ui'). // the.prefs.slides_ui_class
        appendTo($wrapper);

      o = {
        settings: {
          first_pause : 3000, // used only once on first run, milliseconds
          pause : 8000,       // pause between transitions, milliseconds
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
          looping: false //,
          //animating: false,   // transitioning ?
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

          // build slides array and imgs array
          $(the.prefs.slide_selector, $wrapper).each(function () {
            var img = {
              el: $('img', this)
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
          // var first_img = o.slide[0].img;
          // this must be the wrong image to repaint with (most of the time)
          // so pick the correct image or replace with a 'paint' function that paints the right thing

          o.display.updateSize();
          o.ui.resize();

          // if not animating / transitioning then re-draw
          // and then draw the current state, cos changing width will wipe the canvas
          if (!o.state.animating) {
            //o.display.background.cx.drawImage(first_img.el, 0, 0, o.display.background.cv.width, o.display.background.cv.height);

            // o.background.cx.drawImage(o.imgs[o.engine.looping.current].el, 0, 0, o.canvas.width, o.canvas.height);

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
            var
              transition_id,
              transition_func,
              start = Date.now ? Date.now() : +new Date, // = Date.now() || +new Date
              finish = start + o.settings.transition.duration;
              // +new Date == lteIE8 hack == create a new Date object and then cast it to a number using the unary + operator to call the internal ToNumber.

            // todo: remove this line when dev is finished
            if (o.state.animating) {console.log('transition ERROR');}

            o.state.animating = true;

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

              x = o.canvas.width * (o.settings.transition.start.x + (o.settings.transition.delta.x * position));
              y = o.canvas.height * (o.settings.transition.start.y + (o.settings.transition.delta.y * position));
              width =  o.canvas.width * (o.settings.transition.start.width + (o.settings.transition.delta.width * position));
              height = o.canvas.height * (o.settings.transition.start.height + (o.settings.transition.delta.height * position));
              opacity = o.settings.transition.start.opacity + (o.settings.transition.delta.opacity * position);

              // retina / hi-dpi displays do not need to be integers, nor modern browsers with requestAnimationFrame
              if (!phh.test.shimRequestAnimationFrame) {
                // bitwise math floor-truncation
                x = ~~x;
                y = ~~y;
                width = ~~width;
                height = ~~height;
              }

              // todo: replace vars above with these obj props
              o.display.foreground.opacity = opacity;
              o.display.foreground.x = x;
              o.display.foreground.y = y;
              o.display.foreground.cv.width = width;
              o.display.foreground.cv.height = height;

              o.display.paint();

              //o.context.globalAlpha = 1;
              //o.context.drawImage(o.imgs[o.looping.current].el, 0, 0, o.canvas.width, o.canvas.height);
              //o.context.globalAlpha = opacity;
              //o.context.drawImage(o.imgs[o.looping.next].el, x, y, width, height);


              if (current_time > finish) {
                // todo:
                //if (phh.test.shimRequestAnimationFrame) {
                //   window.cancelAnimationFrame(transition_id);
                // } else {
                clearInterval(transition_id);
                // }
                o.engine.looping.current = o.engine.looping.next;
                o.state.animating = false;
                o.loop();
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

            o.display.background.cv = $('canvas.' + the.prefs.slides_base_class, $wrapper)[0];
            o.display.background.cx = o.display.background.cv.getContext("2d");
            o.display.foreground.cv = $('canvas.' + the.prefs.slides_overlay_class, $wrapper)[0];
            o.display.foreground.cx = o.display.foreground.cv.getContext("2d");
          },
          css: {}, // defined by: updateSize(), used by:
          updateSize: function () {
            var
              img,
              wrapper_width;

            // img = o.imgs[0];
            img = o.slide[0].img;

            wrapper_width = $wrapper.width();

            // check in the code if these properties are used elsewhere
            //img.width = img.el.width;
            //img.height = img.el.height;

            o.display.css = {
                width: wrapper_width, // can assume it's already an integer
                height: Math.round(wrapper_width * (img.el.height / img.el.width))
              };

            // set canvas attributes (css * backing_scale)
            o.background.cv.width  = o.display.css.width  * o.backing_scale;
            o.background.cv.height = o.display.css.height * o.backing_scale;
            o.foreground.cv.width  = o.display.css.width  * o.backing_scale;
            o.foreground.cv.height = o.display.css.height * o.backing_scale;

            $(o.background.cv).css(o.css);
            $(o.foreground.cv).css(o.css);
          },
          background: {
            cv: null,
            cx: null//,
            // opacity: 0,
            // x: 0,
            // y: 0,
            // width: null,
            // height: null
          },
          foreground: {
            cv: null,
            cx: null,
            opacity: 0,
            x: 0,
            y: 0,
            width: null,
            height: null
          },
          paint: function () {

            /*o.display.background.cx.drawImage(
              o.imgs[o.engine.looping.current].el,
              0,
              0,
              o.display.background.cv.width,
              o.display.background.cv.height
              );
            */
            // o.foreground.cx.drawImage(o.imgs[o.engine.looping.current].el, 0, 0, o.foreground.cv.width, o.foreground.cv.height);

            o.display.background.cx.globalAlpha = 1;
            o.display.background.cx.drawImage(
              o.slides[o.engine.looping.current].img.el,
              0,
              0,
              o.display.background.cv.width,
              o.display.background.cv.height
              );

            // todo:
            // keep working system until we swap out for double canvases
            o.display.background.cx.globalAlpha = o.display.foreground.opacity;
            o.display.background.cx.drawImage(
              o.slides[o.engine.looping.next].img.el,
              o.display.foreground.x,
              o.display.foreground.y,
              o.display.foreground.cv.width,
              o.display.foreground.cv.height
              );
            /*
            o.display.foreground.cx.globalAlpha = o.display.foreground.opacity;
            o.display.foreground.cx.drawImage(
              o.slides[o.looping.next].img.el,
              o.display.foreground.x,
              o.display.foreground.y,
              o.display.foreground.cv.width,
              o.display.foreground.cv.height
              );
            */

          }
        }, /// display
        ui: (function () {
          var
            _ui,
            ui;

          _ui = {
            cv: null,
            cx: null,
            show: function () {},
            hide: function () {},
            getTouchLoc: function () {},
            paint: function () {},
            tilesheet: {
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
            icon: {},
            chrome: {
              footer: null, // img_data

              // x:
              // y:
              // static: img_data
              // hover: img_data
              prev: {},
              next: {},
              play: {},
              pause: {}
            },
            make: {
              cv: null, // a scratchpad canvas for use by make
              cx: null,
              footer: function () {
                // make footer background
                var
                  cv = ui.make.cv,
                  cx = ui.make.cx,
                  tilesheet_img = ui.tilesheet.img,
                  y = 0,
                  x_left,
                  x_right,
                  x_mid,
                  width_mid,
                  x_footer_tab,
                  y_footer_tab;

                // set dimensions and clear the make scratchpad canvas
                cv.width = ui.cv.width;
                cv.height = tilesheet_img.height;

                // calculate where to draw the shadow
                x_left = 0;
                x_right = cv.width - ui.tilesheet.shadow.right.width;
                x_mid = x_left + ui.tilesheet.shadow.left.width;
                width_mid = x_right - x_mid;

                // calculate the x location to draw the tab graphic from
                x_footer_tab = Math.round((cv.width - ui.tilesheet.footer_tab.width) / 2);
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
              buttons: function () {},
              scaleIcons: function (icons) {
                // scale up icons when they need to match a backing scale > 1
                // arguments: icons is an object, passed by reference
                var
                  icon,
                  button,
                  button_name,
                  i,
                  i_loc;

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
                      for (i = 0; i < icon.arr.length; i += 1) {
                        i_loc = icon.arr[i];
                        i_loc[0] *= o.backing_scale;
                        i_loc[1] *= o.backing_scale;
                      }
                    }
                  }
                }
                //}
              },
              cutIcon: function (cx, icon) {
                // cut an icon shape out of a shape drawn on the canvas
                // requires: coordinates that overlap and are anti clockwise
                // called by: cutStaticButton(), cutHoverButton(), darkenIcon()
                var
                  i,
                  i_x, i_y,
                  x, y;

                x = icon.x;
                y = icon.y;

                if (icon.hasOwnProperty('adjust')) {
                  x += icon.adjust.x || 0;
                  y += icon.adjust.y || 0;
                }

                cx.moveTo(icon.x, icon.y);

                for (i = 0; i < icon.arr.length; i += 1) {
                  i_x = x + icon.arr[i][0];
                  i_y = y + icon.arr[i][1];
                  cx.lineTo(i_x, i_y);
                }
              },
              cutStaticButton: function (cv, cx, icon) {
                cx.beginPath();
                cx.rect(0, 0, cv.width, cv.height); // clockwise
                _ui.make.cutIcon(cx, icon);
                cx.fill();
                cx.closePath();
              },
              cutHoverButton: function (cx, icon, half_height, fill_style) {
                // arguments: fill_style is optional, defaults to white
                var radius = half_height - 2;
                cx.fillStyle = fill_style || "#fff";
                cx.beginPath();
                cx.arc(icon.centre.x, icon.centre.y, radius, 0, THREESIXTY, false);
                _ui.make.cutIcon(cx, icon);
                cx.fill();
                cx.closePath();
              },
              darkenIcon: function (cx, icon, fill_style) {
                // arguments: fill_style is optional
                cx.fillStyle = fill_style || 'rgba(0, 0, 0, 0.4)';
                cx.beginPath();
                _ui.make.cutIcon(cx, icon);
                cx.fill();
                cx.closePath();
              }
            },
            addHandlers: function () {
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
            footer_height: 40, // todo: move this to settings?
            init: function () {
              // runs once only
              // called by callback on first image load

              _ui.cv = $('canvas.' +the.prefs.slides_ui_class, $wrapper)[0];
              _ui.cx = _ui.cv.getContext("2d");

              // scale up the button icons if hi-res or retina
              if (o.backing_scale !== 1) {
                _ui.make.scaleIcons(_ui.icon);
              }

              // load in tilesheet, and run a callback to process it once it has loaded




              _ui.addHandlers();




              // load o.settings.tilesheet
              // and fire callback once it's loaded
            },
            resize: function () {
              // o.resizeCanvas used to call these
              // o.ui.calculateSizes();
              // o.ui.paint();
            },
            mouse: {},
            touch: {}
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

      o.init();

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
      length = slide_array.length;

    for (i = 0; i < length; i += 1) {
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
      length = img_array.length,
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
    for (i = 0; i < length; i += 1) {
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

}(jQuery));