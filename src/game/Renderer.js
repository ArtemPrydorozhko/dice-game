import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export default class Renderer {
  constructor(canvas, width, height, pixelRatio, scene, camera) {
    this.webGLRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.webGLRenderer.toneMapping = THREE.CineonToneMapping;
    this.webGLRenderer.toneMappingExposure = 1.75;
    this.webGLRenderer.shadowMap.enabled = true;
    this.webGLRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.webGLRenderer.setClearColor('#211d20');
    this.webGLRenderer.setSize(width, height);
    this.webGLRenderer.setPixelRatio(pixelRatio);

    this.setComposer(width, height, pixelRatio, scene, camera);
  }

  resize(width, height, pixelRatio) {
    this.webGLRenderer.setSize(width, height);
    this.webGLRenderer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(pixelRatio);
    this.effectFXAA.uniforms['resolution'].value.set(
      1 / (width * pixelRatio),
      1 / (height * pixelRatio),
    );
  }

  update(scene, camera) {
    // this.webGLRenderer.render(scene, camera);
    this.composer.render();
  }

  setComposer(width, height, pixelRatio, scene, camera) {
    this.composer = new EffectComposer(this.webGLRenderer);
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(pixelRatio);
    // Anti-aliasing for composer
    this.composer.renderTarget1.samples = 8;
    this.composer.renderTarget2.samples = 8;

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);
    this.outlinePass = new OutlinePass(
      new THREE.Vector2(width, height),
      scene,
      camera,
    );

    const outlineParams = {
      edgeStrength: 6,
      edgeGlow: 1,
      edgeThickness: 2,
      pulsePeriod: 0,
      rotate: false,
      usePatternTexture: false,
      visibleEdgeColor: '#aa0818',
      // hiddenEdgeColor: "#190a05",
      hiddenEdgeColor: '#aa0818',
    };

    this.outlinePass.edgeStrength = outlineParams.edgeStrength;
    this.outlinePass.edgeGlow = outlineParams.edgeGlow;
    this.outlinePass.edgeThickness = outlineParams.edgeThickness;
    this.outlinePass.pulsePeriod = outlineParams.pulsePeriod;
    this.outlinePass.rotate = outlineParams.rotate;
    this.outlinePass.usePatternTexture = outlineParams.usePatternTexture;
    this.outlinePass.visibleEdgeColor.set(outlineParams.visibleEdgeColor);
    this.outlinePass.hiddenEdgeColor.set(outlineParams.hiddenEdgeColor);

    this.composer.addPass(this.outlinePass);
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setSelecteObjects(objects) {
    this.outlinePass.selectedObjects = objects;
  }
}
