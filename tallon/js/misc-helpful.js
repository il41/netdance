/**
 * 
 * @param {String} element 
 * @param {[String]} classes 
 * @param {Object} info 
 * @returns {HTMLElement}
 */
function elem(element = "div", classes = [], info = {}) {
	const newElem = document.createElement(element);
	classes.forEach((c) => newElem.classList.add(c));
	Object.assign(newElem, info);
	return newElem;
}

function clamp(val, min, max){
	return Math.max(min, Math.min(val, max));
}

function randNP(range){
	return (Math.random() * 2 - 1) * range;
}