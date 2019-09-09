import StageBuilder from './stage-builder';
import { PipelineStage } from '../pipeline/pipeline-engine';
import { Algebra } from 'sparqljs';
import Graph from '../../rdf/graph';
import { Bindings } from '../../rdf/bindings';
import ExecutionContext from '../context/execution-context';
/**
 * A BGPStageBuilder evaluates Basic Graph Patterns in a SPARQL query.
 * Users can extend this class and overrides the "_buildIterator" method to customize BGP evaluation.
 * @author Thomas Minier
 * @author Corentin Marionneau
 */
export default class BGPStageBuilder extends StageBuilder {
    /**
     * Return the RDF Graph to be used for BGP evaluation.
     * * If `iris` is empty, returns the default graph
     * * If `iris` has a single entry, returns the corresponding named graph
     * * Otherwise, returns an UnionGraph based on the provided iris
     * @param  iris - List of Graph's iris
     * @return An RDF Graph
     */
    _getGraph(iris: string[]): Graph;
    /**
     * Build a {@link PipelineStage} to evaluate a BGP
     * @param  source    - Input {@link PipelineStage}
     * @param  patterns  - Set of triple patterns
     * @param  options   - Execution options
     * @return A {@link PipelineStage} used to evaluate a Basic Graph pattern
     */
    execute(source: PipelineStage<Bindings>, patterns: Algebra.TripleObject[], context: ExecutionContext): PipelineStage<Bindings>;
    /**
     * Replace the blank nodes in a BGP by SPARQL variables
     * @param patterns - BGP to rewrite, i.e., a set of triple patterns
     * @return A Tuple [Rewritten BGP, List of SPARQL variable added]
     */
    _replaceBlankNodes(patterns: Algebra.TripleObject[]): [Algebra.TripleObject[], string[]];
    /**
     * Returns a {@link PipelineStage} used to evaluate a Basic Graph pattern
     * @param  source         - Input {@link PipelineStage}
     * @param  graph          - The graph on which the BGP should be executed
     * @param  patterns       - Set of triple patterns
     * @param  options        - Execution options
     * @param  isJoinIdentity - True if the source iterator is the starting iterator of the pipeline
     * @return A {@link PipelineStage} used to evaluate a Basic Graph pattern
     */
    _buildIterator(source: PipelineStage<Bindings>, graph: Graph, patterns: Algebra.TripleObject[], context: ExecutionContext): PipelineStage<Bindings>;
}
