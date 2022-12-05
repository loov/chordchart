const barline = {
	";": "𝄀",
	";;": "𝄁",
	";;.": "𝄂",
	"|": "𝄀",
	"||": "𝄁",
	"||.": "𝄂",
	"[": "𝄆",
	"]": "𝄇",
	"[[": "\ue040",
	"]]": "\ue041",
}

const accidental = {
	"b": "♭",
	"bb": "𝄫",
	"#": "♯",
	"##": "𝄪",
}

const rest = {
	0: "\ud834\udd3a",
	1: "\ud834\udd3b",
	2: "\ud834\udd3c",
	4: "\ud834\udd3d",
	8: "\ud834\udd3e",
	16: "\ud834\udd3f",
	32: "\ud834\udd40",
	64: "\ud834\udd41",
	128: "\ud834\udd42",
}

function renderAccidental(s) {
	let el = document.createDocumentFragment();
	let letters = s.split("");
	let run = "";
	letters.forEach(letter => {
		if(letter == "b" || letter == "#") {
			if(run != "")
				el.appendChild(h.text(run));
			run = "";
			el.appendChild(h.span("tilt", h.text(letter)));
			return;
		}
		run += letter;
	})
	if(run != "") el.appendChild(h.text(run));
	return el;
}

const chordSlash = "\ue87c";

function nop() { return h.tag("nop"); }

class h {
	static tag(tag, classNames, ...children) {
		const el = document.createElement(tag);
		if (classNames != null && classNames !== "") {
			classNames.split(/\s+/).forEach(className => {
				el.classList.add(className);
			});
		}
		children.forEach(child => { el.appendChild(child); });
		return el;
	}
	static text(text) { return document.createTextNode(text); }
	static span(classNames, ...children) { return h.tag("span", classNames, ...children); }
	static div(classNames, ...children) { return h.tag("div", classNames, ...children); }
}

class Chord {
	static parse(chord) {
		if(chord == "" || chord == ".") {
			return new Space();
		}
		if(chord[0] == "%") {
			return Repeat.parse(chord);
		}
		if(chord[0] == "r") {
			return Rest.parse(chord);
		}


		const reChord = /^([a-zA-Z])([b#]*)([^\/]*)(?:\/(.*))?$/;
		const tokens = chord.match(reChord);
		if(!tokens) throw new Error("unhandled" + chord);

		return new Chord(tokens[1], tokens[2], tokens[3], tokens[4]);
	}

	constructor(note, accidental, alteration, root) {
		this.note = note || "";
		this.accidental = accidental || "";
		this.alteration = alteration || "";
		this.root = root || "";
	}

	toString() {
		let s = this.note + this.accidental + this.alteration;
		if(this.root) {
			s += "/" + this.root;
		}
		return s;
	}

	render() {
		let el = h.tag("chord");
		el.appendChild(h.div("note", h.text(this.note)));
		if(this.accidental) {
			el.appendChild(h.div("accidental", renderAccidental(this.accidental)));
		}

		if(this.alteration) {
			el.appendChild(
				h.div("alteration", renderAccidental(this.alteration)));
		}

		if(this.root) {
			el.classList.add("with-root");
			el.appendChild(h.div("root", renderAccidental("/" + this.root)));
		}

		return el;
	}
}

class Space {
	render() {
		return nop();
	}
}

class Repeat {
	static parse(text) {
		let m = text.match("(%+)([0-9]*)");
		if(m[2] == "") m[2] = "1"
		return new Repeat(m[1].length, parseInt(m[2]))
	}
	constructor(count, measures) {
		this.count = count;
		this.measures = measures;
	}
	render() {
		console.log(this.count, this.measures)
		let p = "";
		if(this.measures == 0) {
			p = String.fromCodePoint(0x01d10D);
		} else if (this.count <= 1) {
			p = String.fromCodePoint(0x01d10E);
		} else {
			p = String.fromCodePoint(0x01d10F);
		}

		// TODO: support multibar repeat

		return h.tag("chord", "", h.text(p));
	}
}

class Rest {
	static parse(text) {
		let m = text.match(/^r([0-9]*)(.*)$/);
		return new Rest(parseInt(m[1]), m[2]);
	}
	constructor(duration, dot) {
		this.duration = duration || 4;
		const augmentDot = String.fromCodePoint(0x1D16D);
		this.dot = "";
		if(dot)
			this.dot = dot.replaceAll(".", augmentDot);
	}

	render() {
		// TODO: support multibar repeat

		let sym = rest[this.duration] || ("r" + duration);
		return h.tag("chord", "", h.text(sym + this.dot));
	}
}

class Cell {
	constructor() {
		this.bar = null;
		this.sig = null;
		this.chord = null;
	}
	renderBar(chart) {
		if(!this.bar && !this.sig) { return nop(); }

		let el = h.tag("bar", "");
		if(this.bar) {
			el.appendChild(h.div("line", h.text(this.bar)));
		}
		if(this.sig) {
			el.appendChild(h.div("hi", h.text(this.sig[0])));
			el.appendChild(h.div("lo", h.text(this.sig[1])));
		}

		return el;
	}
	renderChord(chart) {
		if(!this.chord) { return nop(); }
		return this.chord.render();
	}
}

class Line {
	constructor() {
		this.cells = [];
	}
	render(chart) {
		let frag = document.createDocumentFragment();
		this.cells.forEach((cell, index) => {
			let col = chart.columns[index];
			if(col.bar) {
				frag.appendChild(cell.renderBar());
			}
			if(col.chord) {
				frag.appendChild(cell.renderChord());
			}
		})
		return frag;
	}
}

class Spacer {
	constructor() {
		this.height = 1;
	}
	render(chart) {
		let el = h.tag("spacer");
		el.style["grid-column"] = "span " + chart.columnsCount;
		return el;
	}
}

class Section {
	constructor(title) {
		this.title = title;
	}
	render(chart) {
		let el = h.tag("section");
		el.style["grid-column"] = "span " + chart.columnsCount;

		let t = h.tag("span.title", "title");
		t.className = "title";
		t.innerText = this.title;
		el.appendChild(t);

		return el;
	}
}

class Heading {
	constructor(level, title) {
		this.level = level;
		this.title = title;
	}
	render(chart) {
		let el = h.tag("heading" + this.level);
		el.style["grid-column"] = "span " + chart.columnsCount;

		let t = h.span();
		t.innerText = this.title;
		el.appendChild(t);

		return el;
	}
}

class Chart {
	constructor() {
		this.rows = [];
		this.columns = null;
		this.columnsCount = 0;
	}

	parse(input) {
		const reHeading = /^(#+)\s+(.*)$/;
		const reSection = /^\((.*)\)$/;
		const reSignature = /^(\d+)\/(\d+)$/;

		this.rows = input.trim().split("\n").map(text => {
			text = text.trim();
			if(text === "") {
				return new Spacer();
			}

			const heading = text.match(reHeading);
			if(heading) {
				return new Heading(heading[1].length, heading[2]);
			}

			const section = text.match(reSection)
			if(section){
				return new Section(section[1]);
			}

			let line = new Line();
			let cell = new Cell();

			function emit() {
				line.cells.push(cell);
				cell = new Cell();
			}

			text.trim().split(/ +/).forEach(token => {
				const bar = barline[token];
				if(bar) {
					if(cell.sig || cell.bar || cell.chord) {
						emit();
					}
					cell.bar = bar;
					return;
				}

				const sig = token.match(reSignature);
				if(sig) {
					if(cell.sig || cell.chord) {
						emit();
					}
					cell.sig = [sig[1], sig[2]];
					return;
				}

				if(cell.chord) {
					emit();
				}
				cell.chord = Chord.parse(token);
			});
			line.cells.push(cell);

			return line;
		});

		this.calculateColumns();
	}

	calculateColumns() {
		this.columns = [];

		let maxLine = 0;
		this.rows.forEach(line => {
			if(!(line instanceof Line)) {
				return;
			}
			maxLine = Math.max(maxLine, line.cells.length);
		});

		for(let column = 0; column < maxLine; column++) {
			let has = {
				bar   : false,
				chord : false,
			};

			this.rows.forEach(line => {
				if(!(line instanceof Line)) return;
				let cell = line.cells[column];
				if(!cell) return;

				has.bar ||= cell.sig != null;
				has.bar ||= cell.bar != null;
				has.chord ||= cell.chord != null;
			})

			this.columns.push(has);
		}

		this.columnsCount = 0;
		this.columns.forEach(col => {
			this.columnsCount += (col.sig || col.bar);
			this.columnsCount += col.chord;
		})
		console.log(this.columns, this.columnsCount)
	}

	render(target) {
		let grid = h.tag("grid");
		target.appendChild(grid);

		let template = "";
		this.columns.forEach(col => {
			if(col.bar){
				template += "var(--template-bar) ";
			}
			if(col.chord){
				template += "var(--template-chord) ";
			}
		})

		grid.style["grid-template-columns"] = template;

		this.rows.forEach(row => { 
			grid.appendChild(row.render(this));
		})
	}
}
