/**
 * Creates a menu that can contain panels.
 */
function createMenu(headerText, sortableItems) {
	const root = elem("div", ["menu"]);
	const header = elem("div", ["menu-header"], { innerText: headerText });
	const list = elem("div", ["panel-list"]);
	root.append(header);
	root.append(list);

	const listSortable = Sortable.create(list, {
		animation: 150,
		draggable: ".panel",
		handle: ".panel-edge",
		swapThreshold: 0.25,
		onUpdate: (e) => {
			// sort occured entirely within this list
			if (e.from === e.to) {
				const temp = sortableItems[e.oldIndex];
				sortableItems[e.oldIndex] = sortableItems[e.newIndex];
				sortableItems[e.newIndex] = temp;
			}
		},
	});

	return {
		root,
		header,
		list,
		listSortable,
	};
}

/**
 * Creates the actual HTML element for a panel.
 */
const _createPanelElement = (headerText) => {
	const root = elem("div", ["panel"]);

	const edge = elem("div", ["panel-edge"]);
	const dragIcon = elem("span", ["drag-icon", "material-icons"], { innerText: "drag_indicator" });
	root.append(edge);
	edge.append(dragIcon);

	const contents = elem("div", ["panel-contents"]);
	root.append(contents);

	const header = elem("div", ["panel-header"]);
	header.innerText = headerText;
	const body = elem("div", ["panel-body"]);
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
};

/**
 * Given information about a collection of variables, creates a panel for editing those variables.
 * Also returns a function for retrieving the values of those variables.
 *
 * @param {*} headerText
 * @param {*} params
 * @returns {{
 * getValues: () => [any],
 * panelComponents: {HTMLElement},
 * }}
 */
function createParameterPanel(headerText, params) {
	// the object that contains the actual parameter values for dat.gui to interact with
	const values = {};

	// orderedValueNames provides a way to access values in order later
	const orderedValueNames = [];

	const panelComponents = _createPanelElement(headerText);
	for (const param of params) {
		values[param.name] = param.default;
		orderedValueNames.push(param.name);
		
		if(param.hidden){
			continue;
		}
		let inputElement = null;
		switch (param.type) {
			case "number":
				inputElement = createRangeInput(values, param);
				break;
			case "boolean":
				inputElement = createCheckboxInput(values, param);
				break;
			case "enum":
				inputElement = createEnumInput(values, param);
				break;
		}
		if (inputElement !== null) {
			const paramLabel = elem("div", ["param-label"], { innerText: param.name });
			panelComponents.body.append(paramLabel);

			const paramBody = elem("div", ["param-body"]);
			paramBody.append(inputElement);
			panelComponents.body.append(paramBody);

			panelComponents.inputElements.set(param.name, { inputLabel: paramLabel, inputBody: paramBody });
		}
	}

	const getValues = () => {
		return orderedValueNames.map((valName) => values[valName]);
	};

	return {
		panelComponents,
		getValues,
	};
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
		step: param.step || 0.01,
	});
	slider.value = param.default; // this has to happen after step/min/max are set
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
	checkboxDisplay.append(checkboxDisplayDot);

	outer.append(checkboxDisplay);

	return outer;
}

function createEnumInput(values, param) {
	const outer = elem("div", ["select-outer"]);

	const input = elem("select", ["select"]);

	input.addEventListener("change", (e) => {
		values[param.name] = e.target.value;
	});

	for (const optName of param.options) {
		const opt = elem("option", ["option"], {
			innerText: optName,
			value: optName,
		});
		if(optName === param.default){
			opt.selected = "selected";
		}
		input.append(opt);
	}

	outer.append(input);

	return outer;
}
