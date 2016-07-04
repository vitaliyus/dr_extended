/**
 * Created by DzEN on 6/29/2016.
 */
(function(){
  var Path = Darkroom.Transformation.extend({
    applyTransformation: function(canvas, image, next) {

      var viewport = Darkroom.Utils.computeImageViewPort(image);
      var imageWidth = viewport.width;
      var imageHeight = viewport.height;
      var paths = this.options.paths;

      for(var a in paths){
        var object = new fabric.Path(paths[a].path.join(''), paths[a]);

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
  var active = false;
  var itsMe = false;
  var colorInputForPaint = null;
  var select = null;
  Darkroom.plugins['paint'] = Darkroom.Plugin.extend({
    // Init point
    startX: null,
    startY: null,

    defaults: {
      brushSize: 10,
      colorInputForPaint: 'rgb(0,0,0)'
    },

    initialize: function InitDarkroomCropPlugin() {
      var buttonGroup = this.darkroom.toolbar.createButtonGroup();
      this.paintButton = buttonGroup.createButton({
        image: 'brush'
      });
      this.paintColorButton = buttonGroup.createButton({
        image: 'square',
        hide: true,
      });
      this.paintSizeBrush = buttonGroup.createButton({
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
      this.paintButton.addEventListener('click', this.togglePainting.bind(this));
      this.okButton.addEventListener('click', this.savePainting.bind(this));
      this.cancelButton.addEventListener('click', this.releaseFocus.bind(this));
      this.paintColorButton.addEventListener('click', this.paintColorButtonClick.bind(this));
      this.paintSizeBrush.addEventListener('click', this.paintSizeButtonClick.bind(this));

      //Canvas event
      this.darkroom.addEventListener('core:transformation', this.releaseFocus.bind(this));
      this.darkroom.addEventListener('button-group:activate', this.activateSomeToolbarButton.bind(this));

      this.darkroom.canvas.freeDrawingCursor = "crosshair";
      

      this.setBrushSizeButtonSize(this.options.brushSize);
      this.setPaintColorButtonColor(this.options.colorInputForPaint);
      this.darkroom.canvas.freeDrawingBrush.color = this.options.colorInputForPaint;
      this.darkroom.canvas.freeDrawingBrush.width = this.options.brushSize;
    },

    activateSomeToolbarButton: function(){
      if(itsMe)
        itsMe = false;
      else
        this.releaseFocus();
    },

    setBrushSizeButtonSize: function(number){
      var element = this.paintSizeBrush.element;

      for(var i = 0, nodes = element.childNodes; i < nodes.length; i++){
        element.removeChild(nodes[i]);
      }

      element.appendChild(document.createTextNode(number));

    },

    paintColorButtonClick: function(){
      if(!colorInputForPaint){
        colorInputForPaint = document.createElement('input');
        colorInputForPaint.setAttribute('type','color');
        colorInputForPaint.setAttribute('value','#ffffff');
        colorInputForPaint.style.position = 'absolute';
        colorInputForPaint.style.left = '-9999px';
        colorInputForPaint.style.top = '0px';
        document.body.appendChild(colorInputForPaint);

        colorInputForPaint.oninput = function(e){
          this.setPaintColor(e.target.value);
        }.bind(this);

        setTimeout(function(){colorInputForPaint.click();}, 500);
      } else {
        colorInputForPaint.click();
      }
    },

    setPaintColor: function(color){
      this.setPaintColorButtonColor(color);
      this.darkroom.canvas.freeDrawingBrush.color = color;
    },

    setPaintColorButtonColor: function(color){
      this.paintColorButton.element.getElementsByTagName('svg')[0].style.fill = color;
    },

    togglePainting: function(){
      if (!this.hasFocus())
        this.requireFocus();
      else
        this.releaseFocus();
    },

    savePainting: function(){
      if (!this.hasFocus())
        return;

      var image = this.darkroom.image;
      var objectsOnCanvas = this.darkroom.canvas.getObjects();
      var paths = [];

      for(var i in objectsOnCanvas){
        var obj = objectsOnCanvas[i];
        if(obj.hasOwnProperty('path')){
          var writer = obj.toJSON();

          // Compute crop zone dimensions
          var top = writer.top - image.getTop();
          var left = writer.left - image.getLeft();
          var width = writer.width;
          var height = writer.height;

          writer.additional = {
            top: top / image.getHeight(),
            left: left / image.getWidth(),
            width: width / image.getWidth(),
            height: height / image.getHeight(),
          }

          paths.push(writer);
        }
      }

      this.darkroom.applyTransformation(new Path({paths: paths}));
    },

    hasFocus: function () {
      return active;
    },

    requireFocus: function(){
      active = true;
      this.darkroom.canvas.defaultCursor = 'crosshair';

      this.paintButton.active(true);
      this.okButton.hide(false);
      this.cancelButton.hide(false);
      this.paintColorButton.hide(false);
      this.paintSizeBrush.hide(false);
      this.darkroom.canvas.isDrawingMode = true;
      itsMe = true;
      this.darkroom.dispatchEvent('button-group:activate');
    },

    releaseFocus: function(){
      active = false;
      var paths = this.darkroom.canvas.getObjects();
      for(var a = 0; a < paths.length; a++){
        var i = paths[a];
        if(i.path){
          this.darkroom.canvas.remove(i);
          a--;
        }
      }
      this.paintButton.active(false);
      this.okButton.hide(true);
      this.cancelButton.hide(true);
      this.paintColorButton.hide(true);
      this.paintSizeBrush.hide(true);
      this.darkroom.canvas.isDrawingMode = false;
    },

    paintSizeButtonClick: function(e){

      if(!select){
        //Select not exist - create his
        var brushSize = [];

        for(var i = 1; i < 26; i++)
          brushSize.push(i);

        var element = this.paintSizeBrush.element;
        var elementPosition = getOffset(this.paintSizeBrush.element);
        var self = this;

        select = document.createElement('select');
        for(var i = 0; i < brushSize.length; i++){
          var option = document.createElement('option');
          option.setAttribute('value', brushSize[i].toString());
          var text = document.createTextNode(brushSize[i].toString());
          option.appendChild(text);
          select.appendChild(option);
        }
        select.style.display = 'block';
        select.style.position = 'absolute';
        select.style.left = elementPosition.left + 'px';
        select.style.top = elementPosition.top + element.offsetHeight + 'px';
        select.style.zIndex = 99999999;
        select.value = this.darkroom.canvas.freeDrawingBrush.width;

        select.onchange = function(){
          self.setBrushSizeButtonSize(select.value);
          select.style.display = 'none';
          self.darkroom.canvas.freeDrawingBrush.width = select.value;
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
  });
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

