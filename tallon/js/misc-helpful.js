// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// This file has useful helper functions that don't belong to any part of the program
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * A helper function for creating HTML elements in 1 line
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

function clamp(val, min, max) {
	return Math.max(min, Math.min(val, max));
}

/**
 * @param {number} range
 * @returns A random number within `[-range, range)`
 */
function randNP(range) {
	return (Math.random() * 2 - 1) * range;
}

/**
 * Shuffles an array in-place
 * @param {[any]} array
 * @returns the original array (which should be shuffled)
 */
function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function distance2(x1, y1, x2, y2) {
	return (x1 - x2) ** 2 + (y1 - y2) ** 2;
}

function distance(x1, y1, x2, y2) {
	return distance2(x1, y1, x2, y2) ** 0.5;
}
