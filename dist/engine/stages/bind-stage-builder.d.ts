import StageBuilder from './stage-builder';
import { Algebra } from 'sparqljs';
import { PipelineStage } from '../pipeline/pipeline-engine';
import { Bindings } from '../../rdf/bindings';
import { terms } from '../../rdf-terms';
import ExecutionContext from '../context/execution-context';
export declare type CustomFunctions = {
    [key: string]: (...args: (terms.RDFTerm | terms.RDFTerm[] | null)[]) => terms.RDFTerm;
};
/**
 * A BindStageBuilder evaluates BIND clauses
 * @author Thomas Minier
 */
export default class BindStageBuilder extends StageBuilder {
    execute(source: PipelineStage<Bindings>, bindNode: Algebra.BindNode, customFunctions: CustomFunctions, context: ExecutionContext): PipelineStage<Bindings>;
}
