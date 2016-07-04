(function () {
  'use strict';

  var Text = Darkroom.Transformation.extend({
    applyTransformation: function(canvas, image, next) {

      var viewport = Darkroom.Utils.computeImageViewPort(image);
      var imageWidth = viewport.width;
      var imageHeight = viewport.height;
      var texts = this.options.texts;
      var ratio = {H: imageHeight / this.options.canvasH, W: imageWidth /this.options.canvasW};
      //In most case image is no stretching at all canvas and we can see some black border on top-bottom or left-right
      //This break coordinates the text at sourceCanvas, and then, we must know when render text really
      //Additional - is height (width) one this black border
      /*      var additional = ratio.H < ratio.W ?
       (imageHeight / ratio.W - this.options.canvasH) / 2 :
       (imageWidth / ratio.H - this.options.canvasW) / 2;

       var halfPoint = ratio.H < ratio.W ? this.options.canvasH / 2 : this.options.canvasW / 2;//Exmpl : 225
       var unit = Math.abs(additional / halfPoint);// 24 / 225 = 0.107 // 225 - 130 = 95 * 0.105
       console.log("halfPoint: ", halfPoint);
       console.log("additional: ", additional);*/

      for(var a in texts){
        var object = new fabric.Text(texts[a].text,texts[a]);
        /*        if( ratio.H < ratio.W ){
         object.setLeft(ratio.W * object.getLeft());
         object.setTop(ratio.H * (object.getTop() + (object.getTop() - halfPoint) * unit));
         } else {
         object.setLeft(ratio.W * (object.getLeft() + (object.getTop() - halfPoint) * unit));
         object.setTop(ratio.H * object.getTop());
         }*/
        object.setLeft(ratio.W * object.getLeft());
        object.setTop(ratio.H * object.getTop());

        /*        console.log("ImH, ImW, CH, CW, rH, rW, tL, tT, ntL, ntT", imageHeight, imageWidth, this.options.canvasH,
         this.options.canvasW, ratio.H, ratio.W, object.getLeft() / ratio.W, object.getTop()/ ratio.H,
         object.getLeft(), object.getTop());*/

        object.setFontSize(object.getFontSize() * Math.max(ratio.H,ratio.W));
        canvas.add(object);

      }

      var imageB64 = canvas.toDataURL();

      var snapshot = new Image();
      snapshot.onload = function() {
        // Validate image
        if (height < 1 || width < 1)
          return;

        var imgInstance = new fabric.Image(this, {
          // options to make the image static
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
          lockUniScaling: true,
          hasControls: false,
          hasBorders: false
        });

        var width = this.width;
        var height = this.height;

        // Update canvas size
        canvas.setWidth(width);
        canvas.setHeight(height);
        // Add image
        image.remove();
        canvas.add(imgInstance);
        next(imgInstance);
      };

      snapshot.src = imageB64;
    }
  });

  var hasInput = false;
  var input = null;
  var active = false;
  var text;
  var textIsActive = false;
  var itsMe = false;
  Darkroom.plugins['test'] = Darkroom.Plugin.extend({
    // Init point
    startX: null,
    startY: null,

    defaults: {
      // min crop dimension
      minHeight: 1,
      minWidth: 1,
      // ensure crop ratio
      ratio: null,
    },

    initialize: function InitDarkroomCropPlugin() {
      var buttonGroup = this.darkroom.toolbar.createButtonGroup();

      this.textButton = buttonGroup.createButton({
        image: 'text'
      });
      this.okButton = buttonGroup.createButton({
        image: 'done',
        type: 'success',
        hide: true
      });
      this.cancelButton = buttonGroup.createButton({
        image: 'close',
        type: 'danger',
        hide: true
      });

      // Buttons click
      this.textButton.addEventListener('click', this.toggleTexting.bind(this));
      this.okButton.addEventListener('click', this.seveTexting.bind(this));
      this.cancelButton.addEventListener('click', this.releaseFocus.bind(this));

      // Canvas events
      this.darkroom.canvas.on('mouse:down', this.onMouseDown.bind(this));
      this.darkroom.canvas.on('object:rotating', this.onObjectRotating.bind(this));

      this.darkroom.addEventListener('core:transformation', this.releaseFocus.bind(this));
      this.darkroom.addEventListener('button-group:activate', this.activateSomeToolbarButton.bind(this));
    },

    activateSomeToolbarButton: function(){
      if(itsMe)
        itsMe = false;
      else
        this.releaseFocus();
      //console.log(arguments);
    },
    // Init crop zone (main canvas)
    onMouseDown: function (event) {
      if (!this.hasFocus() || textIsActive) {
        return;
      }
      var canvas = this.darkroom.canvas;

      // recalculate offset, in case canvas was manipulated since last `calcOffset`
      canvas.calcOffset();
      var pointer = canvas.getPointer(event.e);
      var x = pointer.x;
      var y = pointer.y;
      canvas.discardActiveObject();
      this.removeInput();
      this.addInput(x, y);
    },

    onObjectRotating: function(event){
      if (!this.hasFocus()) {
        return;
      }

      if(input){
        this.removeInput();
      }
    },

    toggleTexting: function () {
      if (!this.hasFocus())
        this.requireFocus();
      else
        this.releaseFocus();
    },

    seveTexting: function () {
      if (!this.hasFocus())
        return;
      //Ratio from images
      //Case 1
      /*      var canvasH = this.darkroom.canvas.getHeight();
       var canvasW = this.darkroom.canvas.getWidth();
       var canvasSH = this.darkroom.sourceCanvas.getHeight();
       var canvasSW = this.darkroom.sourceCanvas.getWidth();
       var objectsOnCanvas = this.darkroom.canvas.getObjects();
       var texts = [];

       for(var i in objectsOnCanvas){
       var obj = objectsOnCanvas[i];
       if(obj.hasOwnProperty('text')){
       texts.push(obj.toJSON());
       }
       }
       this.darkroom.applyTransformation(new Text({texts: texts, canvasH: canvasH, canvasW: canvasW,
       canvasSH: canvasSH, canvasSW: canvasSW}));*/

      //Case 2
      var image = this.darkroom.image;

      var texts = [];

      for(var i in objectsOnCanvas){
        var obj = objectsOnCanvas[i];
        if(obj.hasOwnProperty('text')){
          var writer = obj.toJSON();

          // Compute crop zone dimensions
          var top = writer.getTop() - image.getTop();
          var left = writer.getLeft() - image.getLeft();
          var width = writer.getWidth();
          var height = writer.getHeight();

          writer.additional ={
            top: top / image.getHeight(),
            left: left / image.getWidth(),
            width: width / image.getWidth(),
            height: height / image.getHeight(),
          }

          texts.push(writer);
        }
      }

      this.darkroom.applyTransformation(new Text({texts: texts}));
    },

    // Test wether text zone is set
    hasFocus: function () {
      return active;
    },

    // Create the text
    requireFocus: function () {
      active = true;
      this.darkroom.canvas.defaultCursor = 'crosshair';

      this.textButton.active(true);
      this.okButton.hide(false);
      this.cancelButton.hide(false);
      itsMe = true;
      this.darkroom.dispatchEvent('button-group:activate');
    },

    // Remove the text zone
    releaseFocus: function () {
      active = false;
      this.removeInput();
      var texts = this.darkroom.canvas.getObjects();
      for(var a in texts){
        var i = texts[a];
        if(i.hasOwnProperty('text')){
          this.darkroom.canvas.remove(i);
        }
      }
      this.textButton.active(false);
      this.okButton.hide(true);
      this.cancelButton.hide(true);

      this.darkroom.canvas.defaultCursor = 'default';

    },

    addInput: function (x, y, text, object) {
      var containerOfCanvas = document.getElementsByTagName('canvas')[0].parentElement;
      input = document.createElement('input');
      input.type = 'text';
      input.style.position = 'absolute';
      input.style.left = x + 'px';
      input.style.top = y + 'px';
      input.className = 'darkroom-input';

      var self = this;

      input.onkeydown = function (e) {
        var keyCode = e.keyCode;
        if (keyCode === 13) {
          self.renderText(this.value, parseInt(this.style.left, 10), parseInt(this.style.top, 10), object);
          containerOfCanvas.removeChild(input);
          hasInput = false;
        }
      };
      containerOfCanvas.appendChild(input);
      input.focus();

      hasInput = true;
    },

    removeInput: function(){
      if(input){
        var containerOfCanvas = document.getElementsByTagName('canvas')[0].parentElement;
        isDescendant(containerOfCanvas, input)? containerOfCanvas.removeChild(input) : null;
      }
    },

    renderText: function(txt, x, y, object) {
      if(object){
        object.setText(txt);
        this.darkroom.canvas.renderAll();
      } else {
        text = new fabric.Text(txt, {
          fontSize: 30,
          left: x,
          top: y,
          lockScalingX: true,
          lockScalingY: true,
          lockUniScaling: true
        });
        text.on('mouseover', function(e) {
          textIsActive = true;
        });
        text.on('mouseout', function(e) {
          textIsActive = false;
        });
        var self = this;
        text.on('mousedown', function(e){
          if(typeof this.timeout !== 'undefined'){
            if((new Date()).getTime() - this.timeout < 500){
              this.setText("");
              self.addInput(this.getLeft(), this.getTop(), this.getText(), this);
            }
          }
          this.timeout = (new Date()).getTime();
        });
        this.darkroom.canvas.add(text);
      }
    },

  });
  // Helpers
  function isDescendant(parent, child) {
    var node = child.parentNode;
    while (node != null) {
      if (node == parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

})();
