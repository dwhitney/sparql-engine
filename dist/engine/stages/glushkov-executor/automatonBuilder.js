"use strict";
/* file : automatonBuilder.ts
MIT License

Copyright (c) 2019 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var automaton_1 = require("./automaton");
/**
 * Perform the union of two sets
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 * @param setA - first set
 * @param setB - second set
 * @return The union of the two sets
 */
function union(setA, setB) {
    var union = new Set(setA);
    setB.forEach(function (value) {
        union.add(value);
    });
    return union;
}
exports.union = union;
/**
 * A GlushkovBuilder is responsible for build the automaton used to evaluate a SPARQL property path.
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
var GlushkovBuilder = /** @class */ (function () {
    /**
     * Constructor
     * @param path - Path object
     */
    function GlushkovBuilder(path) {
        this.syntaxTree = path;
        this.nullable = new Map();
        this.first = new Map();
        this.last = new Map();
        this.follow = new Map();
        this.predicates = new Map();
        this.reverse = new Map();
        this.negation = new Map();
    }
    /**
     * Numbers the nodes in a postorder manner
     * @param node - syntactic tree's current node
     * @param num  - first identifier to be assigned
     * @return root node identifier
     */
    GlushkovBuilder.prototype.postfixNumbering = function (node, num) {
        if (num === void 0) { num = 1; }
        if (node.pathType != "symbol") {
            for (var i = 0; i < node.items.length; i++) {
                if (node.items[i].pathType == undefined) { // it's a leaf
                    node.items[i] = {
                        pathType: "symbol",
                        item: node.items[i]
                    };
                }
                num = this.postfixNumbering(node.items[i], num);
            }
        }
        node.id = num++;
        if (node.pathType == "!") {
            num += 2; // to create the two nodes in the negation processing step
        }
        return num;
    };
    GlushkovBuilder.prototype.symbolProcessing = function (node) {
        this.nullable.set(node.id, false);
        this.first.set(node.id, new Set().add(node.id));
        this.last.set(node.id, new Set().add(node.id));
        this.follow.set(node.id, new Set());
        this.predicates.set(node.id, [node.item]);
        this.reverse.set(node.id, false);
        this.negation.set(node.id, false);
    };
    GlushkovBuilder.prototype.sequenceProcessing = function (node) {
        var index, nullable_child;
        var nullable_node = true;
        for (var i = 0; i < node.items.length; i++) {
            nullable_child = this.nullable.get(node.items[i].id);
            nullable_node = nullable_node && nullable_child;
        }
        this.nullable.set(node.id, nullable_node);
        var first_node = new Set();
        index = -1;
        do {
            index++;
            var first_child = this.first.get(node.items[index].id);
            first_node = union(first_node, first_child);
            nullable_child = this.nullable.get(node.items[index].id);
        } while (index < node.items.length - 1 && nullable_child);
        this.first.set(node.id, first_node);
        var last_node = new Set();
        index = node.items.length;
        do {
            index--;
            var last_child = this.last.get(node.items[index].id);
            last_node = union(last_node, last_child);
            nullable_child = this.nullable.get(node.items[index].id);
        } while (index > 0 && nullable_child);
        this.last.set(node.id, last_node);
        var self = this;
        var _loop_1 = function (i) {
            var last_child = this_1.last.get(node.items[i].id);
            last_child.forEach(function (value) {
                var suiv = i;
                var follow_childLast = self.follow.get(value);
                var nullable_nextChild = false;
                do {
                    suiv++;
                    var first_nextChild = self.first.get(node.items[suiv].id);
                    follow_childLast = union(follow_childLast, first_nextChild);
                    nullable_nextChild = self.nullable.get(node.items[suiv].id);
                } while (suiv < node.items.length - 1 && nullable_nextChild);
                self.follow.set(value, follow_childLast);
            });
        };
        var this_1 = this;
        for (var i = 0; i < node.items.length - 1; i++) {
            _loop_1(i);
        }
    };
    GlushkovBuilder.prototype.unionProcessing = function (node) {
        var nullable_node = false;
        for (var i = 1; i < node.items.length; i++) {
            var nullable_child = this.nullable.get(node.items[i].id);
            nullable_node = nullable_node || nullable_child;
        }
        this.nullable.set(node.id, nullable_node);
        var first_node = new Set();
        for (var i = 0; i < node.items.length; i++) {
            var first_child = this.first.get(node.items[i].id);
            first_node = union(first_node, first_child);
        }
        this.first.set(node.id, first_node);
        var last_node = new Set();
        for (var i = 0; i < node.items.length; i++) {
            var last_child = this.last.get(node.items[i].id);
            last_node = union(last_node, last_child);
        }
        this.last.set(node.id, last_node);
    };
    GlushkovBuilder.prototype.oneOrMoreProcessing = function (node) {
        var nullable_child = this.nullable.get(node.items[0].id);
        this.nullable.set(node.id, nullable_child);
        var first_child = this.first.get(node.items[0].id);
        this.first.set(node.id, first_child);
        var last_child = this.last.get(node.items[0].id);
        this.last.set(node.id, last_child);
        var self = this;
        last_child.forEach(function (value) {
            var follow_lastChild = self.follow.get(value);
            self.follow.set(value, union(follow_lastChild, first_child));
        });
    };
    GlushkovBuilder.prototype.zeroOrOneProcessing = function (node) {
        this.nullable.set(node.id, true);
        var first_child = this.first.get(node.items[0].id);
        this.first.set(node.id, first_child);
        var last_child = this.last.get(node.items[0].id);
        this.last.set(node.id, last_child);
    };
    GlushkovBuilder.prototype.zeroOrMoreProcessing = function (node) {
        this.nullable.set(node.id, true);
        var first_child = this.first.get(node.items[0].id);
        this.first.set(node.id, first_child);
        var last_child = this.last.get(node.items[0].id);
        this.last.set(node.id, last_child);
        var self = this;
        last_child.forEach(function (value) {
            var follow_lastChild = self.follow.get(value);
            self.follow.set(value, union(follow_lastChild, first_child));
        });
    };
    GlushkovBuilder.prototype.searchChild = function (node) {
        var _this = this;
        return node.items.reduce(function (acc, n) {
            if (n.pathType === "symbol") {
                acc.add(n.id);
            }
            else {
                acc = union(acc, _this.searchChild(n));
            }
            return acc;
        }, new Set());
    };
    GlushkovBuilder.prototype.negationProcessing = function (node) {
        var negForward = new Array();
        var negBackward = new Array();
        var self = this;
        this.searchChild(node).forEach(function (value) {
            var predicates_child = self.predicates.get(value);
            var isReverse_child = self.reverse.get(value);
            if (isReverse_child) {
                negBackward.push.apply(negBackward, __spread(predicates_child));
            }
            else {
                negForward.push.apply(negForward, __spread(predicates_child));
            }
        });
        var first_node = new Set();
        var last_node = new Set();
        if (negForward.length > 0) {
            var id = node.id + 1;
            this.nullable.set(id, false);
            this.first.set(id, new Set().add(id));
            this.last.set(id, new Set().add(id));
            this.follow.set(id, new Set());
            this.predicates.set(id, negForward);
            this.reverse.set(id, false);
            this.negation.set(id, true);
            first_node.add(id);
            last_node.add(id);
        }
        if (negBackward.length > 0) {
            var id = node.id + 2;
            this.nullable.set(id, false);
            this.first.set(id, new Set().add(id));
            this.last.set(id, new Set().add(id));
            this.follow.set(id, new Set());
            this.predicates.set(id, negBackward);
            this.reverse.set(id, true);
            this.negation.set(id, true);
            first_node.add(id);
            last_node.add(id);
        }
        this.nullable.set(node.id, false);
        this.first.set(node.id, first_node);
        this.last.set(node.id, last_node);
    };
    GlushkovBuilder.prototype.inverseProcessing = function (node) {
        var _this = this;
        var nullable_child = this.nullable.get(node.items[0].id);
        this.nullable.set(node.id, nullable_child);
        var first_child = this.first.get(node.items[0].id);
        this.last.set(node.id, first_child);
        var last_child = this.last.get(node.items[0].id);
        this.first.set(node.id, last_child);
        var child_inverse = this.searchChild(node);
        var follow_temp = new Map();
        child_inverse.forEach(function (nodeToReverse) {
            follow_temp.set(nodeToReverse, new Set());
        });
        child_inverse.forEach(function (nodeToReverse) {
            var isReverse_nodeToReverse = _this.reverse.get(nodeToReverse);
            _this.reverse.set(nodeToReverse, !isReverse_nodeToReverse);
            var followees_nodeToReverse = _this.follow.get(nodeToReverse);
            followees_nodeToReverse.forEach(function (followee) {
                if (child_inverse.has(followee)) {
                    follow_temp.get(followee).add(nodeToReverse);
                    followees_nodeToReverse.delete(followee);
                }
            });
        });
        child_inverse.forEach(function (child) {
            _this.follow.set(child, union(_this.follow.get(child), follow_temp.get(child)));
        });
    };
    GlushkovBuilder.prototype.nodeProcessing = function (node) {
        switch (node.pathType) {
            case "symbol":
                this.symbolProcessing(node);
                break;
            case "/":
                this.sequenceProcessing(node);
                break;
            case "|":
                this.unionProcessing(node);
                break;
            case "+":
                this.oneOrMoreProcessing(node);
                break;
            case "?":
                this.zeroOrOneProcessing(node);
                break;
            case "*":
                this.zeroOrMoreProcessing(node);
                break;
            case "!":
                this.negationProcessing(node);
                break;
            case "^":
                this.inverseProcessing(node);
                break;
        }
    };
    GlushkovBuilder.prototype.treeProcessing = function (node) {
        if (node.pathType !== "symbol") {
            for (var i = 0; i < node.items.length; i++) {
                this.treeProcessing(node.items[i]);
            }
        }
        this.nodeProcessing(node);
    };
    /**
     * Build a Glushkov automaton to evaluate the SPARQL property path
     * @return The Glushkov automaton used to evaluate the SPARQL property path
     */
    GlushkovBuilder.prototype.build = function () {
        var e_1, _a, e_2, _b;
        // Assigns an id to each syntax tree's node. These ids will be used to build and name the automaton's states
        this.postfixNumbering(this.syntaxTree);
        // computation of first, last, follow, nullable, reverse and negation
        this.treeProcessing(this.syntaxTree);
        var glushkov = new automaton_1.Automaton();
        var root = this.syntaxTree.id; // root node identifier
        var self = this;
        // Creates and adds the initial state
        var nullable_root = this.nullable.get(root);
        var initialState = new automaton_1.State(0, true, nullable_root);
        glushkov.addState(initialState);
        // Creates and adds the other states
        var last_root = this.last.get(root);
        try {
            for (var _c = __values(Array.from(this.predicates.keys())), _d = _c.next(); !_d.done; _d = _c.next()) {
                var id = _d.value;
                var isFinal = last_root.has(id);
                glushkov.addState(new automaton_1.State(id, false, isFinal));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // Adds the transitions that start from the initial state
        var first_root = this.first.get(root);
        first_root.forEach(function (value) {
            var toState = glushkov.findState(value);
            var reverse = self.reverse.get(value);
            var negation = self.negation.get(value);
            var predicates = self.predicates.get(value);
            var transition = new automaton_1.Transition(initialState, toState, reverse, negation, predicates);
            glushkov.addTransition(transition);
        });
        var _loop_2 = function (from) {
            var follow_from = this_2.follow.get(from);
            follow_from.forEach(function (to) {
                var fromState = glushkov.findState(from);
                var toState = glushkov.findState(to);
                var reverse = self.reverse.get(to);
                var negation = self.negation.get(to);
                var predicates = self.predicates.get(to);
                var transition = new automaton_1.Transition(fromState, toState, reverse, negation, predicates);
                glushkov.addTransition(transition);
            });
        };
        var this_2 = this;
        try {
            // Ads the transitions between states
            for (var _e = __values(Array.from(this.follow.keys())), _f = _e.next(); !_f.done; _f = _e.next()) {
                var from = _f.value;
                _loop_2(from);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return glushkov;
    };
    return GlushkovBuilder;
}());
exports.GlushkovBuilder = GlushkovBuilder;
