import { SoftRenderer } from "./SoftRenderer";
import { Color, Vector3 } from "oasis-engine";
import { Mesh } from "./component/Mesh";
import { Camera } from "./component/Camera";

let canvas: HTMLCanvasElement;
let softRenderer: SoftRenderer;
let meshes: Mesh[] = [];
let camera: Camera;
let divCurrentFPS: HTMLDivElement;
let previousDate = Date.now();

document.addEventListener("DOMContentLoaded", init, false);

function init() {
  canvas = <HTMLCanvasElement>document.getElementById("canvas");
  divCurrentFPS = <HTMLDivElement>document.getElementById("currentFPS");

  softRenderer = new SoftRenderer(canvas);

  camera = new Camera();
  camera.Position = new Vector3(0, 0, 10);
  camera.Target = new Vector3(0, 0, 0);

  softRenderer.color = new Color(0.1, 1, 0.5, 1);
  softRenderer.loadJSONFileAsync("./src/monkey.json", loaddJSONCompleted);
}

function loaddJSONCompleted(meshesLoaded: Mesh[]) {
  meshes = meshesLoaded;
  requestAnimationFrame(drawingLoop);
}

// Rendering loop handler
function drawingLoop() {
  let now = Date.now();
  let currentFPS = 1000 / (now - previousDate);
  previousDate = now;
  divCurrentFPS.textContent = currentFPS.toFixed(2);

  softRenderer.clear();
  for (let i = 0; i < meshes.length; i++) {
    meshes[i].Rotation.y -= 0.01;
  }
  softRenderer.render(camera, meshes);
  softRenderer.present();

  requestAnimationFrame(drawingLoop);
}
