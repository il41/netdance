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

	instantiate(sourceCanvas, externalDataObj) {
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
	constructor(type, sourceCanvas, initFunc, drawFunc, externalDataObj) {
		this._type = type;
		this._sourceCanvas = sourceCanvas;
		this._canvas = document.createElement("canvas");
		
		this.ctx = this._canvas.getContext("2d");
		
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
		
		this.getParamValues = null;

		this.updateDimensions();
	}

	setParamValueGetter(getter) {
		this.getParamValues = getter;
	}

	updateDimensions() {
		this._canvas.width = this._sourceCanvas.width;
		this._canvas.height = this._sourceCanvas.height;

		this.initFunc(this.selfData, this._canvas, this.ctx, this._sourceCanvas, this.externalData);
	}

	draw(other) {
		this.drawFunc(this.selfData, this._canvas, this.ctx, this._sourceCanvas, this.externalData);
	}
}
