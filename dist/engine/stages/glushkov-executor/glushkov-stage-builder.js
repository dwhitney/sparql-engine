"use strict";
/* file : glushkov-stage-builder.ts
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
Object.defineProperty(exports, "__esModule", { value: true });
var path_stage_builder_1 = require("../path-stage-builder");
var automatonBuilder_1 = require("./automatonBuilder");
var utils_1 = require("../../../utils");
var pipeline_1 = require("../../../engine/pipeline/pipeline");
/**
 * A Step in the evaluation of a property path
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
var Step = /** @class */ (function () {
    /**
     * Constructor
     * @param node - The label of a node in the RDF Graph
     * @param state - The ID of a State in the Automaton
     */
    function Step(node, state) {
        this._node = node;
        this._state = state;
    }
    Object.defineProperty(Step.prototype, "state", {
        /**
         * Get the Automaton's state associated with this Step of the ResultPath
         * @return The Automaton's state associated with this Step
         */
        get: function () {
            return this._state;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Step.prototype, "node", {
        /**
         * Get the RDF Graph's node associated with this Step of the ResultPath
         * @return The RDF Graph's node associated with this Step
         */
        get: function () {
            return this._node;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Test if the given Step is equal to this Step
     * @param step - Step tested
     * @return True if the Steps are equal, False otherwise
     */
    Step.prototype.equals = function (step) {
        return this.node === step.node && this.state == step.state;
    };
    /**
     * Build a clone of this Step
     * @return A copy of this Step
     */
    Step.prototype.clone = function () {
        var copy = new Step(this._node, this._state);
        return copy;
    };
    return Step;
}());
/**
 * A solution path, found during the evaluation of a property path
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
var ResultPath = /** @class */ (function () {
    /**
     * Constructor
     */
    function ResultPath() {
        this._steps = new Array();
    }
    /**
     * Add a Step to the ResultPath
     * @param step - New Step to add
     */
    ResultPath.prototype.add = function (step) {
        this._steps.push(step);
    };
    /**
     * Return the last Step of the ResultPath
     * @return The last Step of the ResultPath
     */
    ResultPath.prototype.lastStep = function () {
        return this._steps[this._steps.length - 1];
    };
    /**
     * Return the first Step of the ResultPath
     * @return The first Step of the ResultPath
     */
    ResultPath.prototype.firstStep = function () {
        return this._steps[0];
    };
    /**
     * Test if a Step is already contained in the ResultPath
     * @param step - Step we're looking for in the ResultPath
     * @return True if the given Step is in the ResultPath, False otherwise
     */
    ResultPath.prototype.contains = function (step) {
        return this._steps.findIndex(function (value) {
            return value.equals(step);
        }) > -1;
    };
    /**
     * Build a clone of this ResultPath
     * @return A copy of this ResultPath
     */
    ResultPath.prototype.clone = function () {
        var copy = new ResultPath();
        this._steps.forEach(function (step) {
            copy.add(step);
        });
        return copy;
    };
    return ResultPath;
}());
/**
 * A GlushkovStageBuilder is responsible for evaluation a SPARQL property path query using a Glushkov state automata.
 * @author Arthur Trottier
 * @author Charlotte Cogan
 * @author Julien Aimonier-Davat
 */
var GlushkovStageBuilder = /** @class */ (function (_super) {
    __extends(GlushkovStageBuilder, _super);
    /**
     * Constructor
     * @param dataset - RDF Dataset used during query execution
     */
    function GlushkovStageBuilder(dataset) {
        return _super.call(this, dataset) || this;
    }
    /**
     * Continues the execution of the SPARQL property path and builds the result's paths
     * @param rPath - Path being processed
     * @param obj - Path object
     * @param graph - RDF graph
     * @param context - Execution context
     * @param automaton - Automaton used to evaluate the SPARQL property path
     * @param forward - if True the walk proceeds through outgoing edges, otherwise the walk proceeds in reverse direction
     * @return An Observable which yield RDF triples matching the property path
     */
    GlushkovStageBuilder.prototype.evaluatePropertyPath = function (rPath, obj, graph, context, automaton, forward) {
        var engine = pipeline_1.Pipeline.getInstance();
        var self = this;
        var lastStep = rPath.lastStep();
        var result = engine.empty();
        if (forward) {
            if (automaton.isFinal(lastStep.state) && (utils_1.rdf.isVariable(obj) ? true : lastStep.node === obj)) {
                var subject = rPath.firstStep().node;
                var object = rPath.lastStep().node;
                result = engine.of({ subject: subject, predicate: "", object: object });
            }
        }
        else {
            if (automaton.isInitial(lastStep.state)) {
                var subject = rPath.lastStep().node;
                var object = rPath.firstStep().node;
                result = engine.of({ subject: subject, predicate: "", object: object });
            }
        }
        var transitions;
        if (forward) {
            transitions = automaton.getTransitionsFrom(lastStep.state);
        }
        else {
            transitions = automaton.getTransitionsTo(lastStep.state);
        }
        var obs = transitions.map(function (transition) {
            var reverse = (forward && transition.reverse) || (!forward && !transition.reverse);
            var bgp = [{
                    subject: reverse ? '?o' : lastStep.node,
                    predicate: transition.negation ? '?p' : transition.predicates[0],
                    object: reverse ? lastStep.node : '?o'
                }];
            return engine.mergeMap(engine.from(graph.evalBGP(bgp, context)), function (binding) {
                var p = binding.get('?p');
                var o = binding.get('?o');
                if (p != null ? !transition.hasPredicate(p) : true) {
                    var newStep = void 0;
                    if (forward) {
                        newStep = new Step(o, transition.to.name);
                    }
                    else {
                        newStep = new Step(o, transition.from.name);
                    }
                    if (!rPath.contains(newStep)) {
                        var newPath = rPath.clone();
                        newPath.add(newStep);
                        return self.evaluatePropertyPath(newPath, obj, graph, context, automaton, forward);
                    }
                }
                return engine.empty();
            });
        });
        return engine.merge.apply(engine, __spread(obs, [result]));
    };
    /**
     * Execute a reflexive closure against a RDF Graph.
     * @param subject - Path subject
     * @param obj - Path object
     * @param graph - RDF graph
     * @param context - Execution context
     * @return An Observable which yield RDF triples retrieved after the evaluation of the reflexive closure
     */
    GlushkovStageBuilder.prototype.reflexiveClosure = function (subject, obj, graph, context) {
        var engine = pipeline_1.Pipeline.getInstance();
        if (utils_1.rdf.isVariable(subject) && !utils_1.rdf.isVariable(obj)) {
            var result = { subject: obj, predicate: "", object: obj };
            return engine.of(result);
        }
        else if (!utils_1.rdf.isVariable(subject) && utils_1.rdf.isVariable(obj)) {
            var result = { subject: subject, predicate: "", object: subject };
            return engine.of(result);
        }
        else if (utils_1.rdf.isVariable(subject) && utils_1.rdf.isVariable(obj)) {
            var bgp = [{ subject: '?s', predicate: '?p', object: '?o' }];
            return engine.distinct(engine.mergeMap(engine.from(graph.evalBGP(bgp, context)), function (binding) {
                var s = binding.get('?s');
                var o = binding.get('?o');
                var t1 = { subject: s, predicate: "", object: s };
                var t2 = { subject: o, predicate: "", object: o };
                return engine.of(t1, t2);
            }), function (triple) { return triple.subject; });
        }
        if (subject === obj) {
            var result = { subject: subject, predicate: "", object: obj };
            return engine.of(result);
        }
        return engine.empty();
    };
    /**
     * Starts the execution of a property path against a RDF Graph.
     * - executes the reflexive closure if the path expression contains the empty word
     * - builds the first step of the result's paths
     * @param subject - Path subject
     * @param obj - Path object
     * @param graph - RDF graph
     * @param context - Execution context
     * @param automaton - Automaton used to evaluate the SPARQL property path
     * @param forward - if True the walk starts from the subject, otherwise the walk starts from the object
     * @return An Observable which yield RDF triples matching the property path
     */
    GlushkovStageBuilder.prototype.startPropertyPathEvaluation = function (subject, obj, graph, context, automaton, forward) {
        var engine = pipeline_1.Pipeline.getInstance();
        var self = this;
        var reflexiveClosureResults = automaton.isFinal(0) ? this.reflexiveClosure(subject, obj, graph, context) : engine.empty();
        var transitions;
        if (forward) {
            transitions = automaton.getTransitionsFrom(0);
        }
        else {
            transitions = automaton.getTransitionsToFinalStates();
        }
        var obs = transitions.map(function (transition) {
            var reverse = (forward && transition.reverse) || (!forward && !transition.reverse);
            var bgp = [{
                    subject: reverse ? '?o' : subject,
                    predicate: transition.negation ? '?p' : transition.predicates[0],
                    object: reverse ? subject : '?o'
                }];
            return engine.mergeMap(engine.from(graph.evalBGP(bgp, context)), function (binding) {
                var s = (utils_1.rdf.isVariable(subject) ? binding.get(subject) : subject);
                var p = binding.get('?p');
                var o = binding.get('?o');
                if (p != null ? !transition.hasPredicate(p) : true) {
                    var path = new ResultPath();
                    if (forward) {
                        path.add(new Step(s, transition.from.name));
                        path.add(new Step(o, transition.to.name));
                    }
                    else {
                        path.add(new Step(s, transition.to.name));
                        path.add(new Step(o, transition.from.name));
                    }
                    return self.evaluatePropertyPath(path, obj, graph, context, automaton, forward);
                }
                return engine.empty();
            });
        });
        return engine.merge.apply(engine, __spread(obs, [reflexiveClosureResults]));
    };
    /**
     * Execute a property path against a RDF Graph.
     * @param  subject - Path subject
     * @param  path  - Property path
     * @param  obj   - Path object
     * @param  graph - RDF graph
     * @param  context - Execution context
     * @return An Observable which yield RDF triples matching the property path
     */
    GlushkovStageBuilder.prototype._executePropertyPath = function (subject, path, obj, graph, context) {
        var automaton = new automatonBuilder_1.GlushkovBuilder(path).build();
        if (utils_1.rdf.isVariable(subject) && !utils_1.rdf.isVariable(obj)) {
            return this.startPropertyPathEvaluation(obj, subject, graph, context, automaton, false);
        }
        else {
            return this.startPropertyPathEvaluation(subject, obj, graph, context, automaton, true);
        }
    };
    return GlushkovStageBuilder;
}(path_stage_builder_1.default));
exports.default = GlushkovStageBuilder;
