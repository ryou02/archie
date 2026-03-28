import * as THREE from "three";

const Diorama = {
  init() {
    const container = document.getElementById("diorama-container");
    if (!container || this.renderer) {
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(4, 3.2, 5.4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.15);
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.2);
    sun.position.set(6, 8, 4);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.6, 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0xdfe7aa, flatShading: true })
    );
    base.position.y = -0.35;

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.18, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xb9966b, flatShading: true })
    );

    this.scene.add(ambient, sun, base, platform);

    this.onResize = this.onResize.bind(this);
    window.addEventListener("resize", this.onResize);
    this.onResize();
    this.animate();
  },

  onResize() {
    const container = document.getElementById("diorama-container");
    if (!container || !this.renderer) {
      return;
    }

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  },

  animate() {
    if (!this.renderer) {
      return;
    }

    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  },
};

window.Diorama = Diorama;
