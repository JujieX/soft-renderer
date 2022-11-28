import { Vector3 } from "oasis-engine";

export class Camera {
  Position: Vector3 = new Vector3();
  Target: Vector3 = new Vector3();
  UpVect: Vector3 = new Vector3(0.0, 1.0, 0.0);
  fov: number = 0.78;
  nearClip: number = 0.01;
  farClip: number = 100;
}
