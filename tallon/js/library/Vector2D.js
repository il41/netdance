class Vector2D {
	constructor(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	}

	set(x, y) {
		this.x = x;
		this.y = y;

		return this;
	}

	setX(x) {
		this.x = x;

		return this;
	}

	setY(y) {
		this.y = y;

		return this;
	}

	setComponent(index, value) {
		switch (index) {
			case 0:
				this.x = value;
				break;
			case 1:
				this.y = value;
				break;
			default:
				throw new Error("Vector2D.setComponent: index is out of range: " + index);
		}
	}

	getComponent(index) {
		switch (index) {
			case 0:
				return this.x;
			case 1:
				return this.y;
			default:
				throw new Error("Vector2D.getComponent: index is out of range: " + index);
		}
	}

	copy(v) {
		this.x = v.x;
		this.y = v.y;

		return this;
	}

	add(v, w) {
		if (w !== undefined) {
			return this.addVectors(v, w);
		}

		this.x += v.x;
		this.y += v.y;

		return this;
	}

	addScalar(s) {
		this.x += s;
		this.y += s;

		return this;
	}

	addVectors(a, b) {
		this.x = a.x + b.x;
		this.y = a.y + b.y;

		return this;
	}

	sub(v, w) {
		if (w !== undefined) {
			return this.subVectors(v, w);
		}

		this.x -= v.x;
		this.y -= v.y;

		return this;
	}

	subScalar(s) {
		this.x -= s;
		this.y -= s;

		return this;
	}

	subVectors(a, b) {
		this.x = a.x - b.x;
		this.y = a.y - b.y;

		return this;
	}

	multiply(v) {
		this.x *= v.x;
		this.y *= v.y;

		return this;
	}

	multiplyScalar(s) {
		this.x *= s;
		this.y *= s;

		return this;
	}

	divide(v) {
		this.x /= v.x;
		this.y /= v.y;

		return this;
	}

	divideScalar(scalar) {
		if (scalar !== 0) {
			var invScalar = 1 / scalar;

			this.x *= invScalar;
			this.y *= invScalar;
		} else {
			this.x = 0;
			this.y = 0;
		}

		return this;
	}

	min(v) {
		if (this.x > v.x) {
			this.x = v.x;
		}

		if (this.y > v.y) {
			this.y = v.y;
		}

		return this;
	}

	max(v) {
		if (this.x < v.x) {
			this.x = v.x;
		}

		if (this.y < v.y) {
			this.y = v.y;
		}

		return this;
	}

	clamp(min, max) {
		// Thi assumes min < max, if this assumption isn't true it will not operate correctly

		if (this.x < min.x) {
			this.x = min.x;
		} else if (this.x > max.x) {
			this.x = max.x;
		}

		if (this.y < min.y) {
			this.y = min.y;
		} else if (this.y > max.y) {
			this.y = max.y;
		}

		return this;
	}

	clampScalar(min, max) {
		return this.clamp(new Vector2D(min, min), new Vector2D(max, max));
	}

	floor() {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);

		return this;
	}

	ceil() {
		this.x = Math.ceil(this.x);
		this.y = Math.ceil(this.y);

		return this;
	}

	round() {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);

		return this;
	}

	roundToZero() {
		this.x = this.x < 0 ? Math.ceil(this.x) : Math.floor(this.x);
		this.y = this.y < 0 ? Math.ceil(this.y) : Math.floor(this.y);

		return this;
	}

	negate() {
		this.x = -this.x;
		this.y = -this.y;

		return this;
	}

	dot(v) {
		return this.x * v.x + this.y * v.y;
	}

	lengthSq() {
		return this.x * this.x + this.y * this.y;
	}

	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	normalize() {
		return this.divideScalar(this.length());
	}

	distanceTo(v) {
		return Math.sqrt(this.distanceToSquared(v));
	}

	distanceToSquared(v) {
		var dx = this.x - v.x,
			dy = this.y - v.y;
		return dx * dx + dy * dy;
	}

	setLength(l) {
		var oldLength = this.length();

		if (oldLength !== 0 && l !== oldLength) {
			this.multiplyScalar(l / oldLength);
		}

		return this;
	}

	lerp(v, alpha) {
		this.x += (v.x - this.x) * alpha;
		this.y += (v.y - this.y) * alpha;

		return this;
	}

	lerpVectors(v1, v2, alpha) {
		this.subVectors(v2, v1).multiplyScalar(alpha).add(v1);

		return this;
	}

	equals(v) {
		return v.x === this.x && v.y === this.y;
	}

	fromArray(array, offset) {
		if (offset === undefined) offset = 0;

		this.x = array[offset];
		this.y = array[offset + 1];

		return this;
	}

	toArray(array, offset) {
		if (array === undefined) array = [];
		if (offset === undefined) offset = 0;

		array[offset] = this.x;
		array[offset + 1] = this.y;

		return array;
	}

	fromAttribute(attribute, index, offset) {
		if (offset === undefined) offset = 0;

		index = index * attribute.itemSize + offset;

		this.x = attribute.array[index];
		this.y = attribute.array[index + 1];

		return this;
	}

	clone() {
		return new Vector2D(this.x, this.y);
	}
}
