/**
 * Created by DzEN on 6/27/2016.
 */
//calculate some



var ratioMax = Math.max(ratio.H, ratio.W);
var ratioMin = ratioMax === ratio.H? ratio.W : ratio.H;
var ratiosDiff = ratioMax - ratioMin;
var halfPoint = ratioMin === ratio.H ? this.options.canvasH / 2 : this.options.canvasW / 2;//225
var ratioAdditionalUnit = +(ratiosDiff / halfPoint).toFixed(4);


if(ratioMin === ratio.H){
  var fixed = (-1) * (halfPoint - object.getTop()) * ratioAdditionalUnit * 2;
  console.log("Result : ", halfPoint, object.getTop(), (ratio.H + fixed)* object.getTop(), ratioAdditionalUnit, fixed);
  object.setLeft(ratio.W * object.getLeft());
  object.setTop((ratio.H + fixed)* object.getTop());
} else {
  object.setLeft(ratio.W * object.getLeft());
  object.setTop(ratio.H * object.getTop());
}
