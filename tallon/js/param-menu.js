class ParameterMenu {
	/**
	 * @param {String} name The displayed name of the menu
	 * @param {(item: any) => {name: String, paramsInfo: Object, other: Object | undefined}} itemToPanelParamsFunc A function that takes an item and extracts from it the necessary parameters for creating a menu panel
	 */
	constructor(name, itemToPanelParamsFunc) {
		this._name = name;
		this._itemToPanelParamsFunc = itemToPanelParamsFunc;

		/**
		 * @type {[{item: any, panel: ParamPanel}]}
		 */
		this._items = [];

		this._components = {
			root: elem("div", ["menu"]),
			header: elem("div", ["menu-header"], { innerText: name }),
			panelsContainer: elem("div", ["panel-list"]),
		};
		this._components.root.append(this._components.header);
		this._components.root.append(this._components.panelsContainer);

		this._sortable = Sortable.create(this._components.panelsContainer, {
			animation: 150,
			draggable: ".panel",
			handle: ".panel-edge",
			onUpdate: (e) => {
				// sort occured entirely within this list
				if (e.from === e.to) {
					const item = this._items[e.oldIndex];
					this._items[e.oldIndex] = this._items[e.newIndex];
					this._items[e.newIndex] = item;
				}
			},
		});
	}

	/**
	 * @returns {HTMLElement}
	 */
	getRoot() {
		return this._components.root;
	}

	/**
	 *
	 * @param {*} item
	 * @returns {ParamPanel} the created menu panel
	 */
	addItem(item) {
		const panelParams = this._itemToPanelParamsFunc(item);
		const panel = new ParamPanel(this, panelParams.name, panelParams.paramsInfo, panelParams.other);
		this._items.push({ item, panel });
		this._components.panelsContainer.append(panel.getRootElement());
		return panel;
	}
}

let panelIdCounter = 0;

class ParamPanel {
	constructor(menu, name, paramsInfo, other = {}) {
		this._name = name;
		this._id = panelIdCounter++;
		this._menu = menu;
		/**
		 * @type {Map<String, HTMLElement>}
		 */
		this._inputElements = new Map();

		/**
		 * The object that contains the actual parameter values for dat.gui to interact with
		 * @type {Object}
		 */
		this._values = {};

		/**
		 * Provides a way to access values in order later
		 * @type {[String]}
		 */
		this._orderedValueNames = [];

		// set up base gui elements
		this._components = {
			root: elem("div", ["panel"]),
			edge: elem("div", ["panel-edge"]),
			dragIcon: elem("span", ["drag-icon", "material-icons"], { innerText: "drag_indicator" }),
			contents: elem("div", ["panel-contents"]),
			header: elem("div", ["panel-header"]),
			title: elem("div", ["panel-title"], { innerText: this._name }),
			deleteIcon: null,
			body: elem("div", ["panel-body"]),
		};
		this._components.root.append(this._components.edge);
		this._components.edge.append(this._components.dragIcon);
		
		this._components.root.append(this._components.contents);

		this._components.contents.append(this._components.header);
		this._components.header.append(this._components.title);

		this._components.contents.append(this._components.body);

		if (other.deletable === true) {
			const deleteIcon = elem("span", ["delete-icon", "material-icons"], { innerText: "clear" });
			this._components.header.append(deleteIcon);
		}

		// create input elements
		for (const paramInfo of paramsInfo) {
			this._values[paramInfo.name] = paramInfo.default;
			this._orderedValueNames.push(paramInfo.name);

			if (paramInfo.hidden) {
				continue;
			}
			let inputElement = null;
			switch (paramInfo.type) {
				case "number":
					inputElement = new RangeInput(this._values, paramInfo);
					break;
				case "boolean":
					inputElement = new CheckboxInput(this._values, paramInfo);
					break;
				case "enum":
					inputElement = new EnumInput(this._values, paramInfo);
					break;
				case "color":
					inputElement = new ColorInput(this._values, paramInfo);
					break;
			}
			if (inputElement !== null) {
				const paramLabel = elem("div", ["param-label"], { innerText: paramInfo.name });
				this._components.body.append(paramLabel);

				const paramBody = elem("div", ["param-body"]);
				paramBody.append(inputElement.getRootElement());
				this._components.body.append(paramBody);

				this._inputElements.set(paramInfo.name, { inputLabel: paramLabel, inputBody: paramBody });
			}
		}
	}

	getId() {
		return this._id;
	}

	getRootElement() {
		return this._components.root;
	}

	getValues = () => {
		return this._orderedValueNames.map((valName) => this._values[valName]);
	};
}

class ParamInput {
	constructor(values, param) {
		this._components = {};
	}

	getRootElement() {
		return this._components.root;
	}

	onSourceChanged(sourceName, newValue) {}
}

class RangeInput extends ParamInput {
	constructor(values, param) {
		super(values, param);

		this._components.root = elem("div", ["range"]);

		// number input
		this._components.numberInput = elem("input", ["number"], {
			type: "number",
			min: param.min,
			max: param.max,
			value: param.default ?? 0,
			step: param.step || 0.01,
		});
		this._components.root.append(this._components.numberInput);

		this._components.sliderInput = elem("input", ["slider"], {
			type: "range",
			min: param.min ?? 0,
			max: param.max ?? 1,
			step: param.step || 0.01,
		});
		this._components.sliderInput.value = param.default; // this has to happen after step/min/max are set
		this._components.root.append(this._components.sliderInput);

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
			this._components.numberInput.value = val;
			this._components.sliderInput.value = val;
		};

		this._components.numberInput.addEventListener("change", changeEvent);
		this._components.sliderInput.addEventListener("input", changeEvent);
	}
}

class CheckboxInput extends ParamInput {
	constructor(values, param) {
		super(values, param);

		this._components.root = elem("div", ["checkbox-outer"]);

		this._components.checkboxInput = elem("input", ["checkbox"], {
			type: "checkbox",
			checked: param.value,
		});

		this._components.checkboxInput.addEventListener("change", (e) => {
			values[param.name] = e.target.checked ? true : false;
		});
		this._components.root.append(this._components.checkboxInput);

		this._components.checkboxDisplay = elem("div", ["checkbox-display"]);

		this._components.checkboxDisplay.addEventListener("click", (e) => {
			this._components.checkboxInput.click();
		});

		this._components.checkboxDisplayDot = elem("div", ["checkbox-display-dot"]);
		this._components.checkboxDisplay.append(this._components.checkboxDisplayDot);

		this._components.root.append(this._components.checkboxDisplay);
	}
}

class EnumInput extends ParamInput {
	constructor(values, param) {
		super(values, param);

		this._components.root = elem("div", ["select-outer"]);

		this._components.selectInput = elem("select", ["select"]);

		this._components.selectInput.addEventListener("change", (e) => {
			values[param.name] = e.target.value;
		});

		if (param.options === undefined) {
			console.error(`Enum input has no provided enum options!`);
		}

		param.options = ["horse"];

		this._components.options = new Map();
		for (const optName of param.options) {
			const opt = elem("option", ["option"], {
				innerText: optName,
				value: optName,
			});

			this._components.options.set(optName, opt);

			if (optName === param.default) {
				opt.selected = "selected";
			}
			this._components.selectInput.append(opt);
		}

		this._components.root.append(this._components.selectInput);
	}
}

class ColorInput extends ParamInput {
	constructor(values, param) {
		super(values, param);

		this._components.root = elem("div", ["color-outer"]);

		this._components.collapsible = elem("div", ["collapsible"]);

		// regular color input
		this._components.basicInput = elem("input", ["color"], { type: "color" });
		this._components.root.append(this._components.basicInput);

		// expand button
		this._components.expandButton = elem("div", ["material-icons", "expand-button"], { innerText: "expand_less" });
		this._components.expandButton.addEventListener("click", (e) => {
			this._components.root.classList.toggle("expanded");
		});
		this._components.root.append(this._components.expandButton);

		// fancy color input
		this._components.collapsibleInner = elem("div", ["color-inner"]);
		const pickerComponentDeclarations = [
			{
				component: iro.ui.Box,
			},
			{
				component: iro.ui.Wheel,
			},
			{
				component: iro.ui.Slider,
				options: { sliderType: "red" },
			},
			{
				component: iro.ui.Slider,
				options: { sliderType: "green" },
			},
			{
				component: iro.ui.Slider,
				options: { sliderType: "blue" },
			},
		];

		if (param.alpha) {
			pickerComponentDeclarations.push({
				component: iro.ui.Slider,
				options: { sliderType: "alpha" },
			});
		}

		this._iroPicker = new iro.ColorPicker(this._components.collapsibleInner, {
			width: 100,
			color: param.default,
			display: "flex",
			margin: 4,
			padding: 2,
			layoutDirection: "horizontal",
			borderWidth: 1,
			borderColor: "#444",
			layout: pickerComponentDeclarations,
		});
		this._components.collapsible.append(this._components.collapsibleInner);
		this._components.root.append(this._components.collapsible);

		const changed = (val) => {
			values[param.name] = val;
			this._components.basicInput.value = val.slice(0, 7);
			this._iroPicker.setColors([val]);
		};
		// events
		this._components.basicInput.addEventListener("change", (e) => {
			changed(e.target.value);
		});
		this._iroPicker.on(["color:change", "color:init"], (color) => {
			changed(color.hex8String);
		});
	}
}
