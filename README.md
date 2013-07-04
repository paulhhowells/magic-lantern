magic-lantern
=============

version: 0.3 - unfinished

## description
* a canvas based slideshow providing beautiful dissolves
* to support standard, hi-res and retina displays on iOS and desktop browsers
* responds to both mouse and touch events
* provides a css & js fallback for browsers that don’t support canvas
* tested within Drupal 7

## notes
Using jQuery 1.5 for Drupal 7 compatibility

## open source
Help to wrap this in a Drupal module would be very welcome.
Pull requests for the javascript or css will not be sought before I reach version 1.0.

## to do
* test on Android
* test on a Windows 8 device with simultaneous touch and mouse events
* wrap in a Drupal 7 module
* port Drupal 7 module to Drupal 8

* debug
    * touch play pause control
    * iphone retina ui graphics have stopped displaying

* touch feedback
    * signal on touch start, perhaps followed by a fadeout and shape change
    * signal on touch end and leaving button area

* features
    * add touch swipe to trigger next and previous
    * when slide is (wrapped in) a link discover and present url

