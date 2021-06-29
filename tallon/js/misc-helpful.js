function elem(element = "div", classes = [], info = {}) {
	const newElem = document.createElement(element);
	classes.forEach((c) => newElem.classList.add(c));
	Object.assign(newElem, info);
	return newElem;
}

function clamp(val, min, max){
	return Math.max(min, Math.min(val, max));
}