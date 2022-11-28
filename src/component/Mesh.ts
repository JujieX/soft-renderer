import { Vector3 } from "oasis-engine";
import { Face, Vertex } from "../type";
import { Texture } from "./Texture";

export class Mesh {
  private _tempNormal: Vector3 = new Vector3();
  Position: Vector3 = new Vector3();
  Rotation: Vector3 = new Vector3();
  Vertices: Vertex[];
  Faces: Face[];
  Texture: Texture;

  constructor(public name: string, verticesCount: number, facesCount: number) {
    this.Vertices = new Array(verticesCount);
    this.Faces = new Array(facesCount);
  }

  computeFacesNormals(): void {
    for (let indexFaces = 0; indexFaces < this.Faces.length; indexFaces++) {
      const currentFace = this.Faces[indexFaces];

      const vertexA = this.Vertices[currentFace.A];
      const vertexB = this.Vertices[currentFace.B];
      const vertexC = this.Vertices[currentFace.C];

      Vector3.add(vertexA.Normal, vertexB.Normal, this._tempNormal);
      Vector3.add(this._tempNormal, vertexC.Normal, this._tempNormal);

      this.Faces[indexFaces].Normal = this._tempNormal.scale(1 / 3);
      this.Faces[indexFaces].Normal.normalize();
    }
  }
}
