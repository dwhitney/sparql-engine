/* file : graph-executor.ts
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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var stage_builder_1 = require("./stage-builder");
var pipeline_1 = require("../pipeline/pipeline");
var utils_1 = require("../../utils");
/**
 * A GraphStageBuilder evaluates GRAPH clauses in a SPARQL query.
 * @author Thomas Minier
 */
var GraphStageBuilder = /** @class */ (function (_super) {
    __extends(GraphStageBuilder, _super);
    function GraphStageBuilder() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Build a {@link PipelineStage} to evaluate a GRAPH clause
     * @param  source  - Input {@link PipelineStage}
     * @param  node    - Graph clause
     * @param  options - Execution options
     * @return A {@link PipelineStage} used to evaluate a GRAPH clause
     */
    GraphStageBuilder.prototype.execute = function (source, node, context) {
        var _this = this;
        var subquery;
        if (node.patterns[0].type === 'query') {
            subquery = node.patterns[0];
        }
        else {
            subquery = {
                prefixes: context.getProperty('prefixes'),
                queryType: 'SELECT',
                variables: ['*'],
                type: 'query',
                where: node.patterns
            };
        }
        var engine = pipeline_1.Pipeline.getInstance();
        // handle the case where the GRAPh IRI is a SPARQL variable
        if (utils_1.rdf.isVariable(node.name) && context.namedGraphs.length > 0) {
            // clone the source first
            source = engine.clone(source);
            // execute the subquery using each graph, and bound the graph var to the graph iri
            var iterators = context.namedGraphs.map(function (iri) {
                return engine.map(_this._buildIterator(source, iri, subquery, context), function (b) {
                    return b.extendMany([[node.name, iri]]);
                });
            });
            return engine.merge.apply(engine, __spread(iterators));
        }
        // otherwise, execute the subquery using the Graph
        return this._buildIterator(source, node.name, subquery, context);
    };
    /**
     * Returns a {@link PipelineStage} used to evaluate a GRAPH clause
     * @param  source    - Input {@link PipelineStage}
     * @param  iri       - IRI of the GRAPH clause
     * @param  subquery  - Subquery to be evaluated
     * @param  options   - Execution options
     * @return A {@link PipelineStage} used to evaluate a GRAPH clause
     */
    GraphStageBuilder.prototype._buildIterator = function (source, iri, subquery, context) {
        var opts = context.clone();
        opts.defaultGraphs = [iri];
        return this._builder._buildQueryPlan(subquery, opts, source);
    };
    return GraphStageBuilder;
}(stage_builder_1.default));
exports.default = GraphStageBuilder;
