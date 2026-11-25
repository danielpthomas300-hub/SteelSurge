/* ==========================================================================
   Steel Surge Code Lab — MiniJava
   A small interpreter for the part of Java that FTC programmers use every day:
   variables (int, long, double, boolean, String, arrays), math with real Java
   integer rules, if / while / for / do, methods, classes with fields, casts,
   String.format, Math and Range. Programs run as generators so sleep() and
   loops can animate a simulated robot without freezing the page.

   Error messages are written for beginners and always carry a line number.
   Works in the browser (window.MiniJava) and in Node (require) for tests.
   ========================================================================== */
(function (root) {
  "use strict";

  class CodeError extends Error {
    constructor(msg, line, col, kind = "error") { super(msg); this.line = line; this.col = col; this.kind = kind; }
  }

  /* ------------------------------------------------------------------ Lexer */
  const KEYWORDS = new Set(("abstract boolean break byte case catch char class continue default do double else enum extends final finally float for if " +
    "implements import instanceof int interface long new null package private protected public return short static super switch synchronized this throw throws " +
    "true false try void volatile while var").split(" "));
  const PRIMS = new Set(["int", "double", "float", "long", "short", "byte", "boolean", "char", "String", "void", "var"]);
  const OPS = [">>>=", "<<=", ">>=", ">>>", "==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "->", "::", "<<", ">>"];
  const ESC = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", 0: "\0", '"': '"', "'": "'", "\\": "\\" };

  function lex(src) {
    const toks = []; let i = 0, line = 1, col = 1;
    const push = (type, value, l, c, len) => toks.push({ type, value, line: l, col: c, len });
    while (i < src.length) {
      const ch = src[i];
      if (ch === "\n") { i++; line++; col = 1; continue; }
      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\f") { i++; col++; continue; }
      if (ch === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") { i++; col++; } continue; }
      if (ch === "/" && src[i + 1] === "*") {
        const l = line, c = col; i += 2; col += 2;
        while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") { line++; col = 1; } else col++; i++; }
        if (i >= src.length) throw new CodeError("This comment starts with /* but never ends. Add */ where the comment should stop.", l, c);
        i += 2; col += 2; continue;
      }
      const l = line, c = col;
      if (/[A-Za-z_$]/.test(ch)) {
        let j = i; while (j < src.length && /[\w$]/.test(src[j])) j++;
        const w = src.slice(i, j); push(KEYWORDS.has(w) ? "kw" : "id", w, l, c, j - i); col += j - i; i = j; continue;
      }
      if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] || ""))) {
        let j = i, isD = false;
        if (ch === "0" && /[xX]/.test(src[i + 1] || "")) { j += 2; while (/[0-9a-fA-F_]/.test(src[j] || "")) j++; }
        else {
          while (/[0-9_]/.test(src[j] || "")) j++;
          if (src[j] === "." && /[0-9]/.test(src[j + 1] || "")) { isD = true; j++; while (/[0-9_]/.test(src[j] || "")) j++; }
          else if (src[j] === "." && !/[A-Za-z_]/.test(src[j + 1] || "")) { isD = true; j++; }
          if (/[eE]/.test(src[j] || "")) { let k = j + 1; if (/[+-]/.test(src[k] || "")) k++; if (/[0-9]/.test(src[k] || "")) { isD = true; j = k; while (/[0-9]/.test(src[j] || "")) j++; } }
        }
        let suffix = ""; if (/[dDfFlL]/.test(src[j] || "")) { suffix = src[j].toLowerCase(); j++; }
        const text = src.slice(i, j).replace(/_/g, "").replace(/[dfl]$/i, "");
        const v = Number(text);
        const t = suffix === "d" || suffix === "f" || isD ? "double" : suffix === "l" ? "long" : "int";
        if (t === "int" && Math.abs(v) > 2147483648) throw new CodeError(`${text} is too big for an int. Add L for a long (${text}L) or use a double.`, l, c);
        push("num", { v, t }, l, c, j - i); col += j - i; i = j; continue;
      }
      if (ch === '"') {
        let j = i + 1, s = "";
        while (j < src.length && src[j] !== '"') {
          if (src[j] === "\n") throw new CodeError('This text is missing its closing quote ". Text (a String) has to start and end on the same line.', l, c);
          if (src[j] === "\\") { s += ESC[src[j + 1]] ?? src[j + 1]; j += 2; } else s += src[j++];
        }
        if (j >= src.length) throw new CodeError('This text is missing its closing quote ".', l, c);
        push("str", s, l, c, j + 1 - i); col += j + 1 - i; i = j + 1; continue;
      }
      if (ch === "'") {
        let j = i + 1, s = src[j];
        if (s === "\\") { s = ESC[src[j + 1]] ?? src[j + 1]; j++; }
        if (src[j + 1] !== "'") throw new CodeError("Single quotes hold exactly one character, like 'a'. For text, use double quotes: \"hello\".", l, c);
        push("char", s, l, c, j + 2 - i); col += j + 2 - i; i = j + 2; continue;
      }
      const op = OPS.find((o) => src.startsWith(o, i)) || ch;
      if (!"+-*/%=<>!&|^~?:;,.(){}[]@".includes(op[0])) throw new CodeError(`Java doesn't understand the character "${ch}" here.`, l, c);
      push("op", op, l, c, op.length); i += op.length; col += op.length;
    }
    push("eof", null, line, col, 0);
    return toks;
  }

  /* ------------------------------------------------------------------ Parser */
  const tokText = (t) => (t.type === "eof" ? "the end of the code" : t.type === "str" ? `"${t.value}"` : t.type === "num" ? String(t.value.v) : t.type === "char" ? `'${t.value}'` : `"${t.value}"`);
  const MODIFIERS = new Set(["public", "private", "protected", "static", "final", "abstract", "synchronized", "volatile"]);

  class Parser {
    constructor(toks) { this.t = toks; this.i = 0; }
    peek(o = 0) { return this.t[Math.min(this.i + o, this.t.length - 1)]; }
    prev() { return this.t[this.i - 1] || this.t[0]; }
    next() { return this.t[this.i++]; }
    is(type, v, o = 0) { const k = this.peek(o); return k.type === type && (v === undefined || k.value === v); }
    isOp(v, o = 0) { return this.is("op", v, o); }
    isKw(v, o = 0) { return this.is("kw", v, o); }
    eatOp(v) { return this.isOp(v) ? this.next() : null; }
    eatKw(v) { return this.isKw(v) ? this.next() : null; }
    fail(msg, tok = this.peek()) { throw new CodeError(msg, tok.line, tok.col); }
    expectOp(v, what) {
      if (this.isOp(v)) return this.next();
      const k = this.peek(), p = this.prev();
      if (v === ";" && k.line > p.line) throw new CodeError("Missing ; at the end of this line. In Java, every statement ends with a semicolon.", p.line, p.col + (p.len || 1));
      if (v === ";" && k.type === "op" && (k.value === "}" || k.value === ")")) throw new CodeError("Missing ; at the end of this statement.", p.line, p.col + (p.len || 1));
      if (v === ";") this.fail(`Expected ; before ${tokText(k)}. Is something missing, or is there an extra word?`);
      if (v === ")" ) this.fail(`Expected ) ${what || ""} but found ${tokText(k)}. Check that every ( has a matching ).`.replace("  ", " "));
      if (v === "}" ) this.fail(`Expected } but found ${tokText(k)}. Check that every { has a matching }.`);
      this.fail(`Expected ${v}${what ? " " + what : ""} but found ${tokText(k)}.`);
    }
    expectId(what) {
      if (this.is("id")) return this.next();
      const k = this.peek();
      if (k.type === "kw") this.fail(`"${k.value}" is a reserved Java word, so it can't be used as ${what || "a name"}.`);
      this.fail(`Expected ${what || "a name"} but found ${tokText(k)}.`);
    }
    node(k, tok, extra) { return Object.assign({ k, line: tok.line, col: tok.col }, extra); }

    /* ---- program ---- */
    program() {
      const prog = { fields: [], methods: new Map(), className: null, superName: null, annotations: [] };
      while (!this.is("eof")) {
        if (this.eatKw("package") || this.eatKw("import")) { while (!this.isOp(";") && !this.is("eof")) this.next(); this.expectOp(";"); continue; }
        const ann = this.annotations(); const mods = this.modifiers();
        if (this.isKw("class")) {
          if (prog.className) this.fail("Only one class fits in the Code Lab. Put helper methods inside your main class.");
          this.next(); prog.className = this.expectId("a class name").value; prog.annotations = ann;
          if (this.eatKw("extends")) prog.superName = this.qualifiedName();
          if (this.eatKw("implements")) { this.qualifiedName(); while (this.eatOp(",")) this.qualifiedName(); }
          this.expectOp("{", "to start the class");
          while (!this.isOp("}")) { if (this.is("eof")) this.fail("The class is missing its closing }. Check that every { has a matching }."); this.member(prog); }
          this.next();
          continue;
        }
        this.member(prog, mods);
      }
      return prog;
    }
    annotations() {
      const out = [];
      while (this.isOp("@")) {
        const at = this.next(); const name = this.qualifiedName(); const ann = { name, args: {}, line: at.line };
        if (this.eatOp("(")) {
          let depth = 1, key = "value";
          while (depth > 0) {
            const k = this.next();
            if (k.type === "eof") this.fail(`The @${name} annotation is missing its closing ).`, at);
            if (k.type === "op" && k.value === "(") depth++;
            else if (k.type === "op" && k.value === ")") depth--;
            else if (k.type === "id" && this.isOp("=") && depth === 1) key = k.value;
            else if (k.type === "str" && depth === 1) ann.args[key] = k.value;
          }
        }
        out.push(ann);
      }
      return out;
    }
    modifiers() { const m = new Set(); while (this.is("kw") && MODIFIERS.has(this.peek().value)) m.add(this.next().value); return m; }
    qualifiedName() { let n = this.expectId("a name").value; while (this.isOp(".") && this.is("id", undefined, 1)) { this.next(); n += "." + this.next().value; } return n; }
    member(prog, preMods) {
      this.annotations(); const mods = preMods && preMods.size ? preMods : this.modifiers(); this.annotations();
      if (this.isKw("class") || this.isKw("interface") || this.isKw("enum")) this.fail("Inner classes, interfaces, and enums aren't supported in the Code Lab. Use methods and variables instead.");
      const start = this.peek();
      if (!this.isTypeStart()) this.fail(`Expected a method or a variable here, but found ${tokText(start)}.`);
      const type = this.type();
      if (this.isOp("(") ) this.fail(`This looks like a constructor. The Code Lab doesn't support constructors; put setup code at the start of runOpMode().`, start);
      const nameTok = this.expectId("a name");
      if (this.isOp("(")) {
        const m = this.methodRest(type, nameTok, mods);
        const list = prog.methods.get(m.name) || []; if (list.some((x) => x.params.length === m.params.length)) this.fail(`There are two methods called ${m.name} with ${m.params.length} parameter${m.params.length === 1 ? "" : "s"}. Give one a different name.`, nameTok);
        list.push(m); prog.methods.set(m.name, list); return;
      }
      for (const d of this.declaratorsAfterName(type, nameTok)) prog.fields.push(Object.assign(d, { isStatic: mods.has("static"), isFinal: mods.has("final") }));
      this.expectOp(";");
    }
    methodRest(type, nameTok, mods) {
      this.expectOp("(");
      const params = [];
      if (!this.isOp(")")) {
        do { this.annotations(); this.eatKw("final"); const pt = this.type(); const pn = this.expectId("a parameter name"); params.push({ type: pt, name: pn.value }); } while (this.eatOp(","));
      }
      this.expectOp(")", "to finish the parameter list");
      if (this.eatKw("throws")) { this.qualifiedName(); while (this.eatOp(",")) this.qualifiedName(); }
      if (!this.isOp("{")) this.fail(`The method ${nameTok.value} needs a body in { }.`);
      const body = this.block();
      return { name: nameTok.value, ret: type, params, body, line: nameTok.line, isStatic: mods.has("static") };
    }

    /* ---- types ---- */
    isTypeStart() { const k = this.peek(); return (k.type === "kw" && PRIMS.has(k.value)) || k.type === "id"; }
    type() {
      const k = this.peek(); let name;
      if (k.type === "kw" && PRIMS.has(k.value)) name = this.next().value;
      else if (k.type === "id") name = this.qualifiedName();
      else this.fail(`Expected a type (like int, double, or DcMotor) but found ${tokText(k)}.`);
      if (this.isOp("<")) this.fail("Generic types like List<Double> aren't supported in the Code Lab. Use an array instead, like double[].");
      while (this.isOp("[") && this.isOp("]", 1)) { this.next(); this.next(); name += "[]"; }
      return name;
    }
    /** Looks ahead (without consuming) for "Type name" so we can tell declarations from expressions. */
    isDeclStart() {
      const save = this.i;
      try {
        if (this.isKw("final")) return true;
        const k = this.peek();
        if (k.type === "kw" && PRIMS.has(k.value)) return true;
        if (k.type !== "id") return false;
        this.next(); while (this.isOp(".") && this.is("id", undefined, 1)) { this.next(); this.next(); }
        if (this.isOp("<")) return true; // reported as unsupported by type()
        while (this.isOp("[") && this.isOp("]", 1)) { this.next(); this.next(); }
        return this.is("id") && (this.isOp("=", 1) || this.isOp(";", 1) || this.isOp(",", 1) || this.isOp(":", 1) || this.isOp("[", 1));
      } finally { this.i = save; }
    }
    declaratorsAfterName(type, nameTok) {
      const out = [];
      let name = nameTok;
      for (;;) {
        let t = type;
        while (this.isOp("[") && this.isOp("]", 1)) { this.next(); this.next(); t += "[]"; }
        let init = null;
        if (this.eatOp("=")) init = this.isOp("{") ? this.arrayLiteral() : this.expr();
        out.push(this.node("decl", name, { type: t, name: name.value, init }));
        if (!this.eatOp(",")) break;
        name = this.expectId("a variable name");
      }
      return out;
    }
    arrayLiteral() {
      const open = this.expectOp("{"); const items = [];
      if (!this.isOp("}")) { do { if (this.isOp("}")) break; items.push(this.isOp("{") ? this.arrayLiteral() : this.expr()); } while (this.eatOp(",")); }
      this.expectOp("}");
      return this.node("arrlit", open, { items });
    }

    /* ---- statements ---- */
    block() {
      const open = this.expectOp("{"); const body = [];
      while (!this.isOp("}")) {
        if (this.is("eof")) throw new CodeError("A { on this line is never closed. Add a matching } at the end of the block.", open.line, open.col);
        body.push(this.statement());
      }
      this.next();
      return this.node("block", open, { body });
    }
    statement() {
      const k = this.peek();
      if (this.isOp("{")) return this.block();
      if (this.isOp(";")) { this.next(); return this.node("empty", k); }
      if (this.isOp("@")) { this.annotations(); return this.statement(); }
      if (k.type === "kw") {
        switch (k.value) {
          case "if": { this.next(); this.expectOp("(", "after if"); const c = this.expr(); this.expectOp(")", "to close the if condition"); const a = this.statement(); const b = this.eatKw("else") ? this.statement() : null; return this.node("if", k, { c, a, b }); }
          case "while": { this.next(); this.expectOp("(", "after while"); const c = this.expr(); this.expectOp(")", "to close the while condition"); if (this.isOp(";")) this.warnEmptyLoop = k.line; return this.node("while", k, { c, body: this.statement() }); }
          case "do": { this.next(); const body = this.statement(); if (!this.eatKw("while")) this.fail("A do { } loop needs while (condition); after it."); this.expectOp("("); const c = this.expr(); this.expectOp(")"); this.expectOp(";"); return this.node("dowhile", k, { c, body }); }
          case "for": return this.forStatement();
          case "return": { this.next(); const e = this.isOp(";") ? null : this.expr(); this.expectOp(";"); return this.node("return", k, { e }); }
          case "break": this.next(); this.expectOp(";"); return this.node("break", k);
          case "continue": this.next(); this.expectOp(";"); return this.node("continue", k);
          case "switch": this.fail("switch isn't supported in the Code Lab yet. Use if / else if / else instead.");
          case "try": this.fail("try / catch isn't needed in the Code Lab. Remove it and keep the code inside.");
          case "throw": this.fail("throw isn't supported in the Code Lab.");
          case "else": this.fail("This else doesn't have an if before it. Check the { } around the if.");
          case "class": this.fail("Classes can't go inside a method.");
          case "public": case "private": case "protected": case "static":
            this.fail(`"${k.value}" can't be used inside a method. Did a method or class end too early? Check your { }.`);
        }
      }
      if (this.isDeclStart()) {
        this.eatKw("final");
        const type = this.type(); const nameTok = this.expectId("a variable name");
        if (this.isOp("(")) this.fail("Methods can't be written inside another method. Move it outside runOpMode(), inside the class.", nameTok);
        const decls = this.declaratorsAfterName(type, nameTok); this.expectOp(";");
        return decls.length === 1 ? decls[0] : this.node("decls", k, { decls });
      }
      const e = this.expr();
      if (!["assign", "update", "call", "new"].includes(e.k)) {
        if (e.k === "bin" && e.op === "==") this.fail("This compares with == but doesn't use the result. To change a variable, use a single = .", k);
        this.fail("This line doesn't do anything on its own. A statement should change a variable (x = 5;) or call a method (sleep(500);).", k);
      }
      this.expectOp(";");
      return this.node("expr", k, { e });
    }
    forStatement() {
      const k = this.next(); this.expectOp("(", "after for");
      if (this.isDeclStart()) {
        const save = this.i; this.eatKw("final"); const type = this.type(); const nameTok = this.expectId("a variable name");
        if (this.eatOp(":")) { const arr = this.expr(); this.expectOp(")"); return this.node("foreach", k, { type, name: nameTok.value, arr, body: this.statement() }); }
        this.i = save;
      }
      let init = [];
      if (!this.isOp(";")) {
        if (this.isDeclStart()) { this.eatKw("final"); const type = this.type(); init = this.declaratorsAfterName(type, this.expectId("a variable name")); }
        else { do init.push(this.node("expr", this.peek(), { e: this.expr() })); while (this.eatOp(",")); }
      }
      this.expectOp(";");
      const c = this.isOp(";") ? null : this.expr(); this.expectOp(";");
      const upd = []; if (!this.isOp(")")) { do upd.push(this.expr()); while (this.eatOp(",")); }
      this.expectOp(")", "to close the for loop header");
      return this.node("for", k, { init, c, upd, body: this.statement() });
    }

    /* ---- expressions ---- */
    expr() { return this.assignment(); }
    assignment() {
      const left = this.ternary();
      const k = this.peek();
      if (k.type === "op" && ["=", "+=", "-=", "*=", "/=", "%="].includes(k.value)) {
        if (!["name", "member", "index"].includes(left.k)) this.fail(k.value === "=" ? "The left side of = must be a variable. To compare two values, use == ." : `The left side of ${k.value} must be a variable.`, k);
        this.next(); const value = this.isOp("{") ? this.fail("Curly-brace lists like {1, 2} only work when you first declare an array, like double[] a = {1, 2};") : this.assignment();
        return this.node("assign", k, { op: k.value, target: left, value });
      }
      if (k.type === "op" && k.value === "->") this.fail("Lambdas (->) aren't supported in the Code Lab.");
      return left;
    }
    ternary() {
      const c = this.binary(0);
      if (this.isOp("?")) { const q = this.next(); const a = this.assignment(); this.expectOp(":", "in the ? : expression"); const b = this.assignment(); return this.node("cond", q, { c, a, b }); }
      return c;
    }
    binary(level) {
      const LEVELS = [["||"], ["&&"], ["|"], ["^"], ["&"], ["==", "!="], ["<", ">", "<=", ">=", "instanceof"], ["<<", ">>", ">>>"], ["+", "-"], ["*", "/", "%"]];
      if (level >= LEVELS.length) return this.unary();
      let left = this.binary(level + 1);
      for (;;) {
        const k = this.peek();
        const op = k.type === "op" ? k.value : k.type === "kw" && k.value === "instanceof" ? "instanceof" : null;
        if (!op || !LEVELS[level].includes(op)) return left;
        if (op === "instanceof") this.fail("instanceof isn't supported in the Code Lab.");
        if (["|", "^", "&", "<<", ">>", ">>>"].includes(op)) this.fail(op === "&" || op === "|" ? `Use ${op}${op} for "${op === "&" ? "and" : "or"}" in conditions. Bitwise ${op} isn't supported in the Code Lab.` : `The ${op} operator isn't supported in the Code Lab.`);
        this.next();
        const right = this.binary(level + 1);
        left = this.node(op === "&&" || op === "||" ? "logic" : "bin", k, { op, l: left, r: right });
      }
    }
    unary() {
      const k = this.peek();
      if (k.type === "op" && ["!", "-", "+", "~"].includes(k.value)) { this.next(); if (k.value === "~") this.fail("The ~ operator isn't supported in the Code Lab."); return this.node("unary", k, { op: k.value, e: this.unary() }); }
      if (k.type === "op" && (k.value === "++" || k.value === "--")) { this.next(); const target = this.unary(); this.checkTarget(target, k); return this.node("update", k, { op: k.value, prefix: true, target }); }
      // cast: (int) x, (double) x
      if (this.isOp("(") && this.peek(1).type === "kw" && PRIMS.has(this.peek(1).value) && this.isOp(")", 2)) {
        this.next(); const t = this.next().value; this.next();
        if (t === "void" || t === "var") this.fail(`You can't cast to ${t}.`, k);
        return this.node("cast", k, { type: t, e: this.unary() });
      }
      return this.postfix(this.primary());
    }
    checkTarget(t, tok) { if (!["name", "member", "index"].includes(t.k)) this.fail(`${tok.value} only works on a variable.`, tok); }
    postfix(e) {
      for (;;) {
        const k = this.peek();
        if (this.isOp(".")) {
          this.next();
          const n = this.peek();
          if (n.type === "id" || (n.type === "kw" && (n.value === "class" || n.value === "length" || n.value === "this"))) this.next();
          else this.fail(`Expected a name after the dot but found ${tokText(n)}.`);
          if (this.isOp("(")) { e = this.node("call", n, { obj: e, name: n.value, args: this.args() }); continue; }
          e = this.node("member", n, { obj: e, name: n.value }); continue;
        }
        if (this.isOp("[")) { this.next(); const idx = this.expr(); this.expectOp("]", "to close the array index"); e = this.node("index", k, { obj: e, idx }); continue; }
        if (this.isOp("++") || this.isOp("--")) { this.next(); this.checkTarget(e, k); e = this.node("update", k, { op: k.value, prefix: false, target: e }); continue; }
        return e;
      }
    }
    args() {
      this.expectOp("("); const a = [];
      if (!this.isOp(")")) { do { if (this.isOp(")")) this.fail("There's an extra comma before )."); a.push(this.expr()); } while (this.eatOp(",")); }
      this.expectOp(")", "to finish the method call");
      return a;
    }
    primary() {
      const k = this.peek();
      switch (k.type) {
        case "num": this.next(); return this.node("lit", k, { v: k.value.v, t: k.value.t });
        case "str": this.next(); return this.node("lit", k, { v: k.value, t: "String" });
        case "char": this.next(); return this.node("lit", k, { v: k.value, t: "char" });
        case "id":
          this.next();
          if (this.isOp("(")) return this.node("call", k, { obj: null, name: k.value, args: this.args() });
          return this.node("name", k, { name: k.value });
        case "kw":
          if (k.value === "true" || k.value === "false") { this.next(); return this.node("lit", k, { v: k.value === "true", t: "boolean" }); }
          if (k.value === "null") { this.next(); return this.node("lit", k, { v: null, t: "null" }); }
          if (k.value === "this") { this.next(); return this.node("this", k); }
          if (k.value === "new") return this.newExpr();
          if (k.value === "super") this.fail("super isn't needed in the Code Lab.");
          if (PRIMS.has(k.value)) this.fail(`"${k.value}" is a type. To make a variable, write ${k.value} name = value; on its own line.`);
          this.fail(`"${k.value}" can't be used here.`);
          break;
        case "op":
          if (k.value === "(") { this.next(); const e = this.expr(); this.expectOp(")", "to close the parentheses"); return e; }
          if (k.value === ")") this.fail("There's an extra ) here, or something is missing before it.");
          if (k.value === ";") this.fail("Something is missing before this ;");
          this.fail(`Didn't expect ${tokText(k)} here.`);
          break;
        case "eof": this.fail("The code ends too early. Is a } or ) missing?");
      }
      this.fail(`Didn't expect ${tokText(k)} here.`);
    }
    newExpr() {
      const k = this.next();
      const p = this.peek(); let type;
      if (p.type === "kw" && PRIMS.has(p.value)) type = this.next().value;
      else type = this.qualifiedName();
      if (this.isOp("[")) {
        if (this.isOp("]", 1)) { this.next(); this.next(); let t = type + "[]"; while (this.isOp("[") && this.isOp("]", 1)) { this.next(); this.next(); t += "[]"; } return this.node("newarr", k, { type: t, size: null, init: this.arrayLiteral() }); }
        this.next(); const size = this.expr(); this.expectOp("]"); return this.node("newarr", k, { type: type + "[]", size, init: null });
      }
      if (this.isOp("<")) this.fail("Generic types aren't supported in the Code Lab.");
      return this.node("new", k, { type, args: this.args() });
    }
  }

  function parse(src) {
    const p = new Parser(lex(src));
    return p.program();
  }

  /* ------------------------------------------------------------------ Values */
  const V = (v, t) => ({ v, t });
  const VOID = V(undefined, "void");
  const NUMERIC = new Set(["int", "long", "double", "char"]);
  const isIntish = (t) => t === "int" || t === "long" || t === "char";
  const toInt32 = (x) => x | 0;
  const prettyType = (t) => (t === "null" ? "null" : t);
  const numOf = (x) => (x.t === "char" ? x.v.charCodeAt(0) : x.v);

  /** Java's Double.toString, close enough for telemetry and tests. */
  function fmtDouble(d) {
    if (Number.isNaN(d)) return "NaN";
    if (!Number.isFinite(d)) return d > 0 ? "Infinity" : "-Infinity";
    if (d === 0) return Object.is(d, -0) ? "-0.0" : "0.0";
    const a = Math.abs(d);
    if (a >= 1e-3 && a < 1e7) { const s = String(d); return s.includes(".") || s.includes("e") ? s : s + ".0"; }
    let [m, e] = d.toExponential().split("e"); if (!m.includes(".")) m += ".0";
    return `${m}E${Number(e)}`;
  }
  function toStr(x) {
    switch (x.t) {
      case "double": return fmtDouble(x.v);
      case "int": case "long": return String(x.v);
      case "boolean": return x.v ? "true" : "false";
      case "String": case "char": return x.v;
      case "null": return "null";
      case "array": return `[${x.v.elem}[] of ${x.v.items.length}]`;
      default: return x.v?.__str ? x.v.__str() : x.v?.__cls || String(x.v);
    }
  }
  /** String.format with %d %f %.2f %s %b %n %% and widths like %5.1f */
  function jformat(fmt, args, line) {
    let i = 0;
    return fmt.replace(/%([-0+ ]*)(\d+)?(?:\.(\d+))?([dfsbxn%])/g, (all, flags, width, prec, conv) => {
      if (conv === "%") return "%"; if (conv === "n") return "\n";
      if (i >= args.length) throw new CodeError(`String.format has ${all} but not enough values after the text.`, line);
      const a = args[i++]; let s;
      if (conv === "d") { if (!isIntish(a.t)) throw new CodeError(`%d needs a whole number (int), but got a ${a.t}. Use %.2f for decimals.`, line); s = String(numOf(a)); }
      else if (conv === "f") { if (!NUMERIC.has(a.t)) throw new CodeError(`%f needs a number, but got a ${a.t}.`, line); s = Number(numOf(a)).toFixed(prec == null ? 6 : Number(prec)); if (flags.includes("+") && numOf(a) >= 0) s = "+" + s; }
      else if (conv === "x") s = (numOf(a) >>> 0).toString(16);
      else if (conv === "b") s = String(a.t === "boolean" ? a.v : a.v != null);
      else s = toStr(a);
      if (width && s.length < Number(width)) s = flags.includes("-") ? s.padEnd(Number(width)) : s.padStart(Number(width), flags.includes("0") && conv !== "s" ? "0" : " ");
      return s;
    });
  }

  /** Small edit distance for "did you mean" hints. */
  function lev(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    const d = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } }
    return d[b.length];
  }
  function suggest(name, options) {
    let best = null, bd = 99;
    for (const o of options) { if (!o || o.startsWith("__") || o === name) continue; const s = o.toLowerCase() === name.toLowerCase() ? 0 : lev(name, o); if (s < bd) { bd = s; best = o; } }
    if (!best) return null;
    if (bd === 0) return best; // same word, different capital letters
    return name.length >= 3 && bd <= Math.max(1, Math.floor(name.length / 3)) ? best : null;
  }
  const didYouMean = (name, opts) => { const s = suggest(name, opts); return s ? ` Did you mean ${s}?` : ""; };

  /* ------------------------------------------------------------------ Standard library */
  const num = (x, fn, line) => { if (!NUMERIC.has(x.t)) throw new CodeError(`${fn} needs a number, but got a ${prettyType(x.t)}.`, line); return numOf(x); };
  const widest = (...a) => (a.some((x) => x.t === "double") ? "double" : a.some((x) => x.t === "long") ? "long" : "int");
  function hostObj(cls, members, extra) { return Object.assign({ __cls: cls, __m: members.m || {}, __f: members.f || {} }, extra); }
  const D = (fn) => (args, line, name) => V(fn(...args.map((a) => num(a, `Math.${name}`, line))), "double");
  const mathLib = hostObj("Math", {
    f: { PI: V(Math.PI, "double"), E: V(Math.E, "double") },
    m: {
      abs: (a, line) => { const x = a[0]; num(x, "Math.abs", line); return V(Math.abs(numOf(x)), x.t === "char" ? "int" : x.t); },
      max: (a, line) => V(Math.max(num(a[0], "Math.max", line), num(a[1], "Math.max", line)), widest(a[0], a[1])),
      min: (a, line) => V(Math.min(num(a[0], "Math.min", line), num(a[1], "Math.min", line)), widest(a[0], a[1])),
      round: (a, line) => { const x = num(a[0], "Math.round", line); return V(Math.floor(x + 0.5), "long"); },
      floor: D(Math.floor), ceil: D(Math.ceil), sqrt: D(Math.sqrt), cbrt: D(Math.cbrt), pow: D(Math.pow), sin: D(Math.sin), cos: D(Math.cos), tan: D(Math.tan),
      asin: D(Math.asin), acos: D(Math.acos), atan: D(Math.atan), atan2: D(Math.atan2), hypot: D(Math.hypot), exp: D(Math.exp), log: D(Math.log), log10: D(Math.log10),
      toRadians: D((d) => (d * Math.PI) / 180), toDegrees: D((r) => (r * 180) / Math.PI), signum: D(Math.sign), random: () => V(Math.random(), "double"),
    },
  });
  const rangeLib = hostObj("Range", {
    m: { clip: (a, line) => { const [x, lo, hi] = a.map((v) => num(v, "Range.clip", line)); return V(Math.min(hi, Math.max(lo, x)), widest(...a)); },
      scale: (a, line) => { const [n, x1, x2, y1, y2] = a.map((v) => num(v, "Range.scale", line)); return V(y1 + ((n - x1) * (y2 - y1)) / (x2 - x1), "double"); } },
  });
  const stringLib = hostObj("String", { m: {
    format: (a, line) => { if (!a.length || a[0].t !== "String") throw new CodeError("String.format needs text first, like String.format(\"%.2f\", x).", line); return V(jformat(a[0].v, a.slice(1), line), "String"); },
    valueOf: (a) => V(toStr(a[0]), "String"),
  } });
  const wrap = (cls, parse) => hostObj(cls, { m: { parseInt: (a, line) => parse(a, line), parseDouble: (a, line) => parse(a, line), toString: (a) => V(toStr(a[0]), "String"), valueOf: (a, line) => parse(a, line) }, f: cls === "Integer" ? { MAX_VALUE: V(2147483647, "int"), MIN_VALUE: V(-2147483648, "int") } : { MAX_VALUE: V(Number.MAX_VALUE, "double"), POSITIVE_INFINITY: V(Infinity, "double"), NEGATIVE_INFINITY: V(-Infinity, "double"), NaN: V(NaN, "double") } });
  const integerLib = wrap("Integer", (a, line) => { const n = Number(a[0].v); if (a[0].t !== "String" || !/^[-+]?\d+$/.test(String(a[0].v).trim())) throw new CodeError(`NumberFormatException: "${a[0].v}" isn't a whole number.`, line); return V(n | 0, "int"); });
  const doubleLib = wrap("Double", (a, line) => { const n = Number(a[0].v); if (Number.isNaN(n)) throw new CodeError(`NumberFormatException: "${a[0].v}" isn't a number.`, line); return V(n, "double"); });
  const STRING_METHODS = {
    length: (s) => V(s.length, "int"), isEmpty: (s) => V(s.length === 0, "boolean"), toUpperCase: (s) => V(s.toUpperCase(), "String"), toLowerCase: (s) => V(s.toLowerCase(), "String"), trim: (s) => V(s.trim(), "String"),
    equals: (s, a) => V(a[0].t === "String" && a[0].v === s, "boolean"), equalsIgnoreCase: (s, a) => V(a[0].t === "String" && a[0].v.toLowerCase() === s.toLowerCase(), "boolean"),
    contains: (s, a) => V(s.includes(toStr(a[0])), "boolean"), startsWith: (s, a) => V(s.startsWith(toStr(a[0])), "boolean"), endsWith: (s, a) => V(s.endsWith(toStr(a[0])), "boolean"),
    indexOf: (s, a) => V(s.indexOf(toStr(a[0])), "int"), charAt: (s, a, line) => { const i = numOf(a[0]); if (i < 0 || i >= s.length) throw new CodeError(`StringIndexOutOfBoundsException: index ${i}, but the text has ${s.length} characters.`, line); return V(s[i], "char"); },
    substring: (s, a, line) => { const b = numOf(a[0]), e = a[1] ? numOf(a[1]) : s.length; if (b < 0 || e > s.length || b > e) throw new CodeError(`StringIndexOutOfBoundsException: substring(${b}, ${e}) on text of length ${s.length}.`, line); return V(s.slice(b, e), "String"); },
    replace: (s, a) => V(s.split(toStr(a[0])).join(toStr(a[1])), "String"), compareTo: (s, a) => V(s < a[0].v ? -1 : s > a[0].v ? 1 : 0, "int"),
  };

  const KNOWN_TYPES = new Set(["int", "long", "short", "byte", "double", "float", "boolean", "char", "String", "var", "void", "Object", "Integer", "Double", "Boolean"]);
  const BOXED = { Integer: "int", Double: "double", Boolean: "boolean", Long: "long" };
  const normType = (t) => (t === "float" ? "double" : t === "short" || t === "byte" ? "int" : BOXED[t] || t);
  const defaultFor = (t) => (t === "boolean" ? V(false, "boolean") : t === "double" ? V(0, "double") : t === "int" || t === "long" ? V(0, t) : t === "char" ? V("\0", "char") : V(null, "null"));

  /* ------------------------------------------------------------------ Interpreter */
  const BREAK = { sig: "break" }, CONTINUE = { sig: "continue" };
  const TICK = { tick: true };

  class Scope {
    constructor(parent, isMethodRoot = false) { this.vars = new Map(); this.parent = parent; this.isMethodRoot = isMethodRoot; }
    find(name) { for (let s = this; s; s = s.parent) if (s.vars.has(name)) return s.vars.get(name); return null; }
    findLocal(name) { for (let s = this; s; s = s.parent) { if (s.vars.has(name)) return s.vars.get(name); if (s.isMethodRoot) return null; } return null; }
    names() { const n = []; for (let s = this; s; s = s.parent) n.push(...s.vars.keys()); return n; }
  }

  class Interp {
    /**
     * host = { globals: { name: V }, builtins: { name(args, line) -> V | generator }, types: Set of extra type names,
     *          construct(type, args, line) -> V, onLine(line) }
     */
    constructor(program, host = {}) {
      this.p = program; this.host = host; this.depth = 0; this.curLine = 0; this.stack = []; this.curScope = null;
      this.globals = Object.assign({ Math: V(mathLib, "obj"), Range: V(rangeLib, "obj"), String: V(stringLib, "obj"), Integer: V(integerLib, "obj"), Double: V(doubleLib, "obj") }, host.globals || {});
      this.types = new Set([...KNOWN_TYPES, ...(host.types || [])]);
      this.cls = new Scope(null);
    }
    err(msg, node) { return new CodeError(msg, node?.line ?? this.curLine, node?.col); }
    /** What's in scope right now: the current method's variables (outer blocks first) and the class fields. */
    snapshot() {
      const scopes = [];
      for (let s = this.curScope; s && s !== this.cls; s = s.parent) { scopes.unshift(s); if (s.isMethodRoot) break; }
      const locals = [], seen = new Map();
      for (const s of scopes) for (const [name, slot] of s.vars) { if (seen.has(name)) locals[seen.get(name)] = { name, type: slot.type, v: slot.v }; else { seen.set(name, locals.length); locals.push({ name, type: slot.type, v: slot.v }); } }
      const fields = [...this.cls.vars].map(([name, slot]) => ({ name, type: slot.type, v: slot.v, field: true }));
      return { method: this.stack[this.stack.length - 1] || "", stack: [...this.stack], locals, fields };
    }

    /* ---- type checks ---- */
    checkTypeName(t, node) {
      const base = t.replace(/\[\]/g, "");
      if (!this.types.has(base) && !this.types.has(base.split(".")[0])) throw this.err(`Java doesn't know a type called ${base}.${didYouMean(base, [...this.types])}`, node);
    }
    /** Converts a value for storing in a variable of type t (Java assignment rules). */
    coerce(x, t, node, what = "this variable") {
      t = normType(t);
      if (t === "var") return x;
      if (t.endsWith("[]")) {
        if (x.t === "null") return x;
        if (x.t !== "array") throw this.err(`${what} is a ${t} (an array), but the value is a ${prettyType(x.t)}.`, node);
        if (normType(x.v.elem) + "[]" !== t) throw this.err(`${what} is a ${t}, but the array holds ${x.v.elem} values.`, node);
        return x;
      }
      switch (t) {
        case "double": if (NUMERIC.has(x.t)) return V(numOf(x), "double"); break;
        case "long": if (x.t === "int" || x.t === "long" || x.t === "char") return V(numOf(x), "long"); if (x.t === "double") throw this.err(`${what} is a long, but this value is a double (it can have decimals). Java won't drop the decimals for you: use (long) or Math.round(...).`, node); break;
        case "int": if (x.t === "int") return x; if (x.t === "char") return V(numOf(x), "int");
          if (x.t === "double") throw this.err(`${what} is an int (whole numbers only), but this value is a double. Java won't drop the decimals for you: use (int) to cut them off, or (int) Math.round(...) to round.`, node);
          if (x.t === "long") throw this.err(`${what} is an int, but this value is a long. Math.round(...) gives a long, so write (int) Math.round(...).`, node); break;
        case "boolean": if (x.t === "boolean") return x; break;
        case "char": if (x.t === "char") return x; break;
        case "String": if (x.t === "String" || x.t === "null") return x; break;
        case "Object": return x;
        default:
          if (x.t === "null") return x;
          if (x.t === "obj" && (x.v.__cls === t || x.v.__alias?.includes(t) || t.endsWith("." + x.v.__cls))) return x;
          if (x.t === "obj") throw this.err(`${what} is a ${t}, but the value is a ${x.v.__cls}.`, node);
      }
      throw this.err(`${what} is a ${t}, but the value is a ${prettyType(x.t)}${x.t === "String" && NUMERIC.has(t) ? ' (text in quotes). Remove the quotes for a number' : ""}.`, node);
    }
    needBool(x, node, where) {
      if (x.t === "boolean") return x.v;
      const assignHint = node?.k === "assign" && node.op === "=" ? " You used = (which stores a value). To compare, use == ." : "";
      throw this.err(`${where} needs a true/false (boolean) value, but this is ${x.t === "int" || x.t === "double" ? "a number" : "a " + prettyType(x.t)}.${assignHint}`, node);
    }

    /* ---- setup ---- */
    *init() {
      for (const f of this.p.fields) {
        this.checkTypeName(f.type, f);
        if (this.cls.vars.has(f.name)) throw this.err(`There are two variables called ${f.name} in the class.`, f);
        const val = f.init ? this.coerce(yield* this.initValue(f.init, f.type, this.cls), f.type, f, f.name) : defaultFor(normType(f.type));
        this.cls.vars.set(f.name, { type: f.type === "var" ? val.t : normType(f.type), v: val, final: f.isFinal, line: f.line });
      }
    }
    *initValue(init, type, sc) {
      if (init.k === "arrlit") return yield* this.arrayFrom(init, type, sc);
      return yield* this.ev(init, sc);
    }
    *arrayFrom(lit, type, sc) {
      if (!type.endsWith("[]")) throw this.err(`{ } lists can only be stored in an array, like ${type}[] values = {...};`, lit);
      const elem = type.slice(0, -2), items = [];
      for (const it of lit.items) items.push(this.coerce(it.k === "arrlit" ? yield* this.arrayFrom(it, elem, sc) : yield* this.ev(it, sc), elem, it, "Each item"));
      return V({ elem: normType(elem), items }, "array");
    }
    hasMethod(name, n) { return (this.p.methods.get(name) || []).some((m) => n == null || m.params.length === n); }

    /** Runs a user method by name and returns its value (a generator; use yield*). */
    *call(name, args, node) {
      const list = this.p.methods.get(name);
      if (!list) {
        const b = this.host.builtins?.[name];
        if (b) { const r = b(args, node?.line ?? this.curLine, this); return r && typeof r.next === "function" ? yield* r : r ?? VOID; }
        const opts = [...this.p.methods.keys(), ...Object.keys(this.host.builtins || {})];
        throw this.err(`There's no method called ${name}.${didYouMean(name, opts)}`, node);
      }
      const m = list.find((x) => x.params.length === args.length);
      if (!m) { const n = list[0].params.length; throw this.err(`${name} needs ${n} value${n === 1 ? "" : "s"} in the ( ), but got ${args.length}.`, node); }
      if (++this.depth > 300) { this.depth = 0; throw this.err(`StackOverflowError: ${name} keeps calling itself and never stops.`, node); }
      this.stack.push(name);
      const sc = new Scope(this.cls, true);
      m.params.forEach((p, i) => { this.checkTypeName(p.type, m); sc.vars.set(p.name, { type: normType(p.type), v: this.coerce(args[i], p.type, node, `The parameter ${p.name} of ${name}`) }); });
      yield TICK;
      const r = yield* this.exec(m.body, sc);
      this.depth--; this.stack.pop();
      const rt = normType(m.ret);
      if (rt === "void") { if (r && r.ret && r.ret.t !== "void") throw this.err(`${name} is void, so it can't return a value.`, r.node); return VOID; }
      if (!r || !r.ret) throw this.err(`${name} must return a ${rt}, but it can reach the end without a return statement.`, { line: m.body.line });
      if (r.ret.t === "void") throw this.err(`${name} must return a ${rt}. Add a value after return.`, r.node);
      return this.coerce(r.ret, rt, r.node, `${name}'s return value`);
    }

    /* ---- statements ---- */
    *exec(s, sc) {
      if (s.line) { this.curLine = s.line; this.curScope = sc; this.host.onLine?.(s.line); }
      if (s.k !== "block" && s.k !== "empty") yield { stmt: s.line };
      switch (s.k) {
        case "block": { const inner = new Scope(sc); for (const st of s.body) { const r = yield* this.exec(st, inner); if (r) return r; } return null; }
        case "empty": return null;
        case "decl": return yield* this.declare(s, sc);
        case "decls": for (const d of s.decls) yield* this.declare(d, sc); return null;
        case "expr": yield* this.ev(s.e, sc); return null;
        case "if": { if (this.needBool(yield* this.ev(s.c, sc), s.c, "An if")) return yield* this.exec(s.a, new Scope(sc)); return s.b ? yield* this.exec(s.b, new Scope(sc)) : null; }
        case "while":
          while (this.needBool(yield* this.ev(s.c, sc), s.c, "A while loop")) {
            yield TICK;
            const r = yield* this.exec(s.body, new Scope(sc));
            if (r === BREAK) break; if (r === CONTINUE) continue; if (r) return r;
          }
          return null;
        case "dowhile":
          do {
            yield TICK;
            const r = yield* this.exec(s.body, new Scope(sc));
            if (r === BREAK) break; if (r === CONTINUE) continue; if (r) return r;
          } while (this.needBool(yield* this.ev(s.c, sc), s.c, "A do-while loop"));
          return null;
        case "for": {
          const fs = new Scope(sc);
          for (const i of s.init) yield* (i.k === "decl" ? this.declare(i, fs) : this.exec(i, fs));
          while (!s.c || this.needBool(yield* this.ev(s.c, fs), s.c, "A for loop")) {
            yield TICK;
            const r = yield* this.exec(s.body, new Scope(fs));
            if (r === BREAK) break; if (r && r !== CONTINUE) return r;
            for (const u of s.upd) yield* this.ev(u, fs);
          }
          return null;
        }
        case "foreach": {
          const arr = yield* this.ev(s.arr, sc);
          if (arr.t !== "array") throw this.err("A for (item : list) loop needs an array after the colon.", s.arr);
          for (const it of [...arr.v.items]) {
            yield TICK;
            const fs = new Scope(sc); fs.vars.set(s.name, { type: normType(s.type), v: this.coerce(it, s.type, s, s.name) });
            const r = yield* this.exec(s.body, fs);
            if (r === BREAK) break; if (r && r !== CONTINUE) return r;
          }
          return null;
        }
        case "return": return { ret: s.e ? yield* this.ev(s.e, sc) : VOID, node: s };
        case "break": return BREAK;
        case "continue": return CONTINUE;
      }
      throw this.err("This statement isn't supported.", s);
    }
    *declare(d, sc) {
      this.checkTypeName(d.type, d);
      if (sc.findLocal(d.name)) throw this.err(`A variable called ${d.name} already exists here. Use a different name, or drop the type to change the existing one: ${d.name} = ...;`, d);
      let val = null;
      if (d.init) val = this.coerce(yield* this.initValue(d.init, d.type, sc), d.type, d.init, d.name);
      else if (d.type === "var") throw this.err("var needs a starting value, like var x = 5;", d);
      sc.vars.set(d.name, { type: d.type === "var" ? val.t : normType(d.type), v: val, line: d.line });
      return null;
    }

    /* ---- expressions ---- */
    lookup(name, sc, node) {
      const local = sc.find(name);
      if (local) { if (!local.v) throw this.err(`${name} doesn't have a value yet. Give it one when you create it, like double ${name} = 0;`, node); return local.v; }
      if (name in this.globals) return this.globals[name];
      const opts = [...sc.names(), ...Object.keys(this.globals)];
      const s = suggest(name, opts);
      throw this.err(`Java can't find a variable called ${name}.${s ? ` Did you mean ${s}?` : " Make sure it's spelled the same everywhere and was created before this line."}`, node);
    }
    *ev(e, sc) {
      switch (e.k) {
        case "lit": return V(e.v, e.t);
        case "name": return this.lookup(e.name, sc, e);
        case "this": return V({ __cls: "this", __this: true }, "obj");
        case "member": return yield* this.member(e, sc);
        case "index": { const [arr, i] = yield* this.indexOf(e, sc); return arr.v.items[i]; }
        case "call": return yield* this.callExpr(e, sc);
        case "unary": {
          const x = yield* this.ev(e.e, sc);
          if (e.op === "!") return V(!this.needBool(x, e.e, "The ! (not) operator"), "boolean");
          if (!NUMERIC.has(x.t)) throw this.err(`${e.op} only works on numbers, not on a ${prettyType(x.t)}.`, e);
          const t = x.t === "char" ? "int" : x.t; return V(e.op === "-" ? (t === "int" ? toInt32(-numOf(x)) : -numOf(x)) : numOf(x), t);
        }
        case "bin": return this.binop(e.op, yield* this.ev(e.l, sc), yield* this.ev(e.r, sc), e);
        case "logic": {
          const l = this.needBool(yield* this.ev(e.l, sc), e.l, `The ${e.op} operator`);
          if (e.op === "&&" ? !l : l) return V(l, "boolean");
          return V(this.needBool(yield* this.ev(e.r, sc), e.r, `The ${e.op} operator`), "boolean");
        }
        case "cond": {
          const c = this.needBool(yield* this.ev(e.c, sc), e.c, "The ? : operator");
          const a = c ? yield* this.ev(e.a, sc) : yield* this.ev(e.b, sc);
          return a;
        }
        case "cast": {
          const x = yield* this.ev(e.e, sc), t = normType(e.type);
          if (t === "String") { if (x.t === "String" || x.t === "null") return x; throw this.err("Use String.valueOf(x) or \"\" + x to turn a value into text.", e); }
          if (t === "boolean") { if (x.t === "boolean") return x; throw this.err("Numbers can't be cast to boolean in Java. Compare instead, like x != 0.", e); }
          if (!NUMERIC.has(x.t)) throw this.err(`A ${prettyType(x.t)} can't be cast to ${t}.`, e);
          const n = numOf(x);
          if (t === "int") return V(Number.isFinite(n) ? toInt32(Math.trunc(n)) : Number.isNaN(n) ? 0 : n > 0 ? 2147483647 : -2147483648, "int");
          if (t === "long") return V(Number.isFinite(n) ? Math.trunc(n) : 0, "long");
          if (t === "char") return V(String.fromCharCode(n), "char");
          return V(n, "double");
        }
        case "assign": return yield* this.assign(e, sc);
        case "update": {
          const cur = yield* this.ev(e.target, sc);
          if (!NUMERIC.has(cur.t)) throw this.err(`${e.op} only works on number variables.`, e);
          const nv = V(cur.t === "int" ? toInt32(cur.v + (e.op === "++" ? 1 : -1)) : cur.v + (e.op === "++" ? 1 : -1), cur.t);
          yield* this.store(e.target, nv, sc, e, true);
          return e.prefix ? nv : cur;
        }
        case "new": {
          const n = e.type;
          if (n === "String") { const a = []; for (const x of e.args) a.push(yield* this.ev(x, sc)); return V(a.length ? toStr(a[0]) : "", "String"); }
          if (!this.host.construct) throw this.err(`new ${n}(...) isn't available here.`, e);
          const a = []; for (const x of e.args) a.push(yield* this.ev(x, sc));
          const r = this.host.construct(n, a, e.line, this);
          if (!r) throw this.err(`The Code Lab can't create a ${n}.${didYouMean(n, this.host.constructible || [])}`, e);
          return r;
        }
        case "newarr": {
          const elem = e.type.slice(0, -2);
          this.checkTypeName(elem, e);
          if (e.init) return yield* this.arrayFrom(e.init, e.type, sc);
          const size = yield* this.ev(e.size, sc);
          if (!isIntish(size.t)) throw this.err("An array size must be a whole number (int).", e.size);
          if (size.v < 0) throw this.err(`NegativeArraySizeException: an array can't have ${size.v} items.`, e.size);
          if (size.v > 100000) throw this.err("That array is too big for the Code Lab (over 100,000 items).", e.size);
          return V({ elem: normType(elem), items: Array.from({ length: size.v }, () => defaultFor(normType(elem))) }, "array");
        }
      }
      throw this.err("This expression isn't supported.", e);
    }
    *indexOf(e, sc) {
      const arr = yield* this.ev(e.obj, sc);
      if (arr.t === "null") throw this.err("NullPointerException: this array is null (it was never created).", e);
      if (arr.t !== "array") throw this.err(`[ ] only works on arrays, not on a ${prettyType(arr.t)}.`, e);
      const i = yield* this.ev(e.idx, sc);
      if (!isIntish(i.t)) throw this.err(`An array index must be a whole number, but this is a ${prettyType(i.t)}. Use (int) if needed.`, e.idx);
      const n = numOf(i);
      if (n < 0 || n >= arr.v.items.length) throw this.err(`ArrayIndexOutOfBoundsException: index ${n}, but this array has ${arr.v.items.length} item${arr.v.items.length === 1 ? "" : "s"} (index 0 to ${arr.v.items.length - 1}).`, e);
      return [arr, n];
    }
    *member(e, sc) {
      // Qualified names like DcMotor.Direction.REVERSE resolve through host objects
      const o = yield* this.ev(e.obj, sc);
      if (o.t === "array") { if (e.name === "length") return V(o.v.items.length, "int"); throw this.err(`Arrays only have .length (no ( )), not .${e.name}.`, e); }
      if (o.t === "String" && e.name === "length") throw this.err("For text (Strings), length is a method: write .length() with parentheses.", e);
      if (o.t === "null") throw this.err(`NullPointerException: can't read .${e.name} because the value is null.`, e);
      if (o.t !== "obj") throw this.err(`A ${prettyType(o.t)} doesn't have a field called ${e.name}.`, e);
      if (o.v.__this) return this.lookup(e.name, this.cls, e);
      const f = o.v.__f;
      if (f && e.name in f) { const r = f[e.name]; return typeof r === "function" ? r() : r; }
      if (o.v.__m && e.name in o.v.__m) throw this.err(`${e.name} is a method, so it needs parentheses: ${e.name}(...).`, e);
      throw this.err(`${o.v.__cls} doesn't have anything called ${e.name}.${didYouMean(e.name, [...Object.keys(f || {}), ...Object.keys(o.v.__m || {})])}`, e);
    }
    *callExpr(e, sc) {
      const args = [];
      if (!e.obj) {
        for (const a of e.args) args.push(yield* this.ev(a, sc));
        return yield* this.call(e.name, args, e);
      }
      const o = yield* this.ev(e.obj, sc);
      for (const a of e.args) args.push(yield* this.ev(a, sc));
      if (o.t === "String") {
        const fn = STRING_METHODS[e.name];
        if (!fn) throw this.err(`Text (String) doesn't have a method called ${e.name}.${didYouMean(e.name, Object.keys(STRING_METHODS))}`, e);
        return fn(o.v, args, e.line);
      }
      if (o.t === "null") throw this.err(`NullPointerException: can't call ${e.name}() because the value is null. Was the variable given a value (for example with hardwareMap.get)?`, e);
      if (o.t !== "obj") throw this.err(`A ${prettyType(o.t)} doesn't have methods like ${e.name}().`, e);
      if (o.v.__this) return yield* this.call(e.name, args, e);
      const fn = o.v.__m?.[e.name];
      if (!fn) {
        const opts = [...Object.keys(o.v.__m || {}), ...Object.keys(o.v.__f || {})];
        if (o.v.__f && e.name in o.v.__f) throw this.err(`${e.name} is a value, not a method. Remove the ( ).`, e);
        throw this.err(`${o.v.__cls} doesn't have a method called ${e.name}.${didYouMean(e.name, opts)}`, e);
      }
      const r = fn(args, e.line, e.name, this);
      return r && typeof r.next === "function" ? yield* r : r ?? VOID;
    }
    binop(op, a, b, e) {
      if (op === "+" && (a.t === "String" || b.t === "String")) return V(toStr(a) + toStr(b), "String");
      if (op === "==" || op === "!=") {
        let eq;
        if (NUMERIC.has(a.t) && NUMERIC.has(b.t)) eq = numOf(a) === numOf(b);
        else if (a.t === "boolean" && b.t === "boolean") eq = a.v === b.v;
        else if (a.t === "String" && b.t === "String") eq = a.v === b.v;
        else if (a.t === "null" || b.t === "null") eq = a.v === b.v;
        else if (a.t === "obj" && b.t === "obj") eq = a.v === b.v;
        else throw this.err(`Can't compare a ${prettyType(a.t)} with a ${prettyType(b.t)} using ${op}.`, e);
        return V(op === "==" ? eq : !eq, "boolean");
      }
      if (!NUMERIC.has(a.t) || !NUMERIC.has(b.t)) {
        const bad = NUMERIC.has(a.t) ? b : a;
        throw this.err(`${op} needs numbers on both sides, but one side is ${bad.t === "boolean" ? "a true/false value" : "a " + prettyType(bad.t)}.${op === "+" ? "" : ""}`, e);
      }
      const x = numOf(a), y = numOf(b);
      if (["<", ">", "<=", ">="].includes(op)) return V(op === "<" ? x < y : op === ">" ? x > y : op === "<=" ? x <= y : x >= y, "boolean");
      const t = a.t === "double" || b.t === "double" ? "double" : a.t === "long" || b.t === "long" ? "long" : "int";
      if (t === "double") return V(op === "+" ? x + y : op === "-" ? x - y : op === "*" ? x * y : op === "/" ? x / y : x % y, "double");
      if ((op === "/" || op === "%") && y === 0) throw this.err("ArithmeticException: / by zero. Whole numbers (ints) can't be divided by zero.", e);
      let r = op === "+" ? x + y : op === "-" ? x - y : op === "*" ? (t === "int" ? Math.imul(x, y) : x * y) : op === "/" ? Math.trunc(x / y) : x % y;
      if (t === "int") r = toInt32(r);
      return V(r, t);
    }
    *assign(e, sc) {
      let val = yield* this.ev(e.value, sc);
      if (e.op !== "=") {
        const cur = yield* this.ev(e.target, sc);
        const res = this.binop(e.op[0], cur, val, e);
        // compound assignment casts back to the variable's type (Java: x += 0.5 on an int compiles)
        val = cur.t === "String" ? res : cur.t === "int" ? V(toInt32(Math.trunc(numOf(res))), "int") : cur.t === "long" ? V(Math.trunc(numOf(res)), "long") : res.t === "boolean" ? res : V(numOf(res), cur.t);
        return yield* this.store(e.target, val, sc, e, true);
      }
      return yield* this.store(e.target, val, sc, e, false);
    }
    *store(target, val, sc, e, already) {
      if (target.k === "name") {
        const slot = sc.find(target.name);
        if (!slot) {
          if (target.name in this.globals) throw this.err(`${target.name} is part of the robot and can't be replaced.`, target);
          throw this.err(`Java can't find a variable called ${target.name}.${didYouMean(target.name, sc.names())} To create a new one, put its type first: double ${target.name} = ...;`, target);
        }
        if (slot.final && slot.v) throw this.err(`${target.name} is final (a constant), so it can't be changed.`, target);
        slot.v = already && slot.type === val.t ? val : this.coerce(val, slot.type, e, target.name);
        return slot.v;
      }
      if (target.k === "index") {
        const [arr, i] = yield* this.indexOf(target, sc);
        arr.v.items[i] = this.coerce(val, arr.v.elem, e, "This array item");
        return arr.v.items[i];
      }
      if (target.k === "member") {
        const o = yield* this.ev(target.obj, sc);
        if (o.t === "obj" && o.v.__this) return yield* this.store({ k: "name", name: target.name, line: target.line }, val, this.cls, e, already);
        if (o.t === "obj" && o.v.__set && target.name in (o.v.__f || {})) { o.v.__set(target.name, val); return val; }
        throw this.err(`${target.name} can't be changed directly.`, target);
      }
      throw this.err("This can't be assigned to.", target);
    }
  }

  /* ------------------------------------------------------------------ Running */
  /**
   * Runs a generator to completion synchronously (for drills and tests).
   * Throws if the code tries to wait (sleep) or runs too long.
   */
  function runSync(gen, maxSteps = 500000) {
    let steps = 0, r = gen.next();
    while (!r.done) {
      if (r.value && r.value.wait != null) throw new CodeError("sleep() doesn't belong in this exercise. Just compute and return the answer.", r.value.line || 0);
      if (++steps > maxSteps) throw new CodeError("Your code ran for too long. Is there a loop that never ends?", gen.__interp?.curLine || 0);
      r = gen.next();
    }
    return r.value;
  }

  /** Compiles source. Returns { program } or throws CodeError. */
  function compile(src) { return parse(src); }

  /** Calls one method of a compiled program with JS values; returns the Java value. */
  function callMethod(program, name, args, host = {}, maxSteps) {
    const it = new Interp(program, host);
    const gen = (function* () { yield* it.init(); return yield* it.call(name, args, null); })();
    gen.__interp = it;
    return runSync(gen, maxSteps);
  }

  const api = { CodeError, lex, parse, compile, Interp, V, VOID, TICK, toStr, fmtDouble, jformat, runSync, callMethod, suggest, hostObj, PRIMS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MiniJava = api;
})(typeof window !== "undefined" ? window : globalThis);
