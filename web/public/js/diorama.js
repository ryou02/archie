import * as THREE from "three";
import {
  computeCameraPose,
  computeFloatMotion,
  computeRevealState,
} from "./diorama-motion.mjs";

const Diorama = {
  init() {
    const container = document.getElementById("diorama-container");
    if (!container || this.renderer) {
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.baseCameraPosition = { x: 5.5, y: 4.6, z: 6.4 };
    this.baseLookTarget = { x: 0, y: 0.8, z: 0 };
    this.camera.position.set(
      this.baseCameraPosition.x,
      this.baseCameraPosition.y,
      this.baseCameraPosition.z
    );
    this.camera.lookAt(
      this.baseLookTarget.x,
      this.baseLookTarget.y,
      this.baseLookTarget.z
    );
    this.clock = new THREE.Clock();
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.buildScene();

    this.onResize = this.onResize.bind(this);
    window.addEventListener("resize", this.onResize);
    window.BuildState.subscribe((state) => this.syncFromState(state));
    this.onResize();
    this.animate();
  },

  buildScene() {
    const ambient = new THREE.AmbientLight(0xffffff, 1.22);
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.5);
    sun.position.set(7, 8, 5);
    const skyFill = new THREE.DirectionalLight(0xdbe7ff, 0.45);
    skyFill.position.set(-4, 3, -2);

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(3.1, 3.6, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0xe4efab, flatShading: true })
    );
    ground.position.y = -0.4;

    const deckMaterial = new THREE.MeshStandardMaterial({ color: 0xc29a72, flatShading: true });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x85725f, flatShading: true });
    const cloth = new THREE.MeshStandardMaterial({ color: 0xd0bf8e, flatShading: true });

    this.groups = {
      plan: new THREE.Group(),
      scene: new THREE.Group(),
      objects: new THREE.Group(),
      polish: new THREE.Group(),
    };
    this.groupOrder = ["plan", "scene", "objects", "polish"];
    this.props = {};

    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.18, 1.8), deckMaterial);
    const sidePier = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 1.2), deckMaterial);
    sidePier.position.set(1.55, -0.04, 0.6);
    this.groups.plan.add(deck, sidePier);
    this.addPosts(this.groups.plan, woodDark);

    const tentWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.1), woodDark);
    tentWall.position.set(-0.72, 0.45, -0.35);
    const tentRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.05, 4, 1, false), cloth);
    tentRoof.rotation.z = Math.PI / 2;
    tentRoof.rotation.y = Math.PI / 4;
    tentRoof.position.set(-0.44, 0.9, -0.2);
    const canopyDrop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.74), cloth);
    canopyDrop.rotation.z = -0.18;
    canopyDrop.position.set(-0.2, 0.36, -0.46);
    this.groups.scene.add(tentWall, tentRoof, canopyDrop);
    this.props.canopyDrop = canopyDrop;
    this.props.canopyBaseRotationZ = canopyDrop.rotation.z;

    const boat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.24, 0.62), woodDark);
    boat.position.set(1.15, 0.14, 0.15);
    boat.rotation.y = -0.28;
    const boatInset = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.11, 0.4), deckMaterial);
    boatInset.position.set(1.13, 0.18, 0.15);
    boatInset.rotation.y = -0.28;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 8), new THREE.MeshStandardMaterial({ color: 0x7e8fa1, flatShading: true }));
    barrel.position.set(0.02, 0.2, 0.25);
    this.groups.objects.add(boat, boatInset, barrel);
    this.props.boat = boat;
    this.props.boatInset = boatInset;
    this.props.barrel = barrel;
    this.props.boatBaseY = boat.position.y;
    this.props.boatBaseRotationY = boat.rotation.y;
    this.props.boatInsetBaseY = boatInset.position.y;
    this.props.boatInsetBaseRotationY = boatInset.rotation.y;
    this.props.barrelBaseY = barrel.position.y;
    this.props.barrelBaseRotationZ = barrel.rotation.z;

    const ropeBundle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 12), new THREE.MeshStandardMaterial({ color: 0xe7d7a2, flatShading: true }));
    ropeBundle.position.set(0.72, 0.16, -0.38);
    ropeBundle.rotation.x = Math.PI / 2;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.16), deckMaterial);
    plank.position.set(0.8, 0.18, -0.54);
    plank.rotation.y = -0.22;
    this.groups.polish.add(ropeBundle, plank);
    this.props.ropeBundle = ropeBundle;
    this.props.plank = plank;
    this.props.ropeBaseRotationZ = ropeBundle.rotation.z;
    this.props.plankBaseRotationZ = plank.rotation.z;
    this.props.plankBaseY = plank.position.y;

    this.groupOrder.forEach((key) => {
      const group = this.groups[key];
      group.userData.reveal = 0;
      group.userData.targetReveal = 0;
      group.visible = true;
      this.scene.add(group);
    });

    this.scene.add(ambient, sun, skyFill, ground);
  },

  addPosts(group, material) {
    const postPositions = [
      [-1.15, -0.6, -0.72],
      [-0.35, -0.6, -0.72],
      [0.45, -0.6, -0.72],
      [1.15, -0.6, -0.72],
      [-1.15, -0.6, 0.72],
      [-0.35, -0.6, 0.72],
      [0.45, -0.6, 0.72],
      [1.15, -0.6, 0.72],
      [1.75, -0.55, 0.2],
      [1.75, -0.55, 0.92],
    ];

    postPositions.forEach(([x, y, z]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), material);
      post.position.set(x, y, z);
      group.add(post);
    });
  },

  syncFromState(state) {
    if (!this.groups) {
      return;
    }

    const lookup = Object.fromEntries(state.steps.map((step) => [step.id, step]));
    this.setReveal(this.groups.plan, (lookup.plan?.progress || 0) / 100);
    this.setReveal(this.groups.scene, (lookup.scene?.progress || 0) / 100);
    this.setReveal(this.groups.objects, (lookup.objects?.progress || 0) / 100);
    this.setReveal(this.groups.polish, (lookup.polish?.progress || 0) / 100);
  },

  setReveal(group, amount) {
    group.userData.targetReveal = amount;
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
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.elapsedTime;

    if (this.groups) {
      this.groupOrder.forEach((key, index) => {
        const group = this.groups[key];
        const state = computeRevealState({
          currentReveal: group.userData.reveal || 0,
          targetReveal: group.userData.targetReveal || 0,
          delta,
          elapsedTime,
          groupIndex: index,
          reducedMotion: this.reducedMotion,
        });
        group.userData.reveal = state.reveal;
        group.scale.setScalar(state.scale);
        group.position.y = state.positionY;
        group.rotation.x = state.rotationX;
        group.rotation.z = state.rotationZ;
        group.visible = state.reveal > 0.001;
      });
    }

    this.animateProps(elapsedTime);

    const cameraPose = computeCameraPose({
      elapsedTime,
      reducedMotion: this.reducedMotion,
      basePosition: this.baseCameraPosition,
      baseTarget: this.baseLookTarget,
    });
    this.camera.position.set(
      cameraPose.position.x,
      cameraPose.position.y,
      cameraPose.position.z
    );
    this.camera.lookAt(
      cameraPose.target.x,
      cameraPose.target.y,
      cameraPose.target.z
    );

    this.renderer.render(this.scene, this.camera);
  },

  animateProps(elapsedTime) {
    if (!this.props) {
      return;
    }

    const sceneReveal = this.groups?.scene?.userData?.reveal || 0;
    const objectsReveal = this.groups?.objects?.userData?.reveal || 0;
    const polishReveal = this.groups?.polish?.userData?.reveal || 0;

    if (this.props.boat && this.props.boatInset) {
      const boatFloat = computeFloatMotion({
        elapsedTime,
        speed: 1.6,
        amplitude: 0.06,
        phase: 0.3,
        reveal: objectsReveal,
        reducedMotion: this.reducedMotion,
      });
      const boatYaw = computeFloatMotion({
        elapsedTime,
        speed: 1.2,
        amplitude: 0.06,
        phase: 1.1,
        reveal: objectsReveal,
        reducedMotion: this.reducedMotion,
      });

      this.props.boat.position.y = this.props.boatBaseY + boatFloat;
      this.props.boat.rotation.y = this.props.boatBaseRotationY + boatYaw;
      this.props.boatInset.position.y = this.props.boatInsetBaseY + boatFloat;
      this.props.boatInset.rotation.y = this.props.boatInsetBaseRotationY + boatYaw;
    }

    if (this.props.barrel) {
      this.props.barrel.position.y =
        this.props.barrelBaseY +
        computeFloatMotion({
          elapsedTime,
          speed: 1.8,
          amplitude: 0.025,
          phase: 0.8,
          reveal: objectsReveal,
          reducedMotion: this.reducedMotion,
        });
      this.props.barrel.rotation.z =
        this.props.barrelBaseRotationZ +
        computeFloatMotion({
          elapsedTime,
          speed: 2,
          amplitude: 0.08,
          phase: 1.9,
          reveal: objectsReveal,
          reducedMotion: this.reducedMotion,
        });
    }

    if (this.props.canopyDrop) {
      this.props.canopyDrop.rotation.z =
        this.props.canopyBaseRotationZ +
        computeFloatMotion({
          elapsedTime,
          speed: 1.9,
          amplitude: 0.045,
          phase: 0.5,
          reveal: sceneReveal,
          reducedMotion: this.reducedMotion,
        });
    }

    if (this.props.ropeBundle) {
      this.props.ropeBundle.rotation.z =
        this.props.ropeBaseRotationZ +
        computeFloatMotion({
          elapsedTime,
          speed: 1.4,
          amplitude: 0.18,
          phase: 1.4,
          reveal: polishReveal,
          reducedMotion: this.reducedMotion,
        });
    }

    if (this.props.plank) {
      this.props.plank.position.y =
        this.props.plankBaseY +
        computeFloatMotion({
          elapsedTime,
          speed: 1.2,
          amplitude: 0.018,
          phase: 2.2,
          reveal: polishReveal,
          reducedMotion: this.reducedMotion,
        });
      this.props.plank.rotation.z =
        this.props.plankBaseRotationZ +
        computeFloatMotion({
          elapsedTime,
          speed: 1.1,
          amplitude: 0.03,
          phase: 0.9,
          reveal: polishReveal,
          reducedMotion: this.reducedMotion,
        });
    }
  },
};

window.Diorama = Diorama;
