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
	"b": "\ue260",
	"bb": "\ue264",
	"bbb": "\ue266",
	"#": "\ue262",
	"##": "\ue263",
	"###": "\ue265",
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
		if(chord == "%") {
			return new Repeat();
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
	render() {
		let el = h.tag("chord");
		el.innerText = "\ue500";
		return el;
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
