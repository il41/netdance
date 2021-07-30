class TextureGeneratorType {
	/**
	 * @param {String} name
	 * @param {Object} paramParams
	 * @param {{
	 *  init: (selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, params: Object, other: Object) => void,
	 *  draw: (selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, params: Object, other: Object) => void,
	 * }} param0
	 */
	constructor(name, paramParams, { initFunc, drawFunc }) {
		this._name = name;
		this._paramParams = paramParams;
		this.initFunc = initFunc;
		this.drawFunc = drawFunc;
	}

	getName() {
		return this._name;
	}

	getParamsParams() {
		return this._paramParams;
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
	 * @param {(selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, params: Object, other: Object) => void} initFunc
	 * @param {(selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, params: Object, other: Object) => void} drawFunc
	 * @param {Object} paramParams
	 * @param {Object} externalDataObj
	 */
	constructor(type, sourceCanvas, initFunc, drawFunc, externalDataObj) {
		this._textureType = type;
		this._paramParams = this._textureType.getParamsParams();
		this._sourceCanvas = sourceCanvas;
		this._canvas = document.createElement("canvas");

		this.ctx = this._canvas.getContext("2d");

		/**
		 * @type {(selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, params: Object, other: Object) => void}
		 */
		this.initFunc = initFunc;
		/**
		 * @type {(selfData: Object, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, input: HTMLCanvasElement, params: Object, other: Object) => void}
		 */
		this.drawFunc = drawFunc;

		/**
		 * @type {Object}
		 */
		this.selfData = {};

		this.externalData = externalDataObj;

		this.getParamValues = () =>
			console.error("getParamValues has not been assigned yet! Use setParamValueGetter to assign it.");

		/**
		 * number of things that need this texture generator to be actively updating
		 * @type {number}
		 */
		this._users = 0;
	}

	getName(){
		return this._textureType.getName();
	}
	
	getParamsParams(){
		return this._textureType.getParamsParams();
	}

	use() {
		// console.log(this._textureType.getName(), "+", this._users, "->", this._users+1);
		this._users++;
	}

	unuse() {
		// console.log(this._textureType.getName(), "-", this._users, "->", this._users-1);
		this._users--;
	}

	getType() {
		return this._textureType;
	}

	setParamValueGetter(getter) {
		this.getParamValues = getter;
	}

	updateDimensions() {
		this._canvas.width = this._sourceCanvas.width;
		this._canvas.height = this._sourceCanvas.height;

		this.initFunc(this.selfData, this._canvas, this.ctx, this._sourceCanvas, this.getParamValues(), this.externalData);
	}

	draw() {
		if(this._users > 0){
			this.drawFunc(this.selfData, this._canvas, this.ctx, this._sourceCanvas, this.getParamValues(), this.externalData);
		}
	}

	getCanvas() {
		return this._canvas;
	}
}
