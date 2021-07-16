class ParameterMenu {
	/**
	 * @param {String} name The displayed name of the menu
	 * @param {(item: any) => {name: String, paramsInfo: Object, otherPanelArgs: Object | undefined}} itemToPanelParamsFunc A function that takes an item and extracts from it the necessary parameters for creating a menu panel
	 * @param {boolean} sortable
	 * @param {String|null} addButtonText
	 * @param {{addMenuUsed: (e: MouseEvent, menu: ParameterMenu, pickedOption: String) => void}} callbacks
	 */
	constructor(name, itemToPanelParamsFunc, sortable, addButtonText = null, addMenuOptions = [], callbacks = {}) {
		this._name = name;
		this._itemToPanelParamsFunc = itemToPanelParamsFunc;

		/**
		 * @type {[{item: any, panel: ParamPanel}]}
		 */
		this._itemPanelPairs = [];

		this._components = {
			root: elem("div", ["menu"]),
			header: elem("div", ["menu-header"], { innerText: name }),
			// addIcon: elem("span", ["add-icon", "material-icons"], { innerText: "add_circle_outline" }),
			panelsContainer: elem("div", ["panel-list"]),
		};

		const comps = this._components;

		if (addMenuOptions.length > 0) {
			// add button, but no menu
			Object.assign(comps, {
				addButtonContainer: elem("div", ["add-button-container"]),
				addButton: elem("div", ["add-button"], { tabIndex: 0 }),
				addButtonHeader: elem("div", ["add-button-header"], { innerText: addButtonText }),
			});

			comps.header.append(comps.addButtonContainer);
			comps.addButtonContainer.append(comps.addButton);
			comps.addButton.append(comps.addButtonHeader);

			if (addMenuOptions.length === 1) {
				comps.addButton.addEventListener("click", (e) => {
					callbacks.addMenuUsed(e, this, addMenuOptions[0]);
				});
			} else {
				// add button with menu
				Object.assign(comps, {
					addMenu: elem("div", ["add-menu"]),
					addMenuHeader: elem("div", ["add-menu-header"]),
					addMenuList: elem("div", ["add-menu-list"]),
					addMenuOptions: [],
				});
				
				comps.addButton.classList.add("expandable");
				comps.addButton.append(comps.addMenu);
				comps.addMenu.append(comps.addMenuHeader);
				comps.addMenu.append(comps.addMenuList);

				for (const optionName of addMenuOptions) {
					const optionElem = elem("div", ["add-menu-option"], { innerText: optionName });
					optionElem.addEventListener("click", (e) => {
						callbacks.addMenuUsed(e, this, optionName);
					});
					comps.addMenuList.append(optionElem);
				}
			}
		}

		comps.root.append(comps.header);
		comps.root.append(comps.panelsContainer);

		// comps.addButton.addEventListener("click", (e) => this._onAddButtonPressed(e, this));

		this._isSortable = sortable;
		if (sortable) {
			this._sortHandler = Sortable.create(comps.panelsContainer, {
				animation: 150,
				draggable: ".panel",
				handle: ".panel-edge",
				onUpdate: (e) => {
					// sort occured entirely within this list
					if (e.from === e.to) {
						const item = this._itemPanelPairs[e.oldIndex];
						this._itemPanelPairs[e.oldIndex] = this._itemPanelPairs[e.newIndex];
						this._itemPanelPairs[e.newIndex] = item;
					}
				},
			});
		}

		/**
		 * data used for inputs with dynamic ranges (ie: enums with options that can be added/removed at runtime)
		 * @type {Map<String, any>}
		 */
		this._sourcingData = new Map();
	}

	/**
	 * @returns {HTMLElement}
	 */
	getRoot() {
		return this._components.root;
	}

	isSortable() {
		return this._isSortable;
	}

	getItemsList() {
		return this._itemPanelPairs;
	}

	registerSourcingData(name, data) {
		this._sourcingData.set(name, data);
	}

	getSourcingData(name) {
		return this._sourcingData.get(name);
	}

	sourcingDataChanged(sourceName, changes) {
		for (const items of this._itemPanelPairs) {
			items.panel.sourcingDataChanged(sourceName, changes);
		}
	}

	/**
	 *
	 * @param {*} item
	 * @returns {ParamPanel} the created menu panel
	 */
	addItem(item) {
		const panelParams = this._itemToPanelParamsFunc(item);
		const panel = new ParamPanel(this, item, panelParams.name, panelParams.paramsInfo, panelParams.otherPanelArgs);
		this._itemPanelPairs.push({ item, panel });
		this._components.panelsContainer.append(panel.getRootElement());
		return panel;
	}

	removeIndex(index) {
		const itemAndPanel = this._itemPanelPairs[index];
		this._itemPanelPairs.splice(index, 1);
		itemAndPanel.panel.getRootElement().remove();
		return itemAndPanel;
	}

	removeItem(item) {
		const i = this._itemPanelPairs.findIndex((pair) => pair.item === item);
		if (i !== -1) {
			return this.removeIndex(i);
		}
		return null;
	}
}

let panelIdCounter = 0;

class ParamPanel {
	constructor(menu, item, name, paramsInfo, otherPanelArgs = {}) {
		/**
		 * @type {ParameterMenu}
		 */
		this._menu = menu;
		this._item = item;
		this._name = name;
		this._id = panelIdCounter++;
		/**
		 * @type {Map<String, {label: HTMLElement, container: HTMLElement, input: ParamInput}>}
		 */
		this._inputs = new Map();

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
			contents: elem("div", ["panel-contents"]),
			header: elem("div", ["panel-header"]),
			headerRight: elem("div", ["panel-header-right"]),
			title: elem("div", ["panel-title"], { innerText: this._name }),
			deleteIcon: null,
			body: elem("div", ["panel-body"]),
			expandIcon: elem("span", ["expand-icon", "material-icons"], {innerText: "tune"}),
		};

		const comps = this._components;

		if (this._menu.isSortable()) {
			comps.edge = elem("div", ["panel-edge"]);
			comps.dragIcon = elem("span", ["drag-icon", "material-icons"], { innerText: "drag_indicator" });
			comps.root.append(comps.edge);
			comps.edge.append(comps.dragIcon);
		}

		comps.root.append(comps.contents);

		comps.contents.append(comps.header);
		comps.header.append(comps.expandIcon);
		comps.header.append(comps.title);
		comps.header.append(comps.headerRight);

		comps.contents.append(comps.body);

		if (otherPanelArgs.deletable === true) {
			const deleteIcon = elem("span", ["delete-icon", "material-icons"], { innerText: "clear" });
			comps.headerRight.append(deleteIcon);
			deleteIcon.addEventListener("click", (e) => {
				this._menu.removeItem(this._item);
			});
		}

		// create expand icon
		comps.expandIcon.addEventListener("click", (e) => {
			comps.root.classList.toggle("expanded");
		});

		// create input elements
		for (const paramInfo of paramsInfo) {
			this._values[paramInfo.name] = paramInfo.default;
			this._orderedValueNames.push(paramInfo.name);

			if (paramInfo.hidden) {
				continue;
			}
			let input = null;
			switch (paramInfo.type) {
				case "number":
					input = new RangeInput(this, this._values, paramInfo);
					break;
				case "boolean":
					input = new CheckboxInput(this, this._values, paramInfo);
					break;
				case "enum":
					input = new EnumInput(this, this._values, paramInfo);
					break;
				case "color":
					input = new ColorInput(this, this._values, paramInfo);
					break;
			}
			if (input !== null) {
				const paramLabel = elem("div", ["param-label"], { innerText: paramInfo.name });
				comps.body.append(paramLabel);

				const paramBody = elem("div", ["param-body"]);
				paramBody.append(input.getRootElement());
				comps.body.append(paramBody);

				this._inputs.set(paramInfo.name, { label: paramLabel, container: paramBody, input: input });
			}
		}
	}

	getId() {
		return this._id;
	}

	getRootElement() {
		return this._components.root;
	}

	getValuesUnordered = () => {
		return this._values;
	};

	getValuesOrdered = () => {
		return this._orderedValueNames.map((valName) => this._values[valName]);
	};

	/**
	 *
	 * @returns {ParameterMenu}
	 */
	getMenu() {
		return this._menu;
	}

	sourcingDataChanged(sourceName, changes) {
		for (const [, inp] of this._inputs) {
			inp.input.onSourcingDataChanged(sourceName, changes);
		}
	}
}

class ParamInput {
	/**
	 *
	 * @param {ParamPanel} panel
	 * @param {Object} values
	 * @param {Object} paramParams
	 */
	constructor(panel, values, paramParams) {
		/**
		 * @type {ParamPanel}
		 */
		this._panel = panel;
		this._paramParams = paramParams;
		this._components = {};
	}

	getRootElement() {
		return this._components.root;
	}

	onSourcingDataChanged(sourceName, changes) {}
}

class RangeInput extends ParamInput {
	/**
	 *
	 * @param {ParamPanel} panel
	 * @param {Object} values
	 * @param {Object} paramParams
	 */
	constructor(panel, values, paramParams) {
		super(panel, values, paramParams);

		this._components.root = elem("div", ["range"]);

		// number input
		this._components.numberInput = elem("input", ["number"], {
			type: "number",
			min: paramParams.min,
			max: paramParams.max,
			value: paramParams.default ?? 0,
			step: paramParams.step || 0.01,
		});
		this._components.root.append(this._components.numberInput);

		this._components.sliderInput = elem("input", ["slider"], {
			type: "range",
			min: paramParams.min ?? 0,
			max: paramParams.max ?? 1,
			step: paramParams.step || 0.01,
		});
		this._components.sliderInput.value = paramParams.default; // this has to happen after step/min/max are set
		this._components.root.append(this._components.sliderInput);

		const changeEvent = (e) => {
			// the parse is needed, don't question it
			let val = parseFloat(e.target.value);

			if (paramParams.hardMin) {
				val = Math.max(paramParams.min ?? 0, val);
			}
			if (paramParams.hardMax) {
				val = Math.min(paramParams.max ?? 1, val);
			}
			values[paramParams.name] = val;
			this._components.numberInput.value = val;
			this._components.sliderInput.value = val;

			if(paramParams.callback !== undefined){
				paramParams.callback(val);
			}
		};

		this._components.numberInput.addEventListener("change", changeEvent);
		this._components.sliderInput.addEventListener("input", changeEvent);
	}
}

class CheckboxInput extends ParamInput {
	/**
	 *
	 * @param {ParamPanel} panel
	 * @param {Object} values
	 * @param {Object} paramParams
	 */
	constructor(panel, values, paramParams) {
		super(panel, values, paramParams);

		this._components.root = elem("div", ["checkbox-outer"]);

		this._components.checkboxInput = elem("input", ["checkbox"], {
			type: "checkbox",
			checked: paramParams.value,
		});

		this._components.checkboxInput.addEventListener("change", (e) => {
			const val = e.target.checked ? true : false;
			values[paramParams.name] = val;
			if(paramParams.callback !== undefined){
				paramParams.callback(val);
			}
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
	/**
	 *
	 * @param {ParamPanel} panel
	 * @param {Object} values
	 * @param {Object} paramParams
	 */
	constructor(panel, values, paramParams) {
		super(panel, values, paramParams);

		this._components.root = elem("div", ["select-outer"]);

		this._components.selectInput = elem("select", ["select"]);

		this._components.selectInput.addEventListener("change", (e) => {
			values[paramParams.name] = e.target.value;
			if(paramParams.callback !== undefined){
				paramParams.callback(e.target.value);
			}
		});

		const optionNames = paramParams.options ?? panel.getMenu().getSourcingData(paramParams.source);
		if (optionNames === undefined) {
			console.error(`Enum input has no provided enum options!`);
		} else {
			this._components.options = new Map();
			for (const optName of optionNames) {
				this.addOption(optName);
			}
		}

		this._components.root.append(this._components.selectInput);
	}

	addOption(optName) {
		const opt = elem("option", ["option"], {
			innerText: optName,
			value: optName,
		});
		if (optName === this._paramParams.default) {
			opt.selected = "selected";
		}
		this._components.selectInput.append(opt);

		this._components.options.set(optName, opt);
	}

	removeOption(optName) {
		/**
		 * @type {HTMLElement}
		 */
		const element = this._components.options.get(optName);
		this._components.options.delete(optName);
		element.remove();
	}

	onSourcingDataChanged(sourceName, changes) {
		if (sourceName !== this._paramParams.source) {
			return;
		}

		if (changes.added !== undefined) {
			for (const optName of changes.added) {
				this.addOption(optName);
			}
		}

		if (changes.removed !== undefined) {
			for (const optName of changes.removed) {
				this.removeOption(optName);
			}
		}
	}
}

class ColorInput extends ParamInput {
	constructor(panel, values, paramParams) {
		super(panel, values, paramParams);

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

		if (paramParams.alpha) {
			pickerComponentDeclarations.push({
				component: iro.ui.Slider,
				options: { sliderType: "alpha" },
			});
		}

		this._iroPicker = new iro.ColorPicker(this._components.collapsibleInner, {
			width: 100,
			color: paramParams.default,
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

		const changeEvent = (val) => {
			values[paramParams.name] = val;
			this._components.basicInput.value = val.slice(0, 7);
			this._iroPicker.setColors([val]);

			if(paramParams.callback !== undefined){
				paramParams.callback(val);
			}
		};
		// events
		this._components.basicInput.addEventListener("change", (e) => {
			changeEvent(e.target.value);
		});
		this._iroPicker.on(["color:change", "color:init"], (color) => {
			changeEvent(color.hex8String);
		});
	}
}
