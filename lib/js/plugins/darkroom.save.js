(function() {
'use strict';

Darkroom.plugins['save'] = Darkroom.Plugin.extend({

  defaults: {
    callback: function() {
      var self = this;
      this.darkroom.selfDestroy(function(img){
        var link = document.createElement('a');
        link.setAttribute('href',img.src);
        link.setAttribute('download','download');
        link.click();
        if(self.options.userCallback){
          self.options.userCallback();
        }
      });
    },
    userCallback: null
  },

  initialize: function InitializeDarkroomSavePlugin() {
    var buttonGroup = this.darkroom.toolbar.createButtonGroup();

    this.destroyButton = buttonGroup.createButton({
      image: 'save'
    });

    this.destroyButton.addEventListener('click', this.saving.bind(this));
  },

  saving: function(){
    this.darkroom.dispatchEvent('button-group:save');
    setTimeout(this.options.callback.bind(this), 1000);
  }
});

})();
