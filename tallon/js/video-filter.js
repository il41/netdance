const gpu = new GPU();

class VideoFilterStack {
	constructor(videoElement) {
		if (videoElement.readyState === 0) {
			console.error("Cannot create VideoStackFilter from HTMLVideoElement that hasn't loaded its metadata yet!");
		}

		this._videoElement = videoElement;
		this._width = videoElement.videoWidth;
		this._height = videoElement.videoHeight;

		this._requestedStop = false;
		this._running = false;

		this._filters = []; // list of filter instances (can contain duplicates)
		// keeps track of filters that have already been instantiated for this stack (so those instances can be reused)
		this._createdKernels = new Map(); // <filter type name, kernel function>

		// converts image data into pipeline form
		this._preFilter = gpu
			.createKernel(function (frame) {
				return frame[this.thread.y][this.thread.x];
			})
			.setOutput([this._width, this._height])
			.setPipeline(true);

		// updates the canvas using the pipeline result
		this._postFilter = gpu
			.createKernel(function (frame) {
				const pixel = frame[this.thread.y][this.thread.x];
				this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
			})
			.setOutput([this._width, this._height])
			.setGraphical(true);

		// non-visible canvas used for getting static images from a video
		this._vidCanvas = document.createElement("canvas");
		this._vidCanvas.width = this._width;
		this._vidCanvas.height = this._height;
		this._vidContext = this._vidCanvas.getContext("2d");
	}

	getCanvas() {
		return this._postFilter.canvas;
	}

	/**
	 * filter instances are created once per stack.
	 *
	 * They can be reused within the same stack (or anywhere where the image dimensions are always the same)
	 */
	addFilter(filterType) {
		let kernelFunc = this._createdKernels.get(filterType.getName());
		if (kernelFunc === undefined) {
			kernelFunc = filterType.createKernel(this._width, this._height);
			// this._createdKernels.set(filterType.getName(), kernelFunc);
		}

		const filterInstance = new VideoFilterInstance(filterType, filterType.instantiateParams(), kernelFunc);
		this._filters.push(filterInstance);
		return filterInstance;
	}

	start(otherData) {
		this._running = true;
		const updateShader = () => {
			if (this._requestedStop) {
				this._requestedStop = false;
				return;
			}

			if (this._videoElement.readyState >= 3) {
				this._vidContext.drawImage(this._videoElement, 0, 0);
				this._process(this._vidCanvas, otherData);
			}

			// queue up the next update
			window.requestAnimationFrame(updateShader);
		};

		// queue the initial update
		window.requestAnimationFrame(updateShader);
	}

	stop() {
		this._requestedStop = true;
	}

	_process(imageData, otherData) {
		let pipe = this._preFilter(imageData);
		for (const filter of this._filters) {
			pipe = filter.process(pipe, otherData);
		}
		this._postFilter(pipe);
	}
}

class VideoFilterType {
	/**
	 * `filterParams` takes an array of \{name, default: any, min: number = 0, max: number? = 1, step: number = undefined\}
	 *
	 * The order of params in `filterParams` reflects the order of arguments to the kernel function
	 */
	constructor(name, filterParams, kernelGenerationFunc) {
		this._filterParams = filterParams;
		this._name = name;
		this._kernelGenerationFunc = kernelGenerationFunc;
	}

	getName() {
		return this.name;
	}

	instantiateParams() {
		// the object that contains the actual parameter values for dat.gui to interact with
		const values = {};
		// orderedValueNames provides a way to access values in order later
		const orderedValueNames = [];

		const gui = new dat.GUI();

		for (const param of this._filterParams) {
			values[param.name] = param.default;
			orderedValueNames.push(param.name);

			gui.add(values, param.name, param.min ?? 0, param.max ?? 1, param.step);
		}

		const getValues = () => {
			return orderedValueNames.map((valName) => values[valName] + 0);
		};

		return {
			gui,
			getValues,
		};
	}

	createKernel(w, h) {
		return this._kernelGenerationFunc().setOutput([w, h]).setPipeline(true);
	}

	getCanvas() {
		return this._kernel?.canvas;
	}
}

class VideoFilterInstance {
	constructor(filterType, { gui, getValues }, kernelFunc) {
		this._filterType = filterType;
		this._kernelFunc = kernelFunc;
		this._paramsGui = gui;
		this.getParamValues = getValues;
	}

  
	process(pipe, otherData) {
		return this._kernelFunc(pipe, otherData.trackingData, ...this.getParamValues());
	}
}
