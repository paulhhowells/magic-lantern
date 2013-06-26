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
        $wrapper,
        THREESIXTY = (Math.PI / 180) * 360;

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
        
          o.display.init();
          o.ui.init();
        },
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
              start = Date.now ? Date.now() : +new Date,
              finish = start + o.settings.transition.duration;
  
            //if (o.state.animating) {phh.log('transition ERROR');} else {// phh.log('transition');}
  
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
              
              // replace vars above with these obj props
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
        },
        // }()),
        display: {
          init: function () {},
          css: {},
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
        },
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
              footer: function () {},
              buttons: function () {},
              scaleIcons: function (icons) {},          
              cutIcon: function (cx, icon) {},
              cutStaticButton: function (cv, cx, icon) {},
              cutHoverButton: function (cx, icon, half_height, fill_style) {},
              darkenIcon: function (cx, icon, fill_style) {}
            },
            addHandlers: function () {}
          };
          ui = {
            footer_height: 40,
            init: function () {
              // runs once only
              
              // scale up the button icons if hi-res or retina
              if (o.backing_scale !== 1) {
                _ui.make.scaleIcons(_ui.icon);
              }
              
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
        }()),
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
        }
      };

      o.init();


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
      $(window).load(function (){
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