import { Color } from "oasis-engine";

export class Texture {
  width: number;
  height: number;
  internalBuffer: ImageData;

  constructor(filename: string, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.load(filename);
  }

  load(filename: string): void {
    const imageTexture = new Image();
    imageTexture.height = this.height;
    imageTexture.width = this.width;

    imageTexture.onload = () => {
      const internalCanvas: HTMLCanvasElement =
        document.createElement("canvas");
      internalCanvas.width = this.width;
      internalCanvas.height = this.height;
      const internalContext: CanvasRenderingContext2D =
        internalCanvas.getContext("2d");
      internalContext.drawImage(imageTexture, 0, 0);
      this.internalBuffer = internalContext.getImageData(
        0,
        0,
        this.width,
        this.height
      );
    };

    imageTexture.src = `./src/${filename}`;
  }

  /**
   * @param tu  U  coordinates exported
   * @param tv  V coordinates exported
   * @returns he corresponding pixel color in the texture
   */
  map(tu: number, tv: number): Color {
    if (this.internalBuffer) {
      const u = Math.abs((tu * this.width) % this.width) >> 0;
      const v = Math.abs((tv * this.height) % this.height) >> 0;

      const pos = (u + v * this.width) * 4;

      const r = this.internalBuffer.data[pos];
      const g = this.internalBuffer.data[pos + 1];
      const b = this.internalBuffer.data[pos + 2];
      const a = this.internalBuffer.data[pos + 3];

      return new Color(r / 255.0, g / 255.0, b / 255.0, a / 255.0);
    }
    // Image is not loaded yet
    else {
      return new Color(1, 1, 1, 1);
    }
  }
}
