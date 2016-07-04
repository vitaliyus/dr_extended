(function () {
  'use strict';

  var Text = Darkroom.Transformation.extend({
    applyTransformation: function(canvas, image, next) {

      var viewport = Darkroom.Utils.computeImageViewPort(image);
      var imageWidth = viewport.width;
      var imageHeight = viewport.height;
      var texts = this.options.texts;

      for(var a in texts){
        var object = new fabric.Text(texts[a].text,texts[a]);

        var left = object.additional.left * imageWidth;
        var top = object.additional.top * imageHeight;
        var width = object.additional.width * imageWidth;
        var height = object.additional.height * imageHeight;

        object.setLeft(left);
        object.setTop(top);

        object.setScaleX(width / object.getWidth());
        object.setScaleY(height / object.getHeight());

        //object.setFontSize(object.getFontSize() * Math.max(ratio.H,ratio.W));
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

    hasInput: false,
    input: null,
    active: false,
    text: '',
    textIsActive: false,
    itsMe: false,

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
      this.textBoldButton = buttonGroup.createButton({
        image: 'bold-text',
        hide: true,
      });
      this.textItalicButton = buttonGroup.createButton({
        image: 'italicize-text',
        hide: true,
      });
      this.textUnderlinedButton = buttonGroup.createButton({
        image: 'underline-text',
        hide: true,
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
      this.textBoldButton.addEventListener('click', this.textBoldToggle.bind(this));
      this.textItalicButton.addEventListener('click', this.textItalicToggle.bind(this));
      this.textUnderlinedButton.addEventListener('click', this.textUnderlineToggle.bind(this));

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

      var image = this.darkroom.image;
      var objectsOnCanvas = this.darkroom.canvas.getObjects();
      var texts = [];

      for(var i in objectsOnCanvas){
        var obj = objectsOnCanvas[i];
        if(obj.hasOwnProperty('text')){
          var writer = obj.toJSON();

          // Compute crop zone dimensions
          var top = writer.top - image.getTop();
          var left = writer.left - image.getLeft();
          var width = writer.width;
          var height = writer.height;

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
      return this.active;
    },

    // Create the text
    requireFocus: function () {
      this.active = true;
      this.darkroom.canvas.defaultCursor = 'crosshair';

      this.textButton.active(true);
      this.okButton.hide(false);
      this.cancelButton.hide(false);
      this.textBoldButton.hide(false);
      this.textItalicButton.hide(false);
      this.textUnderlinedButton.hide(false);
      itsMe = true;
      this.darkroom.dispatchEvent('button-group:activate');
    },

    // Remove the text zone
    releaseFocus: function () {
      this.active = false;
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
      this.textBoldButton.hide(true);
      this.textItalicButton.hide(true);
      this.textUnderlinedButton.hide(true);

      this.darkroom.canvas.defaultCursor = 'default';

    },

    textBoldToggle: function(){
      if(this.input){
        if(this.input.style.fontWeight === 'bold'){
          this.input.style.fontWeight = 'normal';
        } else {
          this.input.style.fontWeight = 'bold';
        }
        this.input.focus();
      }
    },

    textItalicToggle: function(){
      if(this.input){
        if(this.input.style.fontStyle === 'italic'){
          this.input.style.fontStyle = 'normal';
        } else {
          this.input.style.fontStyle = 'italic';
        }
        this.input.focus();
      }
    },

    textUnderlineToggle: function(){
      if(this.input){
        if(this.input.style.textDecoration === 'underline'){
          this.input.style.textDecoration = 'blink';
        } else {
          this.input.style.textDecoration = 'underline';
        }
        this.input.focus();
      }
    },

    addInput: function (x, y, text, object) {
      var containerOfCanvas = document.getElementsByTagName('canvas')[0].parentElement;
      this.input = document.createElement('input');
      this.input.type = 'text';
      this.input.style.position = 'absolute';
      this.input.style.left = x + 'px';
      this.input.style.top = y + 'px';
      this.input.className = 'darkroom-input';
      this.input.style.fontSize = '30px';
      this.input.style.fontFamily = 'Times New Roman';

      if(object){
        this.input.value = object.getText();
        object.setText('');
        this.input.style.fontStyle = object.getFontStyle();
        this.input.style.fontWeight = object.getFontWeight();
        this.input.style.textDecoration = object.getTextDecoration();
      }

      var self = this;

      this.input.onkeydown = function (e) {
        var keyCode = e.keyCode;
        if (keyCode === 13) {
          var style = window.getComputedStyle(this);
          var options = {
            fontStyle: style.fontStyle,
            fontWeight: style.fontWeight,
            textDecoration: style.textDecoration
          }

          self.renderText(this.value,
            parseInt(style.left, 10) + parseInt(style.paddingLeft) +
            parseInt(style.borderLeftWidth) + parseInt(style.marginLeft),
            parseInt(style.top, 10) +
            parseInt(style.paddingTop) + parseInt(style.borderTopWidth) + parseInt(style.marginTop) + 1,
            options,
            object);
          containerOfCanvas.removeChild(self.input);
          this.asInput = false;
        }
      };
      containerOfCanvas.appendChild(this.input);
      this.input.focus();

      this.hasInput = true;
    },

    removeInput: function(){
      if(this.input){
        var containerOfCanvas = document.getElementsByTagName('canvas')[0].parentElement;
        isDescendant(containerOfCanvas, this.input)? containerOfCanvas.removeChild(this.input) : null;
      }
    },

    renderText: function(txt, x, y, options, object) {
      if(object){
        object.setText(txt);
        object.setOptions({
          fontWeight: options.fontWeight,
          fontStyle:  options.fontStyle,
          textDecoration: options.textDecoration,
        });
        this.darkroom.canvas.renderAll();
      } else {
        this.text = new fabric.Text(txt, {
          fontSize: 30,
          left: x,
          top: y,
          fontWeight: options.fontWeight,
          fontStyle:  options.fontStyle,
          textDecoration: options.textDecoration,
          lockScalingX: true,
          lockScalingY: true,
          lockUniScaling: true
        });

        this.text.on('mouseover', function(e) {
          textIsActive = true;
        });
        this.text.on('mouseout', function(e) {
          textIsActive = false;
        });
        var self = this;
        this.text.on('mousedown', function(e){
          self.removeInput();
          if(typeof this.timeout !== 'undefined'){
            if((new Date()).getTime() - this.timeout < 500){
              self.addInput(this.getLeft(), this.getTop(), this.getText(), this);
            }
          }
          this.timeout = (new Date()).getTime();
        });
        this.darkroom.canvas.add(this.text);
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
/**
 * Created by DzEN on 6/29/2016.
 */
