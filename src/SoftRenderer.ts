import { Vector2, Vector3, Color, Matrix, Quaternion } from "oasis-engine";
import { Texture } from "./component/Texture";
import { Camera } from "./component/Camera";
import { Mesh } from "./component/Mesh";
import { Vertex, Material } from "./type";

export class SoftRenderer {
  private _viewMat: Matrix = new Matrix();
  private _projMat: Matrix = new Matrix();
  private _modelMat: Matrix = new Matrix();
  private _mvpMat: Matrix = new Matrix();
  private _tempMat: Matrix = new Matrix();
  private _tempRotateMat: Matrix = new Matrix();
  private _tempTransMat: Matrix = new Matrix();
  private _tempQuat: Quaternion = new Quaternion();
  private _tempTextureColor: Color = new Color(1, 1, 1, 1);
  private _point2d: Vector3 = new Vector3();
  private _normal3d: Vector3 = new Vector3();
  private _tempNormal: Vector3 = new Vector3();
  private _centerP: Vector3 = new Vector3();

  private _backbuffer: ImageData;
  private _workingCanvas: HTMLCanvasElement;
  private _workingContext: CanvasRenderingContext2D;
  private _workingWidth: number;
  private _workingHeight: number;
  private _backbufferdata: Array<number>;
  private _depthbuffer: number[];

  lightPos: Vector3 = new Vector3(2, 10, -10);
  color: Color = new Color(1, 1, 1, 1);

  constructor(canvas: HTMLCanvasElement) {
    this._workingCanvas = canvas;
    this._workingWidth = canvas.width;
    this._workingHeight = canvas.height;
    this._workingContext = this._workingCanvas.getContext("2d");
    this._depthbuffer = new Array(this._workingWidth * this._workingHeight);
  }

  /**
   * clear the back buffer with black color by default
   */
  clear(): void {
    this._workingContext.clearRect(
      0,
      0,
      this._workingWidth,
      this._workingHeight
    );
    this._backbuffer = this._workingContext.getImageData(
      0,
      0,
      this._workingWidth,
      this._workingHeight
    );

    for (let i = 0; i < this._depthbuffer.length; i++) {
      this._depthbuffer[i] = Infinity;
    }
  }

  /**
   * flush the back buffer into the front buffer
   */
  present(): void {
    this._workingContext.putImageData(this._backbuffer, 0, 0);
  }

  /**
   * re-compute each vertex projection during each frame
   * @param camera the camera for the scene
   * @param meshes the target meshes
   */
  render(camera: Camera, meshes: Mesh[]): void {
    // view Matrix
    Matrix.lookAt(camera.Position, camera.Target, camera.UpVect, this._viewMat);
    // projection Matrix
    Matrix.perspective(
      camera.fov,
      this._workingWidth / this._workingHeight,
      camera.nearClip,
      camera.farClip,
      this._projMat
    );

    for (let i = 0; i < meshes.length; i++) {
      const currMesh = meshes[i];
      // get model matrix
      Quaternion.rotationYawPitchRoll(
        currMesh.Rotation.y,
        currMesh.Rotation.x,
        currMesh.Rotation.z,
        this._tempQuat
      );
      Matrix.rotationQuaternion(this._tempQuat, this._tempRotateMat);
      Matrix.translation(currMesh.Position, this._tempTransMat);
      Matrix.multiply(this._tempTransMat, this._tempRotateMat, this._modelMat);

      // get mvp matrix
      Matrix.multiply(this._viewMat, this._modelMat, this._tempMat);
      Matrix.multiply(this._projMat, this._tempMat, this._mvpMat);

      for (let idxFace = 0; idxFace < currMesh.Faces.length; idxFace++) {
        const currentFace = currMesh.Faces[idxFace];

        const vertexA = currMesh.Vertices[currentFace.A];
        const vertexB = currMesh.Vertices[currentFace.B];
        const vertexC = currMesh.Vertices[currentFace.C];

        const pixelA = this._project(vertexA, this._mvpMat, this._modelMat);
        const pixelB = this._project(vertexB, this._mvpMat, this._modelMat);
        const pixelC = this._project(vertexC, this._mvpMat, this._modelMat);

        this._drawTriangle(
          pixelA,
          pixelB,
          pixelC,
          this.color,
          currMesh.Texture
        );
      }
    }
  }

  /**
   * Loading the JSON file
   */
  loadJSONFileAsync(fileName: string, callback: (result: Mesh[]) => any): void {
    let jsonObject = {};
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", fileName, true);
    const that = this;
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        jsonObject = JSON.parse(xmlhttp.responseText);
        callback(that._createMeshesFromJSON(jsonObject));
      }
    };
    xmlhttp.send(null);
  }

  // to put a pixel on screen at a specific X,Y coordinates
  private _putPixel(x: number, y: number, z: number, color: Color): void {
    this._backbufferdata = this._backbuffer.data;
    const index: number = (x >> 0) + (y >> 0) * this._workingWidth;
    const index4: number = index * 4;

    // zBuffer
    if (this._depthbuffer[index] < z) {
      return;
    }

    this._depthbuffer[index] = z;

    this._backbufferdata[index4] = color.r * 255;
    this._backbufferdata[index4 + 1] = color.g * 255;
    this._backbufferdata[index4 + 2] = color.b * 255;
    this._backbufferdata[index4 + 3] = color.a * 255;
  }

  private _drawPoint(point: Vector3, color: Color): void {
    // Clipping what's visible on screen
    if (
      point.x >= 0 &&
      point.y >= 0 &&
      point.x < this._workingWidth &&
      point.y < this._workingHeight
    ) {
      this._putPixel(point.x, point.y, point.z, color);
    }
  }

  // Project 3D coordinates to 2D coordinates
  private _project(vertex: Vertex, mvpMat: Matrix, modelMat: Matrix): Vertex {
    Vector3.transformCoordinate(vertex.Coordinates, mvpMat, this._point2d);
    Vector3.transformCoordinate(vertex.Normal, modelMat, this._normal3d);

    // transform center point to upper left
    const x = this._point2d.x * this._workingWidth + this._workingWidth / 2.0;
    const y =
      -this._point2d.y * this._workingHeight + this._workingHeight / 2.0;

    return {
      Coordinates: new Vector3(x, y, this._point2d.z),
      Normal: this._normal3d,
      TextureCoordinates: vertex.TextureCoordinates,
    };
  }

  private _drawTriangle(
    v1: Vertex,
    v2: Vertex,
    v3: Vertex,
    color: Color,
    texture?: Texture
  ): void {
    const minx = Math.min(v1.Coordinates.x, v2.Coordinates.x, v3.Coordinates.x);
    const maxx = Math.max(v1.Coordinates.x, v2.Coordinates.x, v3.Coordinates.x);
    const miny = Math.min(v1.Coordinates.y, v2.Coordinates.y, v3.Coordinates.y);
    const maxy = Math.max(v1.Coordinates.y, v2.Coordinates.y, v3.Coordinates.y);

    const min_x = Math.floor(minx);
    const max_x = Math.ceil(maxx);
    const min_y = Math.floor(miny);
    const max_y = Math.ceil(maxy);

    for (let i = min_x; i <= max_x; i++) {
      for (let j = min_y; j <= max_y; j++) {
        const p = new Vector3(i, j, 0);
        const baryCoord = this._barycentric(
          p,
          v1.Coordinates,
          v2.Coordinates,
          v3.Coordinates
        );

        if (baryCoord.x >= 0 && baryCoord.y >= 0 && baryCoord.z >= 0) {
          const z_interpolation =
            baryCoord.x * v1.Coordinates.z +
            baryCoord.y * v2.Coordinates.z +
            baryCoord.z * v3.Coordinates.z;

          // light
          const intensity = this._lightIntensity(v1, v2, v3);

          if (texture) {
            const u =
              baryCoord.x * v1.TextureCoordinates?.x +
              baryCoord.y * v2.TextureCoordinates?.x +
              baryCoord.z * v3.TextureCoordinates?.x;

            const v =
              baryCoord.x * v1.TextureCoordinates?.y +
              baryCoord.y * v2.TextureCoordinates?.y +
              baryCoord.z * v3.TextureCoordinates?.y;

            this._tempTextureColor = texture.map(u, v).clone();
          }

          this._drawPoint(
            new Vector3(i, j, z_interpolation),
            new Color(
              color.r * intensity * this._tempTextureColor.r,
              color.g * intensity * this._tempTextureColor.g,
              color.b * intensity * this._tempTextureColor.b,
              1
            )
          );
        }
      }
    }
  }

  private _lightIntensity(v1: Vertex, v2: Vertex, v3: Vertex) {
    Vector3.add(v1.Normal, v2.Normal, this._tempNormal);
    Vector3.add(this._tempNormal, v3.Normal, this._tempNormal);
    this._tempNormal.scale(1 / 3);

    Vector3.add(v1.Coordinates, v2.Coordinates, this._centerP);
    Vector3.add(this._centerP, v3.Coordinates, this._centerP);
    this._centerP.scale(1 / 3);

    return this._computeNDotL(this._centerP, this._tempNormal, this.lightPos);
  }

  private _barycentric(
    P: Vector3,
    A: Vector3,
    B: Vector3,
    C: Vector3
  ): Vector3 {
    const xa = A.x;
    const ya = A.y;
    const xb = B.x;
    const yb = B.y;
    const xc = C.x;
    const yc = C.y;
    const x = P.x;
    const y = P.y;

    const gamma =
      ((ya - yb) * x + (xb - xa) * y + xa * yb - xb * ya) /
      ((ya - yb) * xc + (xb - xa) * yc + xa * yb - xb * ya);
    const beta =
      ((ya - yc) * x + (xc - xa) * y + xa * yc - xc * ya) /
      ((ya - yc) * xb + (xc - xa) * yb + xa * yc - xc * ya);
    const alpha = 1 - gamma - beta;

    // get the 1-u-v, u, v for interpolate
    return new Vector3(alpha, beta, gamma);
  }

  private _computeNDotL(
    vertex: Vector3,
    normal: Vector3,
    lightPosition: Vector3
  ): number {
    const lightDirection = lightPosition.subtract(vertex);

    normal.normalize();
    lightDirection.normalize();

    return Math.max(0, Vector3.dot(normal, lightDirection));
  }

  private _createMeshesFromJSON(jsonObject): Mesh[] {
    const meshes: Mesh[] = [];
    const materials: Material[] = [];

    for (
      let materialIndex = 0;
      materialIndex < jsonObject.materials.length;
      materialIndex++
    ) {
      const material: Material = {};

      material.Name = jsonObject.materials[materialIndex].name;
      material.ID = jsonObject.materials[materialIndex].id;
      if (jsonObject.materials[materialIndex].diffuseTexture)
        material.DiffuseTextureName =
          jsonObject.materials[materialIndex].diffuseTexture.name;

      materials[material.ID] = material;
    }
    for (let meshIndex = 0; meshIndex < jsonObject.meshes.length; meshIndex++) {
      const verticesArray: number[] = jsonObject.meshes[meshIndex].vertices;
      const indicesArray: number[] = jsonObject.meshes[meshIndex].indices;

      const uvCount: number = jsonObject.meshes[meshIndex].uvCount;
      let verticesStep = 1;

      // Depending of the number of texture's coordinates per vertex
      // we're jumping in the vertices array  by 6, 8 & 10 windows frame
      switch (uvCount) {
        case 0:
          verticesStep = 6;
          break;
        case 1:
          verticesStep = 8;
          break;
        case 2:
          verticesStep = 10;
          break;
      }

      // the number of interesting vertices information for us
      const verticesCount = verticesArray.length / verticesStep;
      // number of faces is logically the size of the array divided by 3 (A, B, C)
      const facesCount = indicesArray.length / 3;
      const mesh = new Mesh(
        jsonObject.meshes[meshIndex].name,
        verticesCount,
        facesCount
      );

      // Filling the Vertices array of our mesh first
      for (let index = 0; index < verticesCount; index++) {
        const x = verticesArray[index * verticesStep];
        const y = verticesArray[index * verticesStep + 1];
        const z = verticesArray[index * verticesStep + 2];
        // Loading the vertex normal exported by Blender
        const nx = verticesArray[index * verticesStep + 3];
        const ny = verticesArray[index * verticesStep + 4];
        const nz = verticesArray[index * verticesStep + 5];

        mesh.Vertices[index] = {
          Coordinates: new Vector3(x, y, z),
          Normal: new Vector3(nx, ny, nz),
        };

        if (uvCount > 0) {
          // Loading the texture coordinates
          const u = verticesArray[index * verticesStep + 6];
          const v = verticesArray[index * verticesStep + 7];
          mesh.Vertices[index].TextureCoordinates = new Vector2(u, v);
        } else {
          mesh.Vertices[index].TextureCoordinates = new Vector2(0, 0);
        }
      }

      // Then filling the Faces array
      for (let index = 0; index < facesCount; index++) {
        const a = indicesArray[index * 3];
        const b = indicesArray[index * 3 + 1];
        const c = indicesArray[index * 3 + 2];
        mesh.Faces[index] = {
          A: a,
          B: b,
          C: c,
        };
      }

      const position = jsonObject.meshes[meshIndex].position;
      mesh.Position = new Vector3(position[0], position[1], position[2]);

      if (uvCount > 0) {
        const meshTextureID = jsonObject.meshes[meshIndex].materialId;
        const meshTextureName = materials[meshTextureID].DiffuseTextureName;
        mesh.Texture = new Texture(meshTextureName, 512, 512);
      }
      mesh.computeFacesNormals();
      meshes.push(mesh);
    }

    return meshes;
  }
}
