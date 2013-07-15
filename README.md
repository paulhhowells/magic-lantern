magic-lantern
=============

version: 0.4 - unfinished

## description
* a canvas based slideshow providing beautiful dissolves
* to support standard, hi-res and retina displays on iOS and desktop browsers
* responds to both mouse and touch events
* provides a css & js fallback for browsers that don’t support canvas
* tested within Drupal 7

## usage notes
Using jQuery 1.5 for Drupal 7 compatibility

## open source
Help to wrap this in a Drupal module would be very welcome, as would any comments or suggestions.
Pull requests for the javascript or css will not be sought before I reach a working version 1.0.

## to do
* fold in fallback for older browsers
* test on Android
* test on a Windows 8 device with simultaneous touch and mouse events
* wrap in a Drupal 7 module
* port Drupal 7 module to Drupal 8
* <strike>debug</strike>
* touch feedback
    * signal on touch start, perhaps followed by a fadeout and shape change
    * signal on touch end and leaving button area
* refactor!
* features
    * add touch swipe to trigger next and previous
    * when slide is (wrapped in) a link discover and present url
    * add controls to fallback 'mechanical' slideshow for older browsers?

## design notes
* profiling revealed the most significant bottleneck to be the rendering of background and foreground images on the (single) canvas. Using two canvases (one for the background, one for the foreground) immediately improved the situation as the browser found it less taxing to composite them as two DOM elements.  Use of two canvases created the opportunity to only paint the background when needed, which provided further performance gains.
 


