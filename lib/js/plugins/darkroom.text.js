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
  var colorInputForText = null;
  var select = null;

	Darkroom.plugins['text'] = Darkroom.Plugin.extend({
		// Init point
		startX: null,
		startY: null,

		defaults: {
      fontSize: 32,
      fontFamily: 'Times New Roman',
      colorInputForText: 'rgb(0,0,0)',
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
      this.textColorButton = buttonGroup.createButton({
        image: 'square',
        hide: true,
      });
      this.textSizeButton = buttonGroup.createButton({
        image: '',
        hide: true
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
			this.okButton.addEventListener('click', this.saveTexting.bind(this));
			this.cancelButton.addEventListener('click', this.releaseFocus.bind(this));
      this.textBoldButton.addEventListener('click', this.textBoldToggle.bind(this));
      this.textItalicButton.addEventListener('click', this.textItalicToggle.bind(this));
      this.textUnderlinedButton.addEventListener('click', this.textUnderlineToggle.bind(this));
      this.textColorButton.addEventListener('click', this.textColorButtonClick.bind(this));
      this.textSizeButton.addEventListener('click', this.textSizeButtonClick.bind(this));

			// Canvas events
			this.darkroom.canvas.on('mouse:down', this.onMouseDown.bind(this));
      this.darkroom.canvas.on('object:rotating', this.onObjectRotating.bind(this));

			this.darkroom.addEventListener('core:transformation', this.releaseFocus.bind(this));
      //Other main button activated (or on this clicked)
      this.darkroom.addEventListener('button-group:activate', this.activateSomeToolbarButton.bind(this));
      //Listen save action
      this.darkroom.addEventListener('button-group:save', this.saveTexting.bind(this));


      this.setTextColorButtonColor(this.options.colorInputForText);
      this.setTextSizeButtonSize(this.options.fontSize);
		},

    activateSomeToolbarButton: function(){
      if(itsMe)
        itsMe = false;
      else
        this.releaseFocus();
    },

    setTextSizeButtonSize: function(number){
      var element = this.textSizeButton.element;

      for(var i = 0, nodes = element.childNodes; i < nodes.length; i++){
        element.removeChild(nodes[i]);
      }

      element.appendChild(document.createTextNode(number));
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

		saveTexting: function () {
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
            height: height / image.getHeight()
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
      this.textBoldButton.hide(false);
      this.textItalicButton.hide(false);
      this.textUnderlinedButton.hide(false);
      this.textColorButton.hide(false);
      this.textSizeButton.hide(false);
      itsMe = true;
      this.darkroom.dispatchEvent('button-group:activate');
		},

		// Remove the text zone
		releaseFocus: function () {
			active = false;
      this.removeInput();
      var texts = this.darkroom.canvas.getObjects();
      for(var a = 0; a < texts.length; a++){
        var i = texts[a];
        if(i.text){
          this.darkroom.canvas.remove(i);
          a--;
        }
      }
			this.textButton.active(false);
			this.okButton.hide(true);
			this.cancelButton.hide(true);
      this.textBoldButton.hide(true);
      this.textItalicButton.hide(true);
      this.textUnderlinedButton.hide(true);
      this.textColorButton.hide(true);
      this.textSizeButton.hide(true);

			this.darkroom.canvas.defaultCursor = 'default';

		},

    //Change text weight (input must be visible)
    textBoldToggle: function(){
      if(input){
        if(input.style.fontWeight === 'bold'){
          input.style.fontWeight = 'normal';
        } else {
          input.style.fontWeight = 'bold';
        }
        input.focus();
      }
    },

    textItalicToggle: function(){
      if(input){
        if(input.style.fontStyle === 'italic'){
          input.style.fontStyle = 'normal';
        } else {
          input.style.fontStyle = 'italic';
        }
        input.focus();
      }
    },

    textUnderlineToggle: function(){
      if(input){
        if(input.style.textDecoration === 'underline'){
          input.style.textDecoration = 'blink';
        } else {
          input.style.textDecoration = 'underline';
        }
        input.focus();
      }
    },

    textColorButtonClick: function(){
      if(!colorInputForText){
        colorInputForText = document.createElement('input');
        colorInputForText.setAttribute('type','color');
        colorInputForText.setAttribute('value','#ffffff');
        colorInputForText.style.position = 'absolute';
        colorInputForText.style.left = '-9999px';
        colorInputForText.style.top = '0px';
        document.body.appendChild(colorInputForText);

        colorInputForText.oninput = function(e){
          this.setTextColor(e.target.value);
        }.bind(this);

        setTimeout(function(){colorInputForText.click();}, 500);
      } else {
        colorInputForText.click();
      }
    },

    textSizeButtonClick: function(e){

      if(!select){
        //Select not exist - create his
        var textSize = [8,9,10,13,14,16,18,20,22,24,28,32,36,40,46,52,58,64,72];
        var element = this.textSizeButton.element;
        var elementPosition = getOffset(this.textSizeButton.element);
        var self = this;

        select = document.createElement('select');
        for(var i = 0; i < textSize.length; i++){
          var option = document.createElement('option');
          option.setAttribute('value', textSize[i].toString());
          var text = document.createTextNode(textSize[i].toString());
          option.appendChild(text);
          select.appendChild(option);
        }
        select.style.display = 'block';
        select.style.position = 'absolute';
        select.style.left = elementPosition.left + 'px';
        select.style.top = elementPosition.top + element.offsetHeight + 'px';
        select.style.zIndex = 99999999;
        select.value = this.options.fontSize;

        select.onchange = function(){

          self.setTextSizeButtonSize(select.value);
          select.style.display = 'none';
          self.options.fontSize = select.value;
          if(input){
            input.style.fontSize = select.value + 'px';
          }
        }
        document.body.appendChild(select);
      } else {
        if(select.style.display === 'none'){
          select.style.display = 'block';
        } else {
          select.style.display = 'none';
        }
      }
    },

    setTextColor: function(color){
      this.setTextColorButtonColor(color);
      if(input){
        input.style.color = color;
        input.focus();
      }
    },

    setTextColorButtonColor: function (color){
      this.textColorButton.element.getElementsByTagName('svg')[0].style.fill = color;
    },

    getTextColorButtonColor: function(){
      return this.textColorButton.element.getElementsByTagName('svg')[0].style.fill;
    },

		addInput: function (x, y, text, object) {
			var containerOfCanvas = document.getElementsByTagName('canvas')[0].parentElement;
			input = document.createElement('input');
			input.type = 'text';
			input.style.position = 'absolute';
			input.style.left = x + 'px';
			input.style.top = y + 'px';
      input.className = 'darkroom-input';
      input.style.fontSize = this.options.fontSize + 'px';
      input.style.fontFamily = this.options.fontFamily;
      input.style.color = this.getTextColorButtonColor();

      if(object){
        input.value = object.getText();
        object.setText('');
        input.style.fontStyle = object.getFontStyle();
        input.style.fontWeight = object.getFontWeight();
        input.style.textDecoration = object.getTextDecoration();
      }

			var self = this;

			input.onkeydown = function (e) {
				var keyCode = e.keyCode;
				if (keyCode === 13) {
          var style = window.getComputedStyle(this);
          var options = {
            fontSize: style.fontSize,
            fontStyle: style.fontStyle,
            fontWeight: style.fontWeight,
            textDecoration: style.textDecoration,
            color: style.color
          }

					self.renderTextOnVisibleCanvas(this.value,
            parseInt(style.left, 10) + parseInt(style.paddingLeft) +
            parseInt(style.borderLeftWidth) + parseInt(style.marginLeft),
            parseInt(style.top, 10) +
            parseInt(style.paddingTop) + parseInt(style.borderTopWidth) + parseInt(style.marginTop) + 1,
            options,
            object);
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

		renderTextOnVisibleCanvas: function(txt, x, y, options, object) {
      if(object){

        object.setText(txt);
        object.setOptions({
          fontSize: parseInt(options.fontSize, 10),
          fontWeight: options.fontWeight,
          fontStyle:  options.fontStyle,
          textDecoration: options.textDecoration,
          fill: options.color
        });
        this.darkroom.canvas.renderAll();
      } else {
        text = new fabric.Text(txt, {
          fontSize: this.options.fontSize,
          fontFamily: this.options.fontFamily,
          left: x,
          top: y,
          fontWeight: options.fontWeight,
          fontStyle:  options.fontStyle,
          textDecoration: options.textDecoration,
          fill: options.color,
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
          self.removeInput();
          if(typeof this.timeout !== 'undefined'){
            if((new Date()).getTime() - this.timeout < 500){
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

  //For calculate position and size of element
  function getOffset(elem) {
    if (elem.getBoundingClientRect) {
      return getOffsetRect(elem)
    } else {
      return getOffsetSum(elem)
    }
  }

  function getOffsetSum(elem) {
    var top=0, left=0
    while(elem) {
      top = top + parseInt(elem.offsetTop)
      left = left + parseInt(elem.offsetLeft)
      elem = elem.offsetParent
    }

    return {top: top, left: left}
  }

  function getOffsetRect(elem) {
    // (1)
    var box = elem.getBoundingClientRect()

    // (2)
    var body = document.body
    var docElem = document.documentElement

    // (3)
    var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop
    var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft

    // (4)
    var clientTop = docElem.clientTop || body.clientTop || 0
    var clientLeft = docElem.clientLeft || body.clientLeft || 0

    // (5)
    var top  = box.top +  scrollTop - clientTop
    var left = box.left + scrollLeft - clientLeft

    return { top: Math.round(top), left: Math.round(left) }
  }

})();
