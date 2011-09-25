var BklynFlow = new Class({
  
  initialize: function(thumbs, parentId) {    
    // Sensible defaults
    this.frameClass = 'flow-frame';
    this.imageClass = 'flow-image';
    this.cellClass = 'flow-cell';
    this.rotationValue = '30deg';
    this.zOffset = '-100px';
    this.transitionTime = '400ms';
    
    // When set to false, tapping a deselected cell will center that cell
    // but will not trigger its action. When true, tapping any cell will
    // both center the cell and trigger its action.
    this.tapToSelectTriggersAction = true;
    
    // Get MooTools recognizing touch events
    ['touchstart', 'touchmove', 'touchend'].each(function(type){
      Element.NativeEvents[type] = 2;
    });

    // Initialize stuff
    this.thumbs = thumbs;
    this.innerWrappers = new Array();
    this.images = new Array();
    this.cells = new Array();
    this.cellWidths = new Array();
    this.parentDiv = $(parentId);
    this.index = 0;
    this.width = 0;
    this.maxImageHeight = 0;
    
    var parentDivPosition = this.parentDiv.getPosition();
    this.leftOffset = parentDivPosition.x;
    this.currentXOffset = 0;
    
    var frame = new Element('div', {
      'class': this.frameClass
    });
    this.frame = frame;

    var self = this;
    
    this.thumbs.each(function(thumb, i) {
      var newCell = new Element('div', {
        'class': self.cellClass
      });
      newCell.setStyles({
        '-webkit-perspective': '500',
        '-moz-perspective': '500',
        '-o-perspective': '500',
        'perspective': '500',
        'float': 'left'
      })
      var imageElement = new Element('img', {
        'src': thumb.image,
        'class': self.imageClass
      });
      imageElement.setStyles({
        'display': 'block',
        'margin': '0px auto',
        'margin-bottom': '0.5em'
      });
      var innerWrapper = new Element('div');
      innerWrapper.setStyles({
        'text-align': 'center',
        '-webkit-transition-property': '-webkit-transform',
        '-webkit-transition-duration': self.transitionTime,
        // moz/opera/w3c
        '-moz-transition-property': '-moz-transform',
        '-moz-transition-duration': self.transitionTime,
        '-o-transition-property': '-o-transform',
        '-o-transition-duration': self.transitionTime,
        'transition-property': 'transform',
        'transition-duration': self.transitionTime
      });
      innerWrapper.adopt(imageElement);
      innerWrapper.appendText(thumb.caption);
      newCell.adopt(innerWrapper);
      frame.adopt(newCell);
      self.cells[i] = newCell;
      self.images[i] = imageElement;
      self.innerWrappers[i] = innerWrapper;
      
      // As each image loads, grow the container to fit all the cells
      imageElement.addEvent('load', function() {
        self.adjustCellWidths();
        
        var tempSize = imageElement.getSize();
        if(tempSize.y > self.maxImageHeight) {
          self.maxImageHeight = tempSize.y;
        }
        self.adjustYOffsets();
        
        self.select(self.index);
      });
    });

    this.parentDiv.setStyles({
      overflow: 'hidden'
    });
    
    frame.setStyles({
      height: 'inherit',
      position: 'relative', 
      '-webkit-transition-property': '-webkit-transform',
      '-webkit-transition-duration': this.transitionTime,
      '-webkit-transition-timing-function': 'ease-out',
      '-moz-transition-property': '-moz-transform',
      '-moz-transition-duration': this.transitionTime,
      '-moz-transition-timing-function': 'ease-out', // maybe works?
      '-o-transition-property': '-o-transform',
      '-o-transition-duration': this.transitionTime,
      '-o-transition-timing-function': 'ease-out',
      'transition-property': 'transform',
      'transition-duration': this.transitionTime,
      'transition-timing-function': 'ease-out'
    });

    this.parentDiv.adopt(frame);
    
    // Delegate touch events
    this.parentDiv.addEvent('touchstart', function(e) {
      self.touchstart(event.touches[0].pageX);
      e.preventDefault();
    });
    
    this.parentDiv.addEvent('touchmove', function(e) {
      self.touchmove(event.touches[0].pageX);
      e.preventDefault();
    });
    
    this.parentDiv.addEvent('touchend', function(e) {
      self.touchend();
      e.preventDefault();
    });
    
    this.parentDiv.addEvent('mousedown', function(e) {
      self.mousedown = true;
      self.touchstart(e.event.pageX);
      e.preventDefault();
    });
    
    // Bound to the window because we want this to work even if the user
    // moves the mouse out of the bounds of the flow panel
    window.addEvent('mousemove', function(e) {
      if(self.mousedown) {
        self.touchmove(e.event.pageX);
        e.preventDefault();
      }
    });

    window.addEvent('mouseup', function(e) {
      if(self.mousedown) {
        self.mousedown = false;
        self.touchend();
        e.preventDefault();
      }
    });
  },
  
  // Record the widths of each cell and resize the frame to fit
  adjustCellWidths: function() {
    var self = this;
    self.images.each(function(image, i) {
      self.cellWidths[i] = image.getParent().getSize().x;
    });
    var sum = 0;
    for(var i = 0; i < self.cellWidths.length; i++) {
      sum += self.cellWidths[i];
    }
    
    self.width = sum;
    self.frame.setStyles({
      width: self.width
    });
  },
  
  touchstart: function(pageX) {
    this.touchstartX = pageX;
    this.touchDelta = 0;
    this.frame.setStyles({
      '-webkit-transition-duration': '0s',
      '-moz-transition-duration': '0s',
      '-o-transition-duration': '0s',
      'transition-duration': '0s'
    });
  },
  
  touchmove: function(pageX) {
    this.lastDelta = this.touchDelta;
    this.touchDelta = pageX - this.touchstartX;
    this.touchstartTime = new Date();
    
    var newOffset = this.currentXOffset + this.touchDelta;
    var centeredCellIndex = this.getIndexForOffset(newOffset);
    this.highlightCell(centeredCellIndex);
    this.frame.setStyles({
      '-webkit-transform': 'translate3d(' + newOffset + 'px,0,0)',
      '-moz-transform': 'translate3d(' + newOffset + 'px,0,0)',
      '-o-transform': 'translate3d(' + newOffset + 'px,0,0)',
      'transform': 'translate3d(' + newOffset + 'px,0,0)'
    });
  },
  
  touchend: function() {
    if(this.touchDelta == 0) {
      // No movement, i.e. a tap
      var tapX = this.touchstartX - this.currentXOffset - this.leftOffset;
      var tapIndex = this.getIndexForTapX(tapX);
      if(tapIndex !== null) {
        if(tapIndex == this.index) {
          // If the tap is on the selected cell
          this.thumbs[this.index].action(this.index);
        } else {
          this.frame.setStyles({
            '-webkit-transition-duration': this.transitionTime,
            '-moz-transition-duration': this.transitionTime,
            '-o-transition-duration': this.transitionTime,
            'transition-duration': this.transitionTime
          });
          this.select(tapIndex);
          if(this.tapToSelectTriggersAction) {
            this.thumbs[this.index].action(this.index);
          }
        }
      }
    } else {  
      // Movement, i.e. a panning gesture
      var deltaDelta = this.touchDelta - this.lastDelta;
      var timeDelta = (new Date()) - this.touchstartTime + 1;
      var exaggeratedTouchDelta = this.touchDelta + deltaDelta * 100 / timeDelta;
      var newOffset = this.currentXOffset + exaggeratedTouchDelta;

      this.select(this.getIndexForOffset(newOffset));
    }
    
    this.frame.setStyles({
      '-webkit-transition-duration': this.transitionTime,
      '-moz-transition-duration': this.transitionTime,
      '-o-transition-duration': this.transitionTime,
      'transition-duration': this.transitionTime
    });
  },
  
  // Adjust the positions of the cells so everything's aligned
  // with the bottom of the frame
  adjustYOffsets: function() {
    var self = this;
    this.images.each(function(image, i) {
      var tempSize = image.getSize();
      var cell = self.cells[i];
      cell.setStyles({
        position: 'relative',
        top: self.maxImageHeight - tempSize.y
      });
    }); 
  },
  
  // Make a list of the x offsets for each cell
  buildOffsetArray: function() {
    this.offsets = new Array();
    var self = this;
    this.cellWidths.each(function(cellWidth, i) {
      if(i == 0) {
        self.offsets[i] = cellWidth;
      } else {
        self.offsets[i] = self.offsets[i-1] + cellWidth;
      }
    });
  },
  
  // Given an x coordinate, return the index of the corresponding cell
  getIndexForTapX: function(tapX) {
    if(!$chk(this.offsets)) {
      this.buildOffsetArray();
    }
    if(tapX < 0) {
      return null;
    }
    for(var i = 0; i < this.offsets.length; i++) {
      var cellOffset = this.offsets[i];
      if(tapX < cellOffset) {
        return(i);
      }
    }
    return null;
  },
  
  // Given an offset, return the index of the centered cell
  getIndexForOffset: function(currentOffset) {
    if(!$chk(this.offsets)) {
      this.buildOffsetArray();
    }
    var parentSize = this.parentDiv.getSize();
    var halfParentWidth = 0.5 * parentSize.x;
    var xValueAtMiddle = halfParentWidth - currentOffset;
    for(var i = 0; i < this.offsets.length; i++) {
      var cellOffset = this.offsets[i]; 
      if(xValueAtMiddle < cellOffset) {
        return(i);
      }
    }
    return(this.offsets.length - 1);
  },
  
  widthOfPreviousImages: function(index) {
    var widthOfPreviousImages = 0;
    this.cellWidths.each(function(width, i) {
      if(i < index) {
        widthOfPreviousImages += width;
      }
    });
    return(widthOfPreviousImages);
  },
  
  highlightCell: function(index) {
    var self = this;
    this.innerWrappers.each(function(innerWrapper, i) {
      var image = self.images[i];
      if(i < index) {
        //innerWrapper.setStyle('-webkit-transform', 'translate3d(0,0,' + self.zOffset + ') rotateY(' + self.rotationValue + ')');
        innerWrapper.setStyles({
          '-webkit-transform': 'translate3d(0,0,' + self.zOffset + ') rotateY(' + self.rotationValue + ')',
          '-moz-transform': 'translate3d(0,0,' + self.zOffset + ') rotateY(' + self.rotationValue + ')',
          '-o-transform': 'translate3d(0,0,' + self.zOffset + ') rotateY(' + self.rotationValue + ')',
          'transform': 'translate3d(0,0,' + self.zOffset + ') rotateY(' + self.rotationValue + ')'
        });
      }
      if(i == index) {
        //innerWrapper.setStyle('-webkit-transform', 'translate3d(0,0,0) rotateY(0deg)');
        innerWrapper.setStyles({
          '-webkit-transform': 'translate3d(0,0,0) rotateY(0deg)',
          '-moz-transform': 'translate3d(0,0,0) rotateY(0deg)',
          '-o-transform': 'translate3d(0,0,0) rotateY(0deg)',
          'transform': 'translate3d(0,0,0) rotateY(0deg)'
        });
      }
      if(i > index) {
        //innerWrapper.setStyle('-webkit-transform', 'translate3d(0,0,' + self.zOffset + ') rotateY(-' + self.rotationValue + ')');
        innerWrapper.setStyles({
          '-webkit-transform': 'translate3d(0,0,' + self.zOffset + ') rotateY(-' + self.rotationValue + ')',
          '-moz-transform': 'translate3d(0,0,' + self.zOffset + ') rotateY(-' + self.rotationValue + ')',
          '-o-transform': 'translate3d(0,0,' + self.zOffset + ') rotateY(-' + self.rotationValue + ')',
          'transform': 'translate3d(0,0,' + self.zOffset + ') rotateY(-' + self.rotationValue + ')'
        });
      }
    });
  },
  
  translateFrameToCell: function(newIndex) {
    var widthOfPreviousImages = this.widthOfPreviousImages(newIndex);
    var parentSize = this.parentDiv.getSize();
    var offset = (0.5*(parentSize.x - this.cellWidths[newIndex])) - widthOfPreviousImages;
    this.currentXOffset = offset;
    this.frame.setStyles({
      '-webkit-transform': 'translate3d(' + offset +'px,0,0)',
      '-moz-transform': 'translate3d(' + offset +'px,0,0)',
      '-o-transform': 'translate3d(' + offset +'px,0,0)',
      'transform': 'translate3d(' + offset +'px,0,0)'
    });
  },
  
  select: function(newIndex) {
    this.index = newIndex;
    this.highlightCell(newIndex);
    this.translateFrameToCell(newIndex);
  },
  
  selectNext: function() {
    if(this.index < this.thumbs.length-1) {
      this.select(this.index + 1)
    }
  },
  
  selectPrevious: function() {
    if(this.index > 0) {
      this.select(this.index - 1)
    }
  },
  
  turnOnArrowKeys: function() {
    var self = this;
    window.addEventListener('keydown', function(e) {
      if (e.keyCode == 37) {        // Left
        self.selectPrevious();
      } else if (e.keyCode == 39) { // Right
        self.selectNext();
      }
    });
  }
});
