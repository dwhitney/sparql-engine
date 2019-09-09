/* file : bgp-stage-builder.ts
MIT License

Copyright (c) 2018 Thomas Minier

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
'use strict';
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
Object.defineProperty(exports, "__esModule", { value: true });
var stage_builder_1 = require("./stage-builder");
var pipeline_1 = require("../pipeline/pipeline");
// import { GRAPH_CAPABILITY } from '../../rdf/graph_capability'
var query_hints_1 = require("../context/query-hints");
var utils_1 = require("../../utils");
// import boundJoin from '../../operators/join/bound-join'
/**
 * Basic {@link PipelineStage} used to evaluate Basic graph patterns using the "evalBGP" method
 * available
 * @private
 */
function bgpEvaluation(source, bgp, graph, context) {
    var engine = pipeline_1.Pipeline.getInstance();
    return engine.mergeMap(source, function (bindings) {
        var boundedBGP = bgp.map(function (t) { return bindings.bound(t); });
        // const hasVars = boundedBGP.map(p => some(p, v => v!.startsWith('?')))
        //   .reduce((acc, v) => acc && v, true)
        return engine.map(graph.evalBGP(boundedBGP, context), function (item) {
            // if (item.size === 0 && hasVars) return null
            return item.union(bindings);
        });
    });
}
/**
 * A BGPStageBuilder evaluates Basic Graph Patterns in a SPARQL query.
 * Users can extend this class and overrides the "_buildIterator" method to customize BGP evaluation.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
var BGPStageBuilder = /** @class */ (function (_super) {
    __extends(BGPStageBuilder, _super);
    function BGPStageBuilder() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Return the RDF Graph to be used for BGP evaluation.
     * * If `iris` is empty, returns the default graph
     * * If `iris` has a single entry, returns the corresponding named graph
     * * Otherwise, returns an UnionGraph based on the provided iris
     * @param  iris - List of Graph's iris
     * @return An RDF Graph
     */
    BGPStageBuilder.prototype._getGraph = function (iris) {
        if (iris.length === 0) {
            return this.dataset.getDefaultGraph();
        }
        else if (iris.length === 1) {
            return this.dataset.getNamedGraph(iris[0]);
        }
        return this.dataset.getUnionGraph(iris);
    };
    /**
     * Build a {@link PipelineStage} to evaluate a BGP
     * @param  source    - Input {@link PipelineStage}
     * @param  patterns  - Set of triple patterns
     * @param  options   - Execution options
     * @return A {@link PipelineStage} used to evaluate a Basic Graph pattern
     */
    BGPStageBuilder.prototype.execute = function (source, patterns, context) {
        var _this = this;
        // avoids sending a request with an empty array
        if (patterns.length == 0)
            return source;
        // extract eventual query hints from the BGP & merge them into the context
        var extraction = query_hints_1.parseHints(patterns, context.hints);
        context.hints = extraction[1];
        // rewrite a BGP to remove blank node addedd by the Turtle notation
        var _a = __read(this._replaceBlankNodes(extraction[0]), 2), bgp = _a[0], artificals = _a[1];
        // if the graph is a variable, go through each binding and look for its value
        if (context.defaultGraphs.length > 0 && utils_1.rdf.isVariable(context.defaultGraphs[0])) {
            var engine_1 = pipeline_1.Pipeline.getInstance();
            return engine_1.mergeMap(source, function (value) {
                var iri = value.get(context.defaultGraphs[0]);
                //if the graph doesn't exist in the dataset, then create one with the createGraph factrory
                var graphs = _this.dataset.getAllGraphs().filter(function (g) { return g.iri === iri; });
                var graph = (graphs.length > 0) ? graphs[0] : (iri !== null) ? _this.dataset.createGraph(iri) : null;
                if (graph) {
                    var iterator_1 = _this._buildIterator(engine_1.from([value]), graph, bgp, context);
                    if (artificals.length > 0) {
                        iterator_1 = engine_1.map(iterator_1, function (b) { return b.filter(function (variable) { return artificals.indexOf(variable) < 0; }); });
                    }
                    return iterator_1;
                }
                throw "Cant' find or create the graph " + iri;
            });
        }
        // select the graph to use for BGP evaluation
        var graph = (context.defaultGraphs.length > 0) ? this._getGraph(context.defaultGraphs) : this.dataset.getDefaultGraph();
        var iterator = this._buildIterator(source, graph, bgp, context);
        if (artificals.length > 0) {
            iterator = pipeline_1.Pipeline.getInstance().map(iterator, function (b) { return b.filter(function (variable) { return artificals.indexOf(variable) < 0; }); });
        }
        return iterator;
    };
    /**
     * Replace the blank nodes in a BGP by SPARQL variables
     * @param patterns - BGP to rewrite, i.e., a set of triple patterns
     * @return A Tuple [Rewritten BGP, List of SPARQL variable added]
     */
    BGPStageBuilder.prototype._replaceBlankNodes = function (patterns) {
        var newVariables = [];
        function rewrite(term) {
            var res = term;
            if (term.startsWith('_:')) {
                res = '?' + term.slice(2);
                if (newVariables.indexOf(res) < 0) {
                    newVariables.push(res);
                }
            }
            return res;
        }
        var newBGP = patterns.map(function (p) {
            return {
                subject: rewrite(p.subject),
                predicate: rewrite(p.predicate),
                object: rewrite(p.object)
            };
        });
        return [newBGP, newVariables];
    };
    /**
     * Returns a {@link PipelineStage} used to evaluate a Basic Graph pattern
     * @param  source         - Input {@link PipelineStage}
     * @param  graph          - The graph on which the BGP should be executed
     * @param  patterns       - Set of triple patterns
     * @param  options        - Execution options
     * @param  isJoinIdentity - True if the source iterator is the starting iterator of the pipeline
     * @return A {@link PipelineStage} used to evaluate a Basic Graph pattern
     */
    BGPStageBuilder.prototype._buildIterator = function (source, graph, patterns, context) {
        // if (graph._isCapable(GRAPH_CAPABILITY.UNION)) {
        //   return boundJoin(source, patterns, graph, context)
        // }
        return bgpEvaluation(source, patterns, graph, context);
    };
    return BGPStageBuilder;
}(stage_builder_1.default));
exports.default = BGPStageBuilder;
