import { Algebra } from 'sparqljs';
import { Consumable } from '../operators/update/consumer';
import { PipelineStage } from '../engine/pipeline/pipeline-engine';
import { terms } from '../rdf-terms';
import { Bindings } from '../rdf/bindings';
import Dataset from '../rdf/dataset';
import Optimizer from '../optimizer/optimizer';
import StageBuilder from './stages/stage-builder';
import ExecutionContext from './context/execution-context';
/**
 * Output of a physical query execution plan
 */
export declare type QueryOutput = Bindings | Algebra.TripleObject | boolean;
/**
 * Type alias to describe the shape of custom functions. It's basically a JSON object from an IRI (in string form) to a function of 0 to many RDFTerms that produces an RDFTerm.
 */
export declare type CustomFunctions = {
    [key: string]: (...args: (terms.RDFTerm | terms.RDFTerm[] | null)[]) => terms.RDFTerm;
};
export declare enum SPARQL_OPERATION {
    AGGREGATE = 0,
    BGP = 1,
    BIND = 2,
    DISTINCT = 3,
    FILTER = 4,
    GRAPH = 5,
    MINUS = 6,
    OPTIONAL = 7,
    ORDER_BY = 8,
    PROPERTY_PATH = 9,
    SERVICE = 10,
    UPDATE = 11,
    UNION = 12
}
/**
 * A PlanBuilder builds a physical query execution plan of a SPARQL query,
 * i.e., an iterator that can be consumed to get query results.
 * Internally, it implements a Builder design pattern, where various {@link StageBuilder} are used
 * for building each part of the query execution plan.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export declare class PlanBuilder {
    private readonly _dataset;
    private readonly _parser;
    private _optimizer;
    private _stageBuilders;
    private _customFunctions;
    /**
     * Constructor
     * @param dataset - RDF Dataset used for query execution
     * @param prefixes - Optional prefixes to use during query processing
     */
    constructor(dataset: Dataset, prefixes?: any, customFunctions?: CustomFunctions);
    /**
     * Set a new {@link Optimizer} uszed to optimize logical SPARQL query execution plans
     * @param  opt - New optimizer to use
     */
    optimizer: Optimizer;
    /**
     * Register a Stage Builder to evaluate a class of SPARQL operations
     * @param  kind         - Class of SPARQL operations handled by the Stage Builder
     * @param  stageBuilder - New Stage Builder
     */
    use(kind: SPARQL_OPERATION, stageBuilder: StageBuilder): void;
    /**
     * Build the physical query execution of a SPARQL 1.1 query
     * and returns a {@link PipelineStage} or a {@link Consumable} that can be consumed to evaluate the query.
     * @param  query    - SPARQL query to evaluated
     * @param  options  - Execution options
     * @return A {@link PipelineStage} or a {@link Consumable} that can be consumed to evaluate the query.
     */
    build(query: any, context?: ExecutionContext): PipelineStage<QueryOutput> | Consumable;
    /**
     * Build the physical query execution of a SPARQL query
     * @param  query    - Parsed SPARQL query
     * @param  options  - Execution options
     * @param  source   - Input {@link PipelineStage}
     * @return A {@link PipelineStage} that can be consumed to evaluate the query.
     */
    _buildQueryPlan(query: Algebra.RootNode, context: ExecutionContext, source?: PipelineStage<Bindings>): PipelineStage<Bindings>;
    /**
     * Optimize a WHERE clause and build the corresponding physical plan
     * @param  source  - Input {@link PipelineStage}
     * @param  groups   - WHERE clause to process
     * @param  options  - Execution options
     * @return A {@link PipelineStage} used to evaluate the WHERE clause
     */
    _buildWhere(source: PipelineStage<Bindings>, groups: Algebra.PlanNode[], context: ExecutionContext): PipelineStage<Bindings>;
    /**
     * Build a physical plan for a SPARQL group clause
     * @param  source  - Input {@link PipelineStage}
     * @param  group   - SPARQL Group
     * @param  options - Execution options
     * @return A {@link PipelineStage} used to evaluate the SPARQL Group
     */
    _buildGroup(source: PipelineStage<Bindings>, group: Algebra.PlanNode, context: ExecutionContext): PipelineStage<Bindings>;
    /**
     * Build a {@link PipelineStage} which evaluates a SPARQL query with VALUES clause(s).
     * It rely on a query rewritiing approach:
     * ?s ?p ?o . VALUES ?s { :1 :2 } becomes {:1 ?p ?o BIND(:1 AS ?s)} UNION {:2 ?p ?o BIND(:2 AS ?s)}
     * @param source  - Input {@link PipelineStage}
     * @param groups  - Query body, i.e., WHERE clause
     * @param options - Execution options
     * @return A {@link PipelineStage} which evaluates a SPARQL query with VALUES clause(s)
     */
    _buildValues(source: PipelineStage<Bindings>, groups: Algebra.PlanNode[], context: ExecutionContext): PipelineStage<Bindings>;
}
