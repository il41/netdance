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
		this._vidCanvas = elem("canvas");
		this._vidCanvas.width = this._width;
		this._vidCanvas.height = this._height;
		this._vidContext = this._vidCanvas.getContext("2d");

		this._createMenu();
	}

	_createMenu() {
		this._menuNode = elem("div", ["filter-menu"]);
		this._menuHeader = elem("div", ["filter-menu-header"], { innerText: "Filters" });
		this._filterList = elem("div", ["filter-list"]);
		this._menuNode.append(this._menuHeader);
		this._menuNode.append(this._filterList);

		this._filterListSortable = Sortable.create(this._filterList, {
			animation: 150,
			handle: ".filter-edge",
			draggable: ".filter-item",
			swapThreshold: 0.5,
		});
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

		this._filterList.append(filterInstance.getGuiRoot());
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

	getMenu() {
		return this._menuNode;
	}
}

class VideoFilterType {
	/**
	 * `filterParams` takes an array of objects containing:
	 * - name: string,
	 * - type: string,
	 * - default: any,
	 * - min: number? = 0,
	 * - max: number? = 1,
	 * - hardMin: boolean = false,
	 * - hardMax: boolean = false,
	 * - step: number? = undefined
	 *
	 * The order of params in `filterParams` reflects the order of arguments to the kernel function
	 */
	constructor(name, filterParams, kernelGenerationFunc) {
		this._filterParams = filterParams;
		this._name = name;
		this._kernelGenerationFunc = kernelGenerationFunc;
	}

	getName() {
		return this._name;
	}

	_createMenuItem() {
		const root = elem("div", ["filter-item"]);

		const edge = elem("div", ["filter-edge"]);
		const dragIcon = elem("span", ["drag-icon", "material-icons"], { innerText: "drag_indicator" });
		root.append(edge);
		edge.append(dragIcon);

		const contents = elem("div", ["filter-contents"]);
		root.append(contents);

		const header = elem("div", ["filter-header"]);
		header.innerText = this._name;
		const body = elem("div", ["filter-body"]);
		contents.append(header);
		contents.append(body);

		return {
			root,
			edge,
			dragIcon,
			contents,
			header,
			body,
			inputElements: new Map(),
		};
	}

	instantiateParams() {
		// the object that contains the actual parameter values for dat.gui to interact with
		const values = {};
		// orderedValueNames provides a way to access values in order later
		const orderedValueNames = [];

		const guiParts = this._createMenuItem();
		for (const param of this._filterParams) {
			values[param.name] = param.default;
			orderedValueNames.push(param.name);

			let inputElement = null;
			switch (param.type) {
				case "number":
					inputElement = createRangeInput(values, param);
					break;
				case "boolean":
					inputElement = createCheckboxInput(values, param);
					break;
			}
			if (inputElement !== null) {
				const paramLabel = elem("div", ["filter-param-label"], { innerText: param.name });
				guiParts.body.append(paramLabel);

				const paramBody = elem("div", ["filter-param-body"]);
				paramBody.append(inputElement);
				guiParts.body.append(paramBody);

				guiParts.inputElements.set(param.name, {inputLabel: paramLabel, inputBody: paramBody});
			}
		}

		const getValues = () => {
			return orderedValueNames.map((valName) => values[valName] + 0);
		};

		return {
			guiParts,
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
	constructor(filterType, { guiParts, getValues }, kernelFunc) {
		this._filterType = filterType;
		this._kernelFunc = kernelFunc;
		this._guiParts = guiParts;
		this.getParamValues = getValues;
	}

	getGuiRoot() {
		return this._guiParts.root;
	}

	process(pipe, otherData) {
		return this._kernelFunc(pipe, otherData.trackingData, ...this.getParamValues());
	}
}

function createRangeInput(values, param) {
	const outer = elem("div", ["range"]);

	// number input
	const number = elem("input", ["number"], {
		type: "number",
		min: param.min,
		max: param.max,
		value: param.default ?? 0,
		step: param.step || 0.01,
	});
	outer.append(number);

	const slider = elem("input", ["slider"], {
		type: "range",
		min: param.min ?? 0,
		max: param.max ?? 1,
		value: param.default ?? 0,
		step: param.step || 0.01,
	});
	outer.append(slider);

	const changeEvent = (e) => {
		// the parse is needed, don't question it
		let val = parseFloat(e.target.value);

		if (param.hardMin) {
			val = Math.max(param.min ?? 0, val);
		}
		if (param.hardMax) {
			val = Math.min(param.max ?? 1, val);
		}
		values[param.name] = val;
		number.value = val;
		slider.value = val;
	};

	number.addEventListener("change", changeEvent);
	slider.addEventListener("input", changeEvent);

	return outer;
}

function createCheckboxInput(values, param) {
	const outer = elem("div", ["checkbox-outer"]);

	const checkbox = elem("input", ["checkbox"], {
		type: "checkbox",
		checked: param.value,
	});
	
	checkbox.addEventListener("change", (e) => {
		values[param.name] = e.target.checked ? true : false;
	});
	outer.append(checkbox);
	
	const checkboxDisplay = elem("div", ["checkbox-display"]);

	checkboxDisplay.addEventListener("click", (e) => {
		checkbox.click();
	});

	const checkboxDisplayDot = elem("div", ["checkbox-display-dot"]);
	checkboxDisplay.append(checkboxDisplayDot)

	outer.append(checkboxDisplay);

	return outer;
}
