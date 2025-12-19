export type TicketStatus = 
    | "Draft" | "Submitted" | "PendingApproval" | "Approved" | "Rejected"
    | "InProgress" | "Resolved" | "Closed";

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

export interface ITicket {
    id: number;
    title: string;
    description: string;
    categoryId: number;
    categoryTitle?: string;

    priority: TicketPriority;
    status: TicketStatus;

    requesterId: number;
    requesterTitle?: string;
    requesterEmail?: string;

    approverId?: number;
    approverTitle?: string;
    approverEmail?: string;

    assignedToId?: number;
    assignedToTitle?: string;
    assignedToEmail?: string;

    slaHours?: number;
    dueDate?: string;
    resolutionDate?: string;
    
    lastApprovalOutcome?: "Approved" | "Rejected" | "Cancelled";
    ticketNumber?: string;
    
    created?: string;
    modified?: string;
}

export interface ITicketQuery {
    text?: string;
    status?: TicketStatus;
    categoryId?: number;
    priority?: TicketPriority;
    dateFrom?: string;
    dateTo?: string;

    orderBy?: "Created" | "Modified" | "DueDate";
    orderDir?: "asc" | "desc";

    page?: number;
    pageSize?: number;
}