import { SPFI } from "@pnp/sp";
import "@pnp/sp/items";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { ITicket, ITicketQuery, TicketStatus, TicketPriority } from "../models/Ticket";
import { containsText } from "../utils/sharepoint";

type RawUser = { Id: number; Title?: string; EMail?: string };
type RawLookup = { Id: number; Title?: string };

type RawTicketItem = {
  Id: number;
  Title?: string;
  Description?: string;

  Priority?: TicketPriority;
  Status?: TicketStatus;

  RequesterId?: number;
  Requester?: RawUser;

  ApproverId?: number | null;
  Approver?: RawUser;

  AssignedToId?: number | null;
  AssignedTo?: RawUser;

  SLAHours?: number | null;
  DueDate?: string | null;
  ResolutionDate?: string | null;

  LastApprovalOutcome?: "Approved" | "Rejected" | "Cancelled" | null;
  TicketNumber?: string | null;

  Created?: string;
  Modified?: string;

  // Lookup CategoryId
  CategoryIdId?: number;
  CategoryId?: RawLookup;
};

const odataStr = (v: string) => v.replace(/'/g, "''");

export class TicketService{

    constructor(
        private readonly sp: SPFI,
        private readonly listTitle = "Tickets"
    ){}

    private list(){
        return this.sp.web.lists.getByTitle(this.listTitle);
    }

    private buildPayload(patch: Partial<ITicket>): Record<string, unknown> {
        const payload: Record<string, unknown> = {};

        if (patch.title !== undefined) payload.Title = patch.title;
        if (patch.description !== undefined) payload.Description = patch.description;

        if (patch.categoryId !== undefined) payload.CategoryId = patch.categoryId;
        if (patch.priority !== undefined) payload.Priority = patch.priority;
        if (patch.status !== undefined) payload.Status = patch.status;

        if (patch.requesterId !== undefined) payload.RequesterId = patch.requesterId;
        if (patch.approverId !== undefined) payload.ApproverId = patch.approverId ?? null;
        if (patch.assignedToId !== undefined) payload.AssignedToId = patch.assignedToId ?? null;

        if (patch.slaHours !== undefined) payload.SLAHours = patch.slaHours ?? null;
        if (patch.dueDate !== undefined) payload.DueDate = patch.dueDate ?? null;
        if (patch.resolutionDate !== undefined) payload.ResolutionDate = patch.resolutionDate ?? null;

        if (patch.lastApprovalOutcome !== undefined) payload.LastApprovalOutcome = patch.lastApprovalOutcome ?? null;
        if (patch.ticketNumber !== undefined) payload.TicketNumber = patch.ticketNumber ?? null;

        return payload;
    }

    public async createDraft(input: {
        title: string;
        description: string;
        categoryId: number;
        priority: TicketPriority;
        requesterId: number;

        approverId?: number;
        assignedToId?: number;

        slaHours?: number;
        dueDate?: string;
        ticketNumber?: string;
    }) : Promise<number>{
        try{
            const addResult = await this.list().items.add({
                Title: input.title,
                Description: input.description,
                CategoryId: input.categoryId,
                Priority: input.priority,
                Status: "Draft" satisfies TicketStatus,

                RequesterId: input.requesterId,
                ApproverId: input.approverId ?? null,
                AssignedToId: input.assignedToId ?? null,

                SLAHours: input.slaHours ?? null,
                DueDate: input.dueDate ?? null,
                TicketNumber: input.ticketNumber ?? null
            });

            return addResult.data.Id as number;
        }
        catch(err: any){
            throw new Error(`Error creando Draft: ${err?.message ?? err}`);
        }
    }

    public async submit(ticketId: number, patch?: Partial<ITicket>): Promise<void>{
        try{
            const payload = { ...this.buildPayload(patch ?? {}), Status: "Submitted" satisfies TicketStatus };
            await this.list().items.getById(ticketId).update(payload);
        }
        catch(err:any){
            throw new Error(`Error enviando Ticket ${ticketId}: ${err?.message ?? err}`);
        }
    }

    public async update(ticketId: number, patch: Partial<ITicket>) : Promise<void>{
        try{
            const payload = this.buildPayload(patch);
            await this.list().items.getById(ticketId).update(payload);
        }
        catch(err:any){
            throw new Error(`Error actualizando Ticket ${ticketId}: ${err?.message ?? err}`);
        }
    }

    public async remove(ticketId: number) : Promise<void>{
        try{
            await this.list().items.getById(ticketId).delete();
        }
        catch(err:any){
            throw new Error(`Error eliminando Ticket ${ticketId}: ${err?.message ?? err}`);
        }
    }

    public async getById(ticketId: number) : Promise<ITicket>{
        try{
            const item = (await this.list()
            .items.getById(ticketId)
            .select(
                "Id",
                "Title",
                "Description",
                "CategoryId/Id",
                "Priority",
                "Status",
                "Requester/Id",
                "Requester/Title",
                "Requester/EMail",
                "Approver/Id",
                "Approver/Title",
                "Approver/EMail",
                "AssignedTo/Id",
                "AssignedTo/Title",
                "AssignedTo/EMail",
                "SLAHours",
                "DueDate",
                "ResolutionDate",
                "LastApprovalOutcome",
                "TicketNumber",
                "Created",
                "Modified",
                "CategoryId/Title"
            )
            .expand("Requester", "Approver", "AssignedTo", "CategoryId")()) as RawTicketItem;

            return this.mapItem(item);
        }
        catch(err: any){
            throw new Error(`Error obteniendo Ticket ${ticketId}: ${err?.message ?? err}`);
        }
    }

    public async search(query: ITicketQuery): Promise<{ items: ITicket[]; total: number }>{
        try{
            const page = Math.max(1, query.page ?? 1);
            const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));

            const filters: string[] = [];

            if(query.status) filters.push(`Status eq '${odataStr(query.status)}'`);
            if (query.priority) filters.push(`Priority eq '${odataStr(query.priority)}'`);
            if (query.categoryId) filters.push(`CategoryId/Id eq ${query.categoryId}`);

            // rango de fechas (Created)
            if (query.dateFrom) filters.push(`Created ge datetime'${query.dateFrom}'`);
            if (query.dateTo) filters.push(`Created le datetime'${query.dateTo}'`);

            // búsqueda texto (Title/Description)
            // substringof puede no usar índice, usarlo con debounce y pageSize razonable.
            if (query.text && query.text.trim().length > 0) {
                const t = odataStr(query.text.trim());
                filters.push(`(${containsText("Title", t)} or ${containsText("Description", t)})`);
            }

            const filterOdata = filters.length ? filters.join(" and ") : undefined;

            const orderBy = query.orderBy ?? "Created";
            const orderAsc = (query.orderDir ?? "desc") === "asc";

            // Para paginación:
            // - Usa top(page*pageSize) y luego “slice” en memoria.
            // - Es consistente y simple.
            // - Si la lista crece mucho, migrar a skiptoken (más avanzado).
            const top = page * pageSize;

            let q = this.list().items
            .select(
                "Id",
                "Title",
                "Description",
                "CategoryId/Id",
                "Priority",
                "Status",
                "Requester/Id",
                "Requester/Title",
                "Requester/EMail",
                "Approver/Id",
                "Approver/Title",
                "Approver/EMail",
                "AssignedTo/Id",
                "AssignedTo/Title",
                "AssignedTo/EMail",
                "SLAHours",
                "DueDate",
                "ResolutionDate",
                "LastApprovalOutcome",
                "TicketNumber",
                "Created",
                "Modified",
                "CategoryId/Title"
            )
            .expand("Requester", "Approver", "AssignedTo", "CategoryId")
            .orderBy(orderBy, orderAsc)
            .top(top);

            if(filterOdata)
                q = q.filter(filterOdata);

            const results = (await q()) as RawTicketItem[];

            const mapped = results.map((i) => this.mapItem(i));

            const start = (page - 1) * pageSize;
            const items = mapped.slice(start, start + pageSize);

            // Total real:
            // SharePoint no devuelve total con la query normal.
            // Estrategia: conteo “ligero” con select Id y top(5000) (válido para muchos escenarios),
            // o usar un enfoque incremental / caching. Para portafolio, este approach es aceptable.
            const total = await this.countTickets(filterOdata);

            return { items, total };
        }
        catch(err: any){
            throw new Error(`Error buscando tickets: ${err?.message ?? err}`);
        }
    }

    private async countTickets(filterOdata?: string): Promise<number>{
        
        let q = this.list().items
        .select("Id")
        .top(5000);

        if(filterOdata)
            q = q.filter(filterOdata);

        const rows = await q();

        return rows.length;
    }

    private mapItem(i: RawTicketItem): ITicket {
    return {
      id: i.Id,
      title: i.Title ?? "",
      description: i.Description ?? "",

      categoryId: i.CategoryId?.Id ?? i.CategoryIdId ?? 0,
      categoryTitle: i.CategoryId?.Title,

      priority: i.Priority ?? "Low",
      status: i.Status ?? "Draft",

      requesterId: i.Requester?.Id ?? i.RequesterId ?? 0,
      requesterTitle: i.Requester?.Title,
      requesterEmail: i.Requester?.EMail,

      approverId: i.Approver?.Id ?? (i.ApproverId ?? undefined),
      approverTitle: i.Approver?.Title,
      approverEmail: i.Approver?.EMail,

      assignedToId: i.AssignedTo?.Id ?? (i.AssignedToId ?? undefined),
      assignedToTitle: i.AssignedTo?.Title,
      assignedToEmail: i.AssignedTo?.EMail,

      slaHours: i.SLAHours ?? undefined,
      dueDate: i.DueDate ?? undefined,
      resolutionDate: i.ResolutionDate ?? undefined,

      lastApprovalOutcome: i.LastApprovalOutcome ?? undefined,
      ticketNumber: i.TicketNumber ?? undefined,

      created: i.Created,
      modified: i.Modified
    };
  }
}