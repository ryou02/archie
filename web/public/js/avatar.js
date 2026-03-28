import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const Avatar = {
  mixer: null,
  mouth: null,
  clock: new THREE.Clock(),
  idleAction: null,

  init() {
    const container = document.getElementById("avatar-container");
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x16213e);

    // Camera
    this.camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    this.camera.position.set(0, 1.4, 2.5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(2, 3, 2);
    this.scene.add(directional);

    // Controls (optional, lets user rotate the avatar)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.2, 0);
    this.controls.enablePan = false;
    this.controls.update();

    // Load model
    this.loadModel();

    // Handle resize
    window.addEventListener("resize", () => this.onResize());

    // Start render loop
    this.animate();
  },

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      "models/archie.glb",
      (gltf) => {
        this.model = gltf.scene;
        this.scene.add(this.model);

        // Set up animation mixer if model has animations
        if (gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);
          this.idleAction = this.mixer.clipAction(gltf.animations[0]);
          this.idleAction.play();
        }

        // Try to find the head bone for lip-sync
        this.model.traverse((child) => {
          if (child.isMesh && child.morphTargetInfluences) {
            this.mouth = child;
          }
        });

        console.log("Archie model loaded");
      },
      undefined,
      (err) => {
        console.warn("Could not load archie.glb:", err.message);
        // Show a placeholder sphere if no model
        const geo = new THREE.SphereGeometry(0.5, 32, 32);
        const mat = new THREE.MeshStandardMaterial({ color: 0x533483 });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.position.set(0, 1.2, 0);
        this.scene.add(sphere);
      }
    );
  },

  // Simple lip-sync: scale jaw or morph target based on audio volume
  setMouthOpen(amount) {
    if (this.mouth && this.mouth.morphTargetInfluences) {
      // Try to find a "mouthOpen" or similar morph target
      const dict = this.mouth.morphTargetDictionary;
      if (dict) {
        const key =
          dict["mouthOpen"] ??
          dict["jawOpen"] ??
          dict["viseme_aa"] ??
          Object.values(dict)[0];
        if (key !== undefined) {
          this.mouth.morphTargetInfluences[key] = amount;
        }
      }
    }
  },

  onResize() {
    const container = document.getElementById("avatar-container");
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  },

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    if (this.mixer) this.mixer.update(delta);
    this.renderer.render(this.scene, this.camera);
  },
};

// Expose globally for other scripts
window.Avatar = Avatar;
