// Code taken from https://szimek.github.io/signature_pad/
import SignaturePad from "signature_pad";

const signaturePad = {
  
  wrapper: null,
  clearButton: null,
  undoButton: null,
  savePNGButton: null,
  canvas: null,
  signaturePad: null,   
  loadSignaturePad: function () {
    var _this = this;
    _this.wrapper = document.getElementById("signature-pad");    
    _this.clearButton = _this.wrapper.querySelector("[data-action=clear]");
    _this.undoButton = _this.wrapper.querySelector("[data-action=undo]");
    _this.savePNGButton = _this.wrapper.querySelector("[data-action=save-png]");
    _this.canvas = _this.wrapper.querySelector("canvas");    
    _this.signaturePad = new SignaturePad(_this.canvas);   
    _this.clearButton.addEventListener("click", function (event) {
      _this.signaturePad.clear();
    });    
    _this.undoButton.addEventListener("click", function (event) {
      var data = _this.signaturePad.toData();
    
      if (data) {
        data.pop(); // remove the last dot or line
        _this.signaturePad.fromData(data);
      }
    });
    _this.savePNGButton.addEventListener("click", function (event) {
      if (_this.signaturePad.isEmpty()) {
        alert("Please provide a signature first.");
      } else {
        var dataURL = _this.signaturePad.toDataURL();
        _this.download(dataURL, "signature.png");
      }
    });
  },
  // Adjust canvas coordinate space taking into account pixel ratio,
  // to make it look crisp on mobile devices.
  // This also causes canvas to be cleared.
  resizeCanvas: function() {
    var _this = this;
    
    // When zoomed out to less than 100%, for some very strange reason,
    // some browsers report devicePixelRatio as less than 1
    // and only part of the canvas is cleared then.
    var ratio =  Math.max(window.devicePixelRatio || 1, 1);
  
    // This part causes the canvas to be cleared
    _this.canvas.width = _this.canvas.offsetWidth * ratio;
    _this.canvas.height = _this.canvas.offsetHeight * ratio;
    _this.canvas.getContext("2d").scale(ratio, ratio);    

    // This library does not listen for canvas changes, so after the canvas is automatically
    // cleared by the browser, SignaturePad#isEmpty might still return false, even though the
    // canvas looks empty, because the internal data of this library wasn't cleared. To make sure
    // that the state of this library is consistent with visual state of the canvas, you
    // have to clear it manually.
    _this.signaturePad.clear();
  },
  download: function(dataURL, filename) {    
    if (navigator.userAgent.indexOf("Safari") > -1 && navigator.userAgent.indexOf("Chrome") === -1) {
      window.open(dataURL);
    } else {      
      var _this = this;
      var blob = _this.dataURLToBlob(dataURL);
      var url = window.URL.createObjectURL(blob);
  
      var a = document.createElement("a");
      a.style = "display: none";
      a.href = url;
      a.download = filename;
  
      document.body.appendChild(a);
      a.click();
  
      window.URL.revokeObjectURL(url);
    }
  },
  getDataURL: function(){
    var _this = this;
    return _this.signaturePad.toDataURL();
  },
  // One could simply use Canvas#toBlob method instead, but it's just to show
  // that it can be done using result of SignaturePad#toDataURL.
  dataURLToBlob:function (dataURL) {
    // Code taken from https://github.com/ebidel/filer.js
    var parts = dataURL.split(';base64,');
    var contentType = parts[0].split(":")[1];
    var raw = window.atob(parts[1]);
    var rawLength = raw.length;
    var uInt8Array = new Uint8Array(rawLength);

    for (var i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });  
  },  
  show: function(){
    var _this = this;
    _this.wrapper.hidden = false;
    _this.resizeCanvas();  
  },
  hide: function(){
    var _this = this;
    _this.wrapper.hidden = true;
  },
  toggle: function(){
    var _this = this;
    if(_this.wrapper.hidden){
      _this.show();
    }else{
      _this.hide();
    }
  }
};

export default signaturePad;