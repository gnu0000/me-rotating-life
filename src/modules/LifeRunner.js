//
// LifeRunner for the Rotating Life demo
// an old-style class in an ES6 module :)
// Craig Fitzgerald

import $ from "jquery";


export default function LifeRunner(canvas, options){
   var self = this;

   this.Init = function(canvas, options){
      self.InitAttributes(canvas, options);
      self.InitEvents();
      self.InitState ();
   };

   this.InitAttributes = function(canvas, options){
      self.activeSet  = 0;
      self.canvas     = $(canvas).get(0);
      self.ctx        = self.canvas.getContext('2d');
      self.scratch    = document.createElement('canvas');

      self.activePos  = {x:0, y:0};
      self.startSel   = {x:0, y:0};
      self.endSel     = {x:0, y:0};
      self.fpsInfo    = $("#fps span");
      self.fps        = 0;
      self.fpsTime    = 0;
      self.fpsStep    = 0;
      self.step       = 0;
      self.states     = [];
      self.pauseMode  = 0;
      self.selecting  = 0;
      self.drawMethod = 0;
      self.autoReap   = 0;
      self.bRule      = [3];
      self.sRule      = [2,3];

      self.options = $.extend({cellSize:12, cellGap:1, interval:20}, options || {});
      self.options.cellHue  = Math.random() * 360;
      self.options.bgHue    = Math.random() * 360;
      self.options.bgHueGap = Math.random() * 270 + 45;
      self.Resize();
   };

   this.InitEvents = function(){
      document.oncontextmenu = function(){return false};

      $(window).keydown(self.KeyDown)
               .keyup(self.KeyUp)
               .resize(self.Resize);

      $(self.canvas).mousedown(self.MouseDown)
                    .mouseup(self.MouseUp)
                    .mousemove(self.MouseMove);

      $("#rule").change(self.SetRule);
      $("#help").click(function(){$(this).hide()});
   };

   this.InitState = function(){
      self.CreateCells();
      //self.interval = setInterval(self.Step, self.options.interval);
   };

   this.CreateCells = function(){
      self.ClearCellGrid();
      self.step = 0;

      var type = Math.random();
      if (type < 0.10) return self.GenerateXY();      // 10%
      if (type < 0.20) return self.GenerateXYWalk();  // 10%
      if (type < 0.35) return self.GenerateXMirror(); // 15%
                       return self.GenerateRandom();  // 65%
   };

   this.Resize = function(){
      var newXGrid = Math.floor(self.canvas.clientWidth /(self.options.cellSize+self.options.cellGap)-1);
      var newYGrid = Math.floor(self.canvas.clientHeight/(self.options.cellSize+self.options.cellGap)-1);
      self.ResizeCellGrid(newXGrid, newYGrid);
      self.options.xGrid = newXGrid;
      self.options.yGrid = newYGrid;
   };

   this.Step = function(){
      self.Update();
      self.step++;
      self.options.cellHue += 0.5;
      self.options.bgHue   -= 0.2;
      var h = self.options.bgHueGap;
      var l = (self.drawMethod == 1 || self.options.cellSize < 5) ? "80%" : "40%";
      self.options.cellColor = self.HSL (self.options.cellHue, "75%", l);
      self.options.bgColor0  = self.HSL (self.options.bgHue+h, "65%", "15%");
      self.options.bgColor1  = self.HSL (self.options.bgHue  , "65%", "15%");
      self.Draw();
   };

   this.Update = function(){
      if (self.IsDead()) return self.CreateCells();

      for (var x=0; x<self.options.xGrid; x++){
         for (var y=0; y<self.options.yGrid; y++){
            self.WorkingCell(x, y, self.IsLive(x, y));
         }
      }
      self.AutoReap();
      self.SwapCellSet();
   };

   this.Draw = function(){
      self.DrawBackground();
      self.DrawCells();
   };

   this.DrawCells = function(){
      self.PrepCell();
      for (var x=0; x<self.options.xGrid; x++){
         for (var y=0; y<self.options.yGrid; y++){
            if (self.Cell(x,y)) self.DrawCell(x,y);
         }
      }
   };

   this.PrepCell = function(){
      self.scratch = document.createElement('canvas');
      self.scratch.width  = self.options.cellSize;
      self.scratch.height = self.options.cellSize;
      var ctx = self.scratch.getContext('2d');
      var radius = self.options.cellSize / 2;
      var xpos   = (self.options.cellSize);
      var ypos   = (self.options.cellSize);

      var gradient = ctx.createRadialGradient(radius*5/4, radius*3/4, radius/5, radius, radius, radius);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.85, self.options.cellColor);
      gradient.addColorStop(1, 'rgba(1,1,1,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, self.options.cellSize, self.options.cellSize);
   }

   this.DrawCell = function(x, y){
      var radius = self.options.cellSize / 2;
      var xpos   = (x+1) * (self.options.cellSize + self.options.cellGap);
      var ypos   = (y+1) * (self.options.cellSize + self.options.cellGap);

      if (self.drawMethod == 1 || self.options.cellSize < 5) {
         self.ctx.fillStyle = self.options.cellColor;
         self.ctx.fillRect(xpos-radius, ypos-radius, radius*2, radius*2);
      } else {
         self.ctx.drawImage(self.scratch, xpos-radius, ypos-radius);
      }
   };

   this.DrawIfPaused = function(){
      if (self.pauseMode){
         self.Draw();
      }
   };

   this.IsLive = function(x, y){
      var score = 0;
      var cell = 0;
      for (var dy=-1; dy<2; dy++){
         for (var dx=-1; dx<2; dx++){
            var state = self.NormalizedCell(x + dx, y + dy);
            if (dx == 0 && dy == 0) {
               cell = state;
            } else {
               score += state;
            }
         }
      }
      for (let b of self.bRule) {
         if (b == score) return true;
      }
      if (!cell) return false;
      for (let s of self.sRule) {
         if (s == score) return true;
      }
      return false;
   };

   this.DrawBackground = function(){
      let cx = self.canvas.width / 2;
      let cy = self.canvas.height / 2;
      self.bkgGradient = self.ctx.createRadialGradient(cx, cy, cx/5, cx, cy, self.canvas.width/1.7);
      self.bkgGradient.addColorStop(0, self.options.bgColor0);
      self.bkgGradient.addColorStop(1, self.options.bgColor1);
      self.ctx.fillStyle = self.bkgGradient;
      self.ctx.fillRect(0, 0, self.canvas.width, self.canvas.height);
   };

   this.IsDead = function(){
      var i = self.step % 100;
      if (i < 87) return false;
      return self.StateCheck(i - 87);
   }

   this.StateCheck = function(index){
      self.states[index] = self.BuildState();
      if (index < 4) return false;
      if (self.states[0] == self.states[2] && self.states[2] == self.states[4 ]) return true;
      if (index < 6) return false;
      if (self.states[0] == self.states[3] && self.states[3] == self.states[6 ]) return true;
      if (index < 8) return false;
      if (self.states[0] == self.states[4] && self.states[4] == self.states[8 ]) return true;
      if (index < 12) return false;
      if (self.states[0] == self.states[6] && self.states[6] == self.states[12]) return true;
      return false;
   };

   this.BuildState = function(){
      var state = "";
      for (var x=0; x<self.options.xGrid; x++){
         for (var y=0; y<self.options.yGrid; y++){
            if (self.Cell(x,y)) {
               state += self.HashKey(x, y);
            }
         }
      }
      return state;
   };

   this.ResizeCellGrid = function(newX, newY){
      var newSize  = newX * newY;
      var newArray = new Int8Array(newSize);

      if (self.currentSet && self.currentSet.length){
         for (var y=0; y<Math.min(self.options.yGrid, newY); y++) {
            for (var x=0; x<Math.min(self.options.xGrid, newX); x++) {
               newArray[y*newX + x] = self.Cell(x, y);
            }
         }
      }
      self.currentSet = self.cellArray0 = newArray;
      self.workingSet = self.cellArray1 = new Int8Array(newSize);
      self.activeSet = 0;
   };

   this.ClearCellGrid = function(){
      self.currentSet.fill(0);
   };

   this._Cell = function(set, x, y, val){
      var i = y * self.options.xGrid + x;
      if (val != undefined) return set[i] = val;
      return set[i];
   };

   this.Cell = function(x, y, val){
      return self._Cell(self.currentSet, x, y, val);
   };

   this.WorkingCell = function(x,y,val){
      return self._Cell(self.workingSet, x, y, val);
   };

   this.NormalizedCell = function(x, y, val){
      x = (self.options.xGrid + x) % self.options.xGrid;
      y = (self.options.yGrid + y) % self.options.yGrid;
      return self._Cell(self.currentSet, x, y, val);
   };

   this.NormalizedWorkingCell = function(x,y,val){
      x = (self.options.xGrid + x) % self.options.xGrid;
      y = (self.options.yGrid + y) % self.options.yGrid;
      return self._Cell(self.workingSet, x, y, val);
   };

   // we have 2 arrays, The first is on the screen and is used to generate
   // the second. and then we swap. Rinse and repeat.
   this.SwapCellSet = function(){
      self.activeSet = 1 - self.activeSet;
      self.currentSet = self.activeSet ? self.cellArray1 : self.cellArray0;
      self.workingSet = self.activeSet ? self.cellArray0 : self.cellArray1;
   };

   this.sz = function(label,e){
      return label +"("+ e.width() +","+ e.height() +") ";
   }

   this.GenerateRandom = function(){
      console.log("GenerateRandom");
      var box = self.Containment(0.2, 1.0);
      var pct = this.RandomRange(5, 35);
      for (var x=box.xmin; x<box.xmax; x++){
         for (var y=box.ymin; y<box.ymax; y++){
            if (Math.random()*100 < pct){
               self.Cell(x,y,1);
            }
         }
      }
   };

   this.GenerateXY = function(){
      console.log("GenerateXY");
      var box = self.Containment(0.2, 1.0);
      var halfx = Math.floor(self.options.xGrid/2);
      var halfy = Math.floor(self.options.yGrid/2);
      var xsize = Math.floor(self.options.xGrid);
      var ysize = Math.floor(self.options.yGrid);
      var pct = this.RandomRange(15, 40);
      for (var x=box.xmin; x<halfx; x++){
         for (var y=box.ymin; y<halfy; y++){
            if (Math.random()*100 > pct) continue;
            self.Cell(x      , y      , 1);
            self.Cell(x      , ysize-y, 1);
            self.Cell(xsize-x, y      , 1);
            self.Cell(xsize-x, ysize-y, 1);

         }
      }
   };

   this.GenerateXYWalk = function(){
      console.log("GenerateXYWalk");
      var cX = Math.floor(self.options.xGrid/2);
      var cY = Math.floor(self.options.yGrid/2);
      var dX = self.RandomRange(0, 2) ? 1 : 0;
      var dY = self.RandomRange(0, 2) ? 1 : 0;
      var sX = self.RandomRange(5, self.options.xGrid/3);
      var sY = self.RandomRange(5, self.options.yGrid/3);
      var d  = self.RandomRange(15, 40);
      var ww = self.RandomRange(0, 2) ? 2 : 1+self.options.xGrid/self.options.yGrid;
      var x = 0;
      var y = 0;
      self.cells = [];
      while (x < sX && y < sY){
         var dir = self.RandomRange(0, ww) ? 1 : 0;
         if (!dir) x++;
         if ( dir) y++;
         self.Cell(cX-x+dX, cY-y+dY, 1);
         self.Cell(cX-x+dX, cY+y   , 1);
         self.Cell(cX+x   , cY-y+dY, 1);
         self.Cell(cX+x   , cY+y   , 1);
      }
   };

   this.GenerateXMirror = function(){
      console.log("GenerateXMirror");
      var marginX = self.RandomRange(self.options.xGrid/8, self.options.xGrid/3);
      var sX      = marginX;
      var eX      = self.options.xGrid - marginX;
      var sizeY   = self.RandomRange(self.options.yGrid/8, self.options.yGrid/3);
      var cY      = Math.floor(self.options.yGrid/2);
      for (let x = sX; x < eX; x++){
         for (let y = 0; y < sizeY; y++){
            var weight = ((sizeY - y) / sizeY) * 0.8;
            var present = (Math.random() < weight ? true : false);
            if (present){
               self.Cell(x, cY-y, 1);
               self.Cell(x, cY+y, 1);
            }
         }
      }
   };

   this.Containment = function(min, max){
      var val   = min + Math.random() * (max - min);
      var halfx = Math.floor(self.options.xGrid/2);
      var halfy = Math.floor(self.options.yGrid/2);
      var xd    = Math.floor(halfx * val);
      var yd    = Math.floor(halfy * val);
      return {xmin: halfx - xd,
              xmax: halfx + xd,
              ymin: halfy - yd,
              ymax: halfy + yd};
   };

   this.AutoReap = function(){
      if (!self.autoReap) return;
      if (self.step % 10) return;

      self._Reap();
   };

   this.Reap = function(){
      self.ReapPrep();
      self._Reap();
      self.SwapCellSet();
      self.Draw();
   };

   this._Reap = function(){
      let shapes = [
         ["11","11"],
         ["111"],
         ["1","1","1"],
         ["010","101","010"],
         ["010","101","101","010"],
         ["0110","1001","0110"],
      ];

      for (var s=0; s<shapes.length; s++) {
         var shape = self.Shape(shapes[s]);
         for (var x=0; x<self.options.xGrid; x++) {
            for (var y=0; y<self.options.yGrid; y++) {
               if (self.See(x, y, 2, shape)) self.Eradicate(x, y, shape);
            }
         }
      }
   };

   this.ReapPrep = function(){
      for (var x=0; x<self.options.xGrid; x++){
         for (var y=0; y<self.options.yGrid; y++){
            self.WorkingCell(x,y,self.Cell(x,y));
         }
      }
   };

   this.Shape = function(data){
      return data.map(l => l.split(""));
   };

   this.See = function(xpos, ypos, buffer, shape){
      let xSize = shape[0].length;
      let ySize = shape.length;
      for (var x=-buffer; x<shape[0].length+buffer; x++){
         for (var y=-buffer; y<shape.length+buffer; y++){
            var live = self.NormalizedCell(xpos+x, ypos+y);
            if (x < 0 || y < 0 || x >= xSize || y >= ySize) {
               if (live) return false;
            } else if (shape[y] == undefined) {
               debugger;
            } else if (live != shape[y][x]) {
               return false;
            }
         }
      }
      return true;
   };

   this.Eradicate = function(xpos, ypos, shape){
      let xSize = shape[0].length;
      let ySize = shape.length;
      for (var x=0; x<xSize; x++){
         for (var y=0; y<ySize; y++){
            self.NormalizedWorkingCell(xpos+x, ypos+y, 0);
         }
      }
   };

   this.Reset = function(){
      self.CreateCells();
      self.DrawIfPaused();
   };

   this.HSL = function(h, s, l){
      return 'hsl('+h+','+s+','+l+')';
   };

   this.HashKey = function(x, y){
      return "["+x+","+y+"]";
   }

   this.RandomRange = function (min, max){
      return Math.floor(min + Math.random() * (max - min));
   };

   this.Init(canvas, options);
};
