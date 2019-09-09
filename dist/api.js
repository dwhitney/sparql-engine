/* file : api.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
var aggregate_stage_builder_1 = require("./engine/stages/aggregate-stage-builder");
var bgp_stage_builder_1 = require("./engine/stages/bgp-stage-builder");
var bind_stage_builder_1 = require("./engine/stages/bind-stage-builder");
var distinct_stage_builder_1 = require("./engine/stages/distinct-stage-builder");
var filter_stage_builder_1 = require("./engine/stages/filter-stage-builder");
var glushkov_stage_builder_1 = require("./engine/stages/glushkov-executor/glushkov-stage-builder");
var graph_stage_builder_1 = require("./engine/stages/graph-stage-builder");
var minus_stage_builder_1 = require("./engine/stages/minus-stage-builder");
var service_stage_builder_1 = require("./engine/stages/service-stage-builder");
var optional_stage_builder_1 = require("./engine/stages/optional-stage-builder");
var orderby_stage_builder_1 = require("./engine/stages/orderby-stage-builder");
var union_stage_builder_1 = require("./engine/stages/union-stage-builder");
var update_stage_builder_1 = require("./engine/stages/update-stage-builder");
var dataset_1 = require("./rdf/dataset");
exports.Dataset = dataset_1.default;
var bindings_1 = require("./rdf/bindings");
exports.BindingBase = bindings_1.BindingBase;
var hashmap_dataset_1 = require("./rdf/hashmap-dataset");
exports.HashMapDataset = hashmap_dataset_1.default;
var graph_1 = require("./rdf/graph");
exports.Graph = graph_1.default;
var execution_context_1 = require("./engine/context/execution-context");
exports.ExecutionContext = execution_context_1.default;
var plan_builder_1 = require("./engine/plan-builder");
exports.PlanBuilder = plan_builder_1.PlanBuilder;
var plan_builder_2 = require("./engine/plan-builder");
// pipeline
var pipeline_1 = require("./engine/pipeline/pipeline");
exports.Pipeline = pipeline_1.Pipeline;
var pipeline_engine_1 = require("./engine/pipeline/pipeline-engine");
exports.PipelineEngine = pipeline_engine_1.PipelineEngine;
var rxjs_pipeline_1 = require("./engine/pipeline/rxjs-pipeline");
exports.RxjsPipeline = rxjs_pipeline_1.default;
var vector_pipeline_1 = require("./engine/pipeline/vector-pipeline");
exports.VectorPipeline = vector_pipeline_1.default;
// RDF terms Utilities
var rdf_terms_1 = require("./rdf-terms");
exports.terms = rdf_terms_1.terms;
// stages builders
var stages = {
    SPARQL_OPERATION: plan_builder_2.SPARQL_OPERATION,
    AggregateStageBuilder: aggregate_stage_builder_1.default,
    BGPStageBuilder: bgp_stage_builder_1.default,
    BindStageBuilder: bind_stage_builder_1.default,
    DistinctStageBuilder: distinct_stage_builder_1.default,
    FilterStageBuilder: filter_stage_builder_1.default,
    GlushkovStageBuilder: glushkov_stage_builder_1.default,
    GraphStageBuilder: graph_stage_builder_1.default,
    MinusStageBuilder: minus_stage_builder_1.default,
    ServiceStageBuilder: service_stage_builder_1.default,
    OptionalStageBuilder: optional_stage_builder_1.default,
    OrderByStageBuilder: orderby_stage_builder_1.default,
    UnionStageBuilder: union_stage_builder_1.default,
    UpdateStageBuilder: update_stage_builder_1.default
};
exports.stages = stages;
