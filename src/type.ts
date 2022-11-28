import { Vector3, Vector2 } from "oasis-engine";

export interface Vertex {
  Normal: Vector3;
  Coordinates: Vector3;
  WorldCoordinates?: Vector3;
  TextureCoordinates?: Vector2;
}
export interface Face {
  A: number;
  B: number;
  C: number;
  Normal?: Vector3;
}
export interface Material {
  Name?: string;
  ID?: number;
  DiffuseTextureName?: number;
}
