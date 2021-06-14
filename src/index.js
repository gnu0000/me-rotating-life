//
// rotating life demo
// This is a demo using three.js and my life canvas toy
// Craig Fitzgerald

import $ from "jquery";
import * as THREE from 'three';
import {TrackballControls} from 'three/examples/jsm/controls/TrackballControls.js';
import LifeRunner from "./modules/LifeRunner.js";


class PageHandler {
   constructor() {
      this.lastRotateTime = Date.now();;
      this.lastLifeTime   = Date.now();;

      $(window).on("resize", () => this.Resize());
      $(window).keydown((e) => this.KeyDown(e))


      this.SetupThree();
      this.lifeRunner = new LifeRunner(this.canvas, {cellSize:10});
   }

   SetupThree() {
      this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
      this.camera.position.z = 450;

      this.scene = new THREE.Scene();
      this.canvas = $('#petri-dish').get(0);
      let geometry = new THREE.BoxGeometry( 200, 200, 200 )
      this.material = new THREE.MeshBasicMaterial();
      this.material.map = new THREE.CanvasTexture(this.canvas);
      this.cube = new THREE.Mesh(geometry, this.material);
      this.scene.add(this.cube);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);

      this.controls = new TrackballControls(this.camera, this.renderer.domElement);
      }

   Animate() {
      requestAnimationFrame(() => this.Animate());
      this.Render();
   }

   Render() {
      let time = Date.now();
      let lDelta = (time - this.lastLifeTime);

      if (lDelta > 20)
         {
         this.lifeRunner.Step();
         this.material.map.needsUpdate = true;
         this.lastLifeTime = time;
         }
      this.controls.update();

      let rDelta = (time - this.lastRotateTime) * 0.00020;
      this.lastRotateTime = time;

		this.cube.rotation.x += rDelta;
		this.cube.rotation.y += rDelta;
      this.renderer.render(this.scene, this.camera);
   }

   Resize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.updateProjectionMatrix();

      this.Render();
   }

   KeyDown(e){
      if (e.originalEvent.which == 32) {
         this.lifeRunner.Reset(); 
      }
   }

}


$(function() {
   let p = new PageHandler();
   p.Animate();
});
