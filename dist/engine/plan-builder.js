/* file : plan-builder.ts
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
// General libraries
var sparqljs_1 = require("sparqljs");
// pipelining engine
var pipeline_1 = require("../engine/pipeline/pipeline");
var bindings_1 = require("../rdf/bindings");
// Optimization
var optimizer_1 = require("../optimizer/optimizer");
// Solution modifiers
var ask_1 = require("../operators/modifiers/ask");
var construct_1 = require("../operators/modifiers/construct");
var select_1 = require("../operators/modifiers/select");
var aggregate_stage_builder_1 = require("./stages/aggregate-stage-builder");
var bgp_stage_builder_1 = require("./stages/bgp-stage-builder");
var bind_stage_builder_1 = require("./stages/bind-stage-builder");
var distinct_stage_builder_1 = require("./stages/distinct-stage-builder");
var filter_stage_builder_1 = require("./stages/filter-stage-builder");
var glushkov_stage_builder_1 = require("./stages/glushkov-executor/glushkov-stage-builder");
var graph_stage_builder_1 = require("./stages/graph-stage-builder");
var minus_stage_builder_1 = require("./stages/minus-stage-builder");
var service_stage_builder_1 = require("./stages/service-stage-builder");
var optional_stage_builder_1 = require("./stages/optional-stage-builder");
var orderby_stage_builder_1 = require("./stages/orderby-stage-builder");
var union_stage_builder_1 = require("./stages/union-stage-builder");
var update_stage_builder_1 = require("./stages/update-stage-builder");
// utilities
var lodash_1 = require("lodash");
var execution_context_1 = require("./context/execution-context");
var rewritings_1 = require("./stages/rewritings");
var utils_1 = require("../utils");
var QUERY_MODIFIERS = {
    SELECT: select_1.default,
    CONSTRUCT: construct_1.default,
    ASK: ask_1.default
};
/*
 * Class of SPARQL operations that are evaluated by a Stage Builder
 */
var SPARQL_OPERATION;
(function (SPARQL_OPERATION) {
    SPARQL_OPERATION[SPARQL_OPERATION["AGGREGATE"] = 0] = "AGGREGATE";
    SPARQL_OPERATION[SPARQL_OPERATION["BGP"] = 1] = "BGP";
    SPARQL_OPERATION[SPARQL_OPERATION["BIND"] = 2] = "BIND";
    SPARQL_OPERATION[SPARQL_OPERATION["DISTINCT"] = 3] = "DISTINCT";
    SPARQL_OPERATION[SPARQL_OPERATION["FILTER"] = 4] = "FILTER";
    SPARQL_OPERATION[SPARQL_OPERATION["GRAPH"] = 5] = "GRAPH";
    SPARQL_OPERATION[SPARQL_OPERATION["MINUS"] = 6] = "MINUS";
    SPARQL_OPERATION[SPARQL_OPERATION["OPTIONAL"] = 7] = "OPTIONAL";
    SPARQL_OPERATION[SPARQL_OPERATION["ORDER_BY"] = 8] = "ORDER_BY";
    SPARQL_OPERATION[SPARQL_OPERATION["PROPERTY_PATH"] = 9] = "PROPERTY_PATH";
    SPARQL_OPERATION[SPARQL_OPERATION["SERVICE"] = 10] = "SERVICE";
    SPARQL_OPERATION[SPARQL_OPERATION["UPDATE"] = 11] = "UPDATE";
    SPARQL_OPERATION[SPARQL_OPERATION["UNION"] = 12] = "UNION";
})(SPARQL_OPERATION = exports.SPARQL_OPERATION || (exports.SPARQL_OPERATION = {}));
/**
 * A PlanBuilder builds a physical query execution plan of a SPARQL query,
 * i.e., an iterator that can be consumed to get query results.
 * Internally, it implements a Builder design pattern, where various {@link StageBuilder} are used
 * for building each part of the query execution plan.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
var PlanBuilder = /** @class */ (function () {
    /**
     * Constructor
     * @param dataset - RDF Dataset used for query execution
     * @param prefixes - Optional prefixes to use during query processing
     */
    function PlanBuilder(dataset, prefixes, customFunctions) {
        if (prefixes === void 0) { prefixes = {}; }
        this._dataset = dataset;
        this._parser = new sparqljs_1.Parser(prefixes);
        this._optimizer = optimizer_1.default.getDefault();
        this._customFunctions = customFunctions;
        this._stageBuilders = new Map();
        // add default stage builders
        this.use(SPARQL_OPERATION.AGGREGATE, new aggregate_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.BGP, new bgp_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.BIND, new bind_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.DISTINCT, new distinct_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.FILTER, new filter_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.GRAPH, new graph_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.MINUS, new minus_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.SERVICE, new service_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.OPTIONAL, new optional_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.ORDER_BY, new orderby_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.PROPERTY_PATH, new glushkov_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.UNION, new union_stage_builder_1.default(this._dataset));
        this.use(SPARQL_OPERATION.UPDATE, new update_stage_builder_1.default(this._dataset));
    }
    Object.defineProperty(PlanBuilder.prototype, "optimizer", {
        /**
         * Set a new {@link Optimizer} uszed to optimize logical SPARQL query execution plans
         * @param  opt - New optimizer to use
         */
        set: function (opt) {
            this._optimizer = opt;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Register a Stage Builder to evaluate a class of SPARQL operations
     * @param  kind         - Class of SPARQL operations handled by the Stage Builder
     * @param  stageBuilder - New Stage Builder
     */
    PlanBuilder.prototype.use = function (kind, stageBuilder) {
        // complete handshake
        stageBuilder.builder = null;
        stageBuilder.builder = this;
        this._stageBuilders.set(kind, stageBuilder);
    };
    /**
     * Build the physical query execution of a SPARQL 1.1 query
     * and returns a {@link PipelineStage} or a {@link Consumable} that can be consumed to evaluate the query.
     * @param  query    - SPARQL query to evaluated
     * @param  options  - Execution options
     * @return A {@link PipelineStage} or a {@link Consumable} that can be consumed to evaluate the query.
     */
    PlanBuilder.prototype.build = function (query, context) {
        // If needed, parse the string query into a logical query execution plan
        if (typeof query === 'string') {
            query = this._parser.parse(query);
        }
        if (lodash_1.isNull(context) || lodash_1.isUndefined(context)) {
            context = new execution_context_1.default();
        }
        // Optimize the logical query execution plan
        query = this._optimizer.optimize(query);
        // build physical query execution plan, depending on the query type
        switch (query.type) {
            case 'query':
                return this._buildQueryPlan(query, context);
            case 'update':
                if (!this._stageBuilders.has(SPARQL_OPERATION.UPDATE)) {
                    throw new Error('A PlanBuilder cannot evaluate SPARQL UPDATE queries without a StageBuilder for it');
                }
                return this._stageBuilders.get(SPARQL_OPERATION.UPDATE).execute(query.updates, context);
            default:
                throw new SyntaxError("Unsupported SPARQL query type: " + query.type);
        }
    };
    /**
     * Build the physical query execution of a SPARQL query
     * @param  query    - Parsed SPARQL query
     * @param  options  - Execution options
     * @param  source   - Input {@link PipelineStage}
     * @return A {@link PipelineStage} that can be consumed to evaluate the query.
     */
    PlanBuilder.prototype._buildQueryPlan = function (query, context, source) {
        var _this = this;
        var engine = pipeline_1.Pipeline.getInstance();
        if (lodash_1.isNull(source) || lodash_1.isUndefined(source)) {
            // build pipeline starting iterator
            source = engine.of(new bindings_1.BindingBase());
        }
        context.setProperty('prefixes', query.prefixes);
        var aggregates = [];
        // rewrite a DESCRIBE query into a CONSTRUCT query
        if (query.queryType === 'DESCRIBE') {
            var template_1 = [];
            var where_1 = [{
                    type: 'bgp',
                    triples: []
                }];
            query.variables.forEach(function (v) {
                var triple = utils_1.rdf.triple(v, "?pred__describe__" + v, "?obj__describe__" + v);
                template_1.push(triple);
                where_1[0].triples.push(triple);
            });
            var construct_2 = {
                prefixes: query.prefixes,
                from: query.from,
                queryType: 'CONSTRUCT',
                template: template_1,
                type: 'query',
                where: query.where.concat(where_1)
            };
            return this._buildQueryPlan(construct_2, context, source);
        }
        // Handles FROM clauses
        if (query.from) {
            context.defaultGraphs = query.from.default;
            context.namedGraphs = query.from.named;
        }
        // Handles WHERE clause
        var graphIterator;
        if (query.where != null && query.where.length > 0) {
            graphIterator = this._buildWhere(source, query.where, context);
        }
        else {
            graphIterator = engine.of(new bindings_1.BindingBase());
        }
        // Parse query variable to separate projection & aggregate variables
        if ('variables' in query) {
            var parts = lodash_1.partition(query.variables, function (v) { return lodash_1.isString(v); });
            aggregates = parts[1];
            // add aggregates variables to projection variables
            query.variables = parts[0].concat(aggregates.map(function (agg) { return agg.variable; }));
        }
        // Handles SPARQL aggregations
        if ('group' in query || aggregates.length > 0) {
            // Handles GROUP BY
            graphIterator = this._stageBuilders.get(SPARQL_OPERATION.AGGREGATE).execute(graphIterator, query, context, this._customFunctions);
        }
        if (aggregates.length > 0) {
            // Handles SPARQL aggregation functions
            graphIterator = aggregates.reduce(function (prev, agg) {
                var op = _this._stageBuilders.get(SPARQL_OPERATION.BIND).execute(prev, agg, _this._customFunctions, context);
                return op;
            }, graphIterator);
        }
        // Handles ORDER BY
        if ('order' in query) {
            if (!this._stageBuilders.has(SPARQL_OPERATION.ORDER_BY)) {
                new Error('A PlanBuilder cannot evaluate SPARQL ORDER BY clauses without a StageBuilder for it');
            }
            graphIterator = this._stageBuilders.get(SPARQL_OPERATION.ORDER_BY).execute(graphIterator, query.order);
        }
        if (!(query.queryType in QUERY_MODIFIERS)) {
            throw new Error("Unsupported SPARQL query type: " + query.queryType);
        }
        graphIterator = QUERY_MODIFIERS[query.queryType](graphIterator, query, context);
        // Create iterators for modifiers
        if (query.distinct) {
            if (!this._stageBuilders.has(SPARQL_OPERATION.DISTINCT)) {
                new Error('A PlanBuilder cannot evaluate a DISTINCT clause without a StageBuilder for it');
            }
            graphIterator = this._stageBuilders.get(SPARQL_OPERATION.DISTINCT).execute(graphIterator, context);
        }
        // Add offsets and limits if requested
        if ('offset' in query) {
            graphIterator = engine.skip(graphIterator, query.offset);
        }
        if ('limit' in query) {
            graphIterator = engine.limit(graphIterator, query.limit);
        }
        // graphIterator.queryType = query.queryType
        return graphIterator;
    };
    /**
     * Optimize a WHERE clause and build the corresponding physical plan
     * @param  source  - Input {@link PipelineStage}
     * @param  groups   - WHERE clause to process
     * @param  options  - Execution options
     * @return A {@link PipelineStage} used to evaluate the WHERE clause
     */
    PlanBuilder.prototype._buildWhere = function (source, groups, context) {
        var _this = this;
        groups = lodash_1.sortBy(groups, function (g) {
            switch (g.type) {
                case 'bgp':
                    return 0;
                case 'values':
                    return 2;
                case 'filter':
                    return 3;
                default:
                    return 0;
            }
        });
        // Handle VALUES clauses using query rewriting
        if (lodash_1.some(groups, function (g) { return g.type === 'values'; })) {
            return this._buildValues(source, groups, context);
        }
        // merge BGPs on the same level
        var newGroups = [];
        var prec = null;
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            if (group.type === 'bgp' && prec != null && prec.type === 'bgp') {
                var lastGroup = newGroups[newGroups.length - 1];
                lastGroup.triples = lastGroup.triples.concat(group.triples);
            }
            else {
                newGroups.push(group);
            }
            prec = groups[i];
        }
        groups = newGroups;
        return groups.reduce(function (source, group) {
            return _this._buildGroup(source, group, context);
        }, source);
    };
    /**
     * Build a physical plan for a SPARQL group clause
     * @param  source  - Input {@link PipelineStage}
     * @param  group   - SPARQL Group
     * @param  options - Execution options
     * @return A {@link PipelineStage} used to evaluate the SPARQL Group
     */
    PlanBuilder.prototype._buildGroup = function (source, group, context) {
        var engine = pipeline_1.Pipeline.getInstance();
        // Reset flags on the options for child iterators
        var childContext = context.clone();
        switch (group.type) {
            case 'bgp':
                if (!this._stageBuilders.has(SPARQL_OPERATION.BGP)) {
                    throw new Error('A PlanBuilder cannot evaluate a Basic Graph Pattern without a Stage Builder for it');
                }
                // find possible Property paths
                var _a = __read(rewritings_1.extractPropertyPaths(group), 3), classicTriples = _a[0], pathTriples = _a[1], tempVariables_1 = _a[2];
                if (pathTriples.length > 0) {
                    if (!this._stageBuilders.has(SPARQL_OPERATION.PROPERTY_PATH)) {
                        throw new Error('A PlanBuilder cannot evaluate property paths without a Stage Builder for it');
                    }
                    source = this._stageBuilders.get(SPARQL_OPERATION.PROPERTY_PATH).execute(source, pathTriples, context);
                }
                // delegate remaining BGP evaluation to the dedicated executor
                var iter = this._stageBuilders.get(SPARQL_OPERATION.BGP).execute(source, classicTriples, childContext);
                // filter out variables added by the rewriting of property paths
                if (tempVariables_1.length > 0) {
                    iter = engine.map(iter, function (bindings) {
                        return bindings.filter(function (v) { return tempVariables_1.indexOf(v) == -1; });
                    });
                }
                return iter;
            case 'query':
                return this._buildQueryPlan(group, childContext, source);
            case 'graph':
                if (!this._stageBuilders.has(SPARQL_OPERATION.GRAPH)) {
                    throw new Error('A PlanBuilder cannot evaluate a GRAPH clause without a Stage Builder for it');
                }
                // delegate GRAPH evaluation to an executor
                return this._stageBuilders.get(SPARQL_OPERATION.GRAPH).execute(source, group, childContext);
            case 'service':
                if (!this._stageBuilders.has(SPARQL_OPERATION.SERVICE)) {
                    throw new Error('A PlanBuilder cannot evaluate a SERVICE clause without a Stage Builder for it');
                }
                return this._stageBuilders.get(SPARQL_OPERATION.SERVICE).execute(source, group, childContext);
            case 'group':
                return this._buildWhere(source, group.patterns, childContext);
            case 'optional':
                if (!this._stageBuilders.has(SPARQL_OPERATION.OPTIONAL)) {
                    throw new Error('A PlanBuilder cannot evaluate an OPTIONAL clause without a Stage Builder for it');
                }
                return this._stageBuilders.get(SPARQL_OPERATION.OPTIONAL).execute(source, group, childContext);
            case 'union':
                if (!this._stageBuilders.has(SPARQL_OPERATION.UNION)) {
                    throw new Error('A PlanBuilder cannot evaluate an UNION clause without a Stage Builder for it');
                }
                return this._stageBuilders.get(SPARQL_OPERATION.UNION).execute(source, group, childContext);
            case 'minus':
                if (!this._stageBuilders.has(SPARQL_OPERATION.MINUS)) {
                    throw new Error('A PlanBuilder cannot evaluate a MINUS clause without a Stage Builder for it');
                }
                return this._stageBuilders.get(SPARQL_OPERATION.MINUS).execute(source, group, childContext);
            case 'filter':
                if (!this._stageBuilders.has(SPARQL_OPERATION.FILTER)) {
                    throw new Error('A PlanBuilder cannot evaluate a FILTER clause without a Stage Builder for it');
                }
                return this._stageBuilders.get(SPARQL_OPERATION.FILTER).execute(source, group, this._customFunctions, childContext);
            case 'bind':
                if (!this._stageBuilders.has(SPARQL_OPERATION.BIND)) {
                    throw new Error('A PlanBuilder cannot evaluate a BIND clause without a Stage Builder for it');
                }
                return this._stageBuilders.get(SPARQL_OPERATION.BIND).execute(source, group, this._customFunctions, childContext);
            default:
                throw new Error("Unsupported SPARQL group pattern found in query: " + group.type);
        }
    };
    /**
     * Build a {@link PipelineStage} which evaluates a SPARQL query with VALUES clause(s).
     * It rely on a query rewritiing approach:
     * ?s ?p ?o . VALUES ?s { :1 :2 } becomes {:1 ?p ?o BIND(:1 AS ?s)} UNION {:2 ?p ?o BIND(:2 AS ?s)}
     * @param source  - Input {@link PipelineStage}
     * @param groups  - Query body, i.e., WHERE clause
     * @param options - Execution options
     * @return A {@link PipelineStage} which evaluates a SPARQL query with VALUES clause(s)
     */
    PlanBuilder.prototype._buildValues = function (source, groups, context) {
        var _a;
        var _this = this;
        var _b = __read(lodash_1.partition(groups, function (g) { return g.type === 'values'; }), 2), values = _b[0], others = _b[1];
        var bindingsLists = values.map(function (g) { return g.values; });
        // for each VALUES clause
        var iterators = bindingsLists.map(function (bList) {
            var _a;
            // for each value to bind in the VALUES clause
            var unionBranches = bList.map(function (b) {
                var bindings = bindings_1.BindingBase.fromObject(b);
                // BIND each group with the set of bindings and then evaluates it
                var temp = others.map(function (g) { return utils_1.deepApplyBindings(g, bindings); });
                return utils_1.extendByBindings(_this._buildWhere(source, temp, context), bindings);
            });
            return (_a = pipeline_1.Pipeline.getInstance()).merge.apply(_a, __spread(unionBranches));
        });
        // Users may use more than one VALUES clause
        if (iterators.length > 1) {
            return (_a = pipeline_1.Pipeline.getInstance()).merge.apply(_a, __spread(iterators));
        }
        return iterators[0];
    };
    return PlanBuilder;
}());
exports.PlanBuilder = PlanBuilder;
