import { PlanBuilder } from '../plan-builder';
import { PipelineStage } from '../pipeline/pipeline-engine';
import { Consumable } from '../../operators/update/consumer';
import Dataset from '../../rdf/dataset';
import { Bindings } from '../../rdf/bindings';
/**
 * A StageBuilder encapsulate a strategy for executing a class of SPARQL operations
 * @abstract
 * @author Thomas Minier
 */
export default abstract class StageBuilder {
    protected _dataset: Dataset;
    protected _builder: PlanBuilder | null;
    constructor(dataset: Dataset);
    builder: PlanBuilder | null;
    dataset: Dataset;
    abstract execute(...args: any[]): PipelineStage<Bindings> | Consumable;
}
