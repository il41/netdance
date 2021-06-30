class TextureGeneratorType {
	/**
	 *
	 * @param {{
	 *  init: (selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, other: Object) => void,
	 *  draw: (selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, other: Object) => void
	 * }} param0
	 */
	constructor({ initFunc, drawFunc }) {
    this.initFunc = initFunc;
    this.drawFunc = drawFunc;
  }

  instantiate(sourceCanvas, externalDataObj){
    return new TextureGeneratorInstance(this, sourceCanvas, this.initFunc, this.drawFunc, externalDataObj);
  }
}

class TextureGeneratorInstance {
  /**
   * 
   * @param {TextureGeneratorType} type 
   * @param {HTMLCanvasElement} sourceCanvas
   * @param {(selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, other: Object) => void} initFunc
	 * @param {(selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, other: Object) => void} drawFunc
   */
  constructor(type, sourceCanvas, initFunc, drawFunc, externalDataObj){
    this.type = type;
    this.sourceCanvas = sourceCanvas;
    this.canvas = document.createElement("canvas");
    this.canvas.width = sourceCanvas.width;
    this.canvas.height = sourceCanvas.height;

    this.ctx = this.canvas.getContext("2d");

    /**
     * @type {(selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, other: Object) => void}
     */
    this.initFunc = initFunc;
    /**
     * @type {(selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, other: Object) => void}
     */
    this.drawFunc = drawFunc;

    /**
     * @type {Object}
     */
    this.selfData = {};

    this.externalData = externalDataObj;

    this.initFunc(this.selfData, this.canvas, this.ctx, this.sourceCanvas, this.externalData);
  }

  draw(other){
    this.drawFunc(this.selfData, this.canvas, this.ctx, this.sourceCanvas, this.externalData);
  }
}