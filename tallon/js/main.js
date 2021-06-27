// exampleMultipleFilters();

const filterList = Sortable.create(document.getElementById("filter-list"), {
	animation: 150,
	handle: ".filter-edge",
  draggable: ".filter-item",
  swapThreshold: 0.5,
});
console.log(filterList);

const vals = {value: 1, other: false};
const bod = document.getElementById("5243");
const gui = new dat.GUI();
gui.add(vals, "value");
gui.add(vals, "other");

bod.append(gui.domElement);