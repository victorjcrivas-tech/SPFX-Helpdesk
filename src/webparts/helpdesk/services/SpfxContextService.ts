import { WebPartContext } from "@microsoft/sp-webpart-base";
import { spfi, SPFI } from "@pnp/sp";
import { graphfi, GraphFI } from "@pnp/graph";
import { SPFx } from "@pnp/sp/presets/all";

export class SpfxContextService {
    public readonly sp: SPFI;
    public readonly graph: GraphFI;

    constructor(context: WebPartContext){
        this.sp = spfi().using(SPFx(context));
        this.graph = graphfi().using(SPFx(context));
    }
}