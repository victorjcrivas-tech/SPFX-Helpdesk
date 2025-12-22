import * as React from "react";
import {
    Stack,
    Text,
    SearchBox,
    Dropdown,
    IDropdownOption,
    DatePicker,
    DayOfWeek,
    CommandBar,
    ICommandBar,
    ICommandBarItemProps,
    MessageBar,
    MessageBarType,
    ShimmeredDetailsList,
    DetailsListLayoutMode,
    SelectionMode,
    IColumn,
    IconButton,
    Separator,
    Spinner,
    SpinnerSize,
    Icon,
    Dialog,
    DialogType,
    DialogFooter,
    PrimaryButton,
    DefaultButton,
    IContextualMenuProps,
    getTheme,
    IStyle
} from "@fluentui/react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { SpfxContextService } from "../services/SpfxContextService";
import { TicketService } from "../services/TicketService";
import { CategoryService } from "../services/CategoryService";
import { useDebounce } from "../hooks/useDebounce";

import { ITicket, ITicketQuery, TicketStatus, TicketPriority } from "../models/Ticket";

interface Props {
    spfx: SpfxContextService;
}

const theme = getTheme();

const dayPickerStrings = {
    months: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
    shortMonths: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    days: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    shortDays: ["D", "L", "M", "M", "J", "V", "S"],
    goToToday: "Hoy",
    prevMonthAriaLabel: "Mes anterior",
    nextMonthAriaLabel: "Mes siguiente",
    prevYearAriaLabel: "Año anterior",
    nextYearAriaLabel: "Año siguiente",
    closeButtonAriaLabel: "Cerrar"
};

function toISODateStart(d: Date): string {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    return x.toISOString();
}

function toISODateEnd(d: Date): string {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    return x.toISOString();
}

function tryParseDateISO(s: string | null): Date | null {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function clampInt(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

function softBadgeStyle(bg: string, fg: string) {
    return {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 10px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 600 as const,
        lineHeight: "18px",
        whiteSpace: "nowrap" as const
    };
}

function getStatusBadge(status: TicketStatus) {
    switch (status) {
        case "Draft":
            return softBadgeStyle(theme.palette.neutralLighter, theme.palette.neutralPrimary);
        case "Submitted":
        case "PendingApproval":
            return softBadgeStyle(theme.palette.neutralQuaternaryAlt, theme.palette.neutralPrimary);
        case "Approved":
        case "Resolved":
            return softBadgeStyle(theme.palette.greenLight, theme.palette.greenDark);
        case "Rejected":
            return softBadgeStyle(theme.palette.red, theme.palette.redDark);
        case "InProgress":
            return softBadgeStyle(theme.palette.themeLighter, theme.palette.themeDark);
        case "Closed":
            return softBadgeStyle(theme.palette.neutralLight, theme.palette.neutralPrimary);
        default:
            return softBadgeStyle(theme.palette.neutralLighter, theme.palette.neutralPrimary);
    }
}

function getStatusIcon(status: TicketStatus): string {
    switch (status) {
        case "Approved":
            return "CompletedSolid";
        case "Rejected":
            return "Blocked2Solid";
        case "InProgress":
            return "Sync";
        case "PendingApproval":
            return "Clock";
        case "Submitted":
            return "Send";
        case "Resolved":
            return "Completed";
        case "Closed":
            return "Lock";
        case "Draft":
            return "Edit";
        default:
            return "Info";
    }
}

function getPriorityBadge(priority: TicketPriority) {
    switch (priority) {
        case "Low":
            return softBadgeStyle(theme.palette.neutralLighter, theme.palette.neutralPrimary);
        case "Medium":
            return softBadgeStyle(theme.palette.neutralQuaternaryAlt, theme.palette.neutralPrimary);
        case "High":
            return softBadgeStyle(theme.palette.orangeLighter, theme.palette.orange);
        case "Urgent":
            return softBadgeStyle(theme.palette.red, theme.palette.redDark);
        default:
            return softBadgeStyle(theme.palette.neutralLighter, theme.palette.neutralPrimary);
    }
}

function getPriorityIcon(priority: TicketPriority): string {
    switch (priority) {
        case "Urgent":
            return "WarningSolid";
        case "High":
            return "Important";
        case "Medium":
            return "Info";
        case "Low":
            return "CircleRing";
        default:
            return "Info";
    }
}

function getDueState(dueISO?: string): "none" | "soon" | "overdue" {

    if (!dueISO)
        return "none";

    const due = new Date(dueISO);

    if (isNaN(due.getTime()))
        return "none";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
        return "overdue";

    if (diffDays <= 2)
        return "soon"; // hoy/mañana/pasado

    return "none";
}

const QS = {
    text: "q",
    status: "status",
    priority: "priority",
    categoryId: "cat",
    dateFrom: "from",
    dateTo: "to",
    orderBy: "ob",
    orderDir: "od",
    page: "p",
    pageSize: "ps"
} as const;

type SortDir = NonNullable<ITicketQuery["orderDir"]>;
type OrderBy = NonNullable<ITicketQuery["orderBy"]>;

const statusOptions: IDropdownOption[] = [
    { key: "", text: "Todos" },
    { key: "Draft", text: "Draft" },
    { key: "Submitted", text: "Submitted" },
    { key: "PendingApproval", text: "PendingApproval" },
    { key: "Approved", text: "Approved" },
    { key: "Rejected", text: "Rejected" },
    { key: "InProgress", text: "InProgress" },
    { key: "Resolved", text: "Resolved" },
    { key: "Closed", text: "Closed" },
];

const priorityOptions: IDropdownOption[] = [
    { key: "", text: "Todas" },
    { key: "Low", text: "Low" },
    { key: "Medium", text: "Medium" },
    { key: "High", text: "High" },
    { key: "Urgent", text: "Urgent" },
];

const pageSizeOptions: IDropdownOption[] = [
    { key: 10, text: "10" },
    { key: 20, text: "20" },
    { key: 50, text: "50" },
    { key: 100, text: "100" },
];

const sortableOrderBy: Record<string, OrderBy> = {
    created: "Created",
    modified: "Modified",
    duedate: "DueDate",
};

function normalizeOrderBy(v: string | null): OrderBy {
    if (v === "Created" || v === "Modified" || v === "DueDate") return v;
    return "Created";
}
function normalizeOrderDir(v: string | null): SortDir {
    return v === "asc" || v === "desc" ? v : "desc";
}
function normalizeStatus(v: string | null): TicketStatus | "" {
    const all: Array<TicketStatus> = ["Draft", "Submitted", "PendingApproval", "Approved", "Rejected", "InProgress", "Resolved", "Closed"];
    return v && (all as string[]).includes(v) ? (v as TicketStatus) : "";
}
function normalizePriority(v: string | null): TicketPriority | "" {
    const all: Array<TicketPriority> = ["Low", "Medium", "High", "Urgent"];
    return v && (all as string[]).includes(v) ? (v as TicketPriority) : "";
}
function normalizePage(v: string | null): number {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
}
function normalizePageSize(v: string | null): number {
    const allowed = new Set([10, 20, 50, 100]);
    const n = Number(v);
    if (!Number.isFinite(n)) return 20;
    const x = Math.floor(n);
    return allowed.has(x) ? x : 20;
}
function normalizeCategoryId(v: string | null): number | null {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n);
}
function setOrDelete(sp: URLSearchParams, key: string, value?: string | number | null) {
    if (value === undefined || value === null || value === "" || (typeof value === "number" && !Number.isFinite(value))) {
        sp.delete(key);
        return;
    }
    sp.set(key, String(value));
}

const TicketListPage = ({ spfx }: Props) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const ticketService = React.useMemo(() => new TicketService(spfx.sp), [spfx]);
    const categoryService = React.useMemo(() => new CategoryService(spfx.sp), [spfx]);

    // URL 
    const urlState = React.useMemo(() => {

        const text = searchParams.get(QS.text) ?? "";
        const status = normalizeStatus(searchParams.get(QS.status));
        const priority = normalizePriority(searchParams.get(QS.priority));
        const categoryId = normalizeCategoryId(searchParams.get(QS.categoryId));

        const dateFromISO = searchParams.get(QS.dateFrom);
        const dateToISO = searchParams.get(QS.dateTo);
        const dateFrom = tryParseDateISO(dateFromISO);
        const dateTo = tryParseDateISO(dateToISO);

        const orderBy = normalizeOrderBy(searchParams.get(QS.orderBy));
        const orderDir = normalizeOrderDir(searchParams.get(QS.orderDir));

        const page = normalizePage(searchParams.get(QS.page));
        const pageSize = normalizePageSize(searchParams.get(QS.pageSize));

        return { text, status, priority, categoryId, dateFrom, dateTo, orderBy, orderDir, page, pageSize };
    }, [searchParams]);

    // Input SearchBox - debounced URL

    const [textInput, setTextInput] = React.useState<string>(urlState.text);
    const debouncedText = useDebounce(textInput, 400);

    React.useEffect(() => {
        setTextInput(urlState.text);
    }, [urlState.text]);

    React.useEffect(() => {
        const next = new URLSearchParams(searchParams);
        setOrDelete(next, QS.text, debouncedText.trim() || "");
        next.set(QS.page, "1");
        setSearchParams(next, { replace: true });
    }, [debouncedText]);

    const refresh = React.useCallback(() => {
        const next = new URLSearchParams(searchParams);
        next.set("_r", String(Date.now()));
        setSearchParams(next, { replace: true });

    }, [searchParams, setSearchParams]);

    // Data state

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [items, setItems] = React.useState<ITicket[]>([]);
    const [total, setTotal] = React.useState<number>(0);

    // delete dialog
    const [deleteTarget, setDeleteTarget] = React.useState<ITicket | null>(null);
    const [deleting, setDeleting] = React.useState(false);

    // categories dropdown options
    const [categoryOptions, setCategoryOptions] = React.useState<IDropdownOption[]>([{ key: "", text: "Todas" }]);
    const [catsLoading, setCatsLoading] = React.useState(false);

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setCatsLoading(true);
                const opts = await categoryService.getOptions();
                if (!mounted)
                    return;
                setCategoryOptions([{ key: "", text: "Todas" }, ...opts]);
            }
            catch {
                if (mounted)
                    setCategoryOptions([{ key: "", text: "Todas (error al cargar)" }]);
            }
            finally {
                if (mounted)
                    setCatsLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [categoryService]);

    // Query for service
    const query: ITicketQuery = React.useMemo(() => ({
        page: urlState.page,
        pageSize: urlState.pageSize,
        text: urlState.text?.trim() || undefined,
        status: urlState.status || undefined,
        priority: urlState.priority || undefined,
        categoryId: urlState.categoryId ?? undefined,
        dateFrom: urlState.dateFrom ? toISODateStart(urlState.dateFrom) : undefined,
        dateTo: urlState.dateTo ? toISODateEnd(urlState.dateTo) : undefined,
        orderBy: urlState.orderBy,
        orderDir: urlState.orderDir,
    }), [urlState]);

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await ticketService.search(query);
                if (!mounted)
                    return;
                setItems(res.items);
                setTotal(res.total);
            } catch (e: any) {
                if (!mounted)
                    return;
                setError(e?.message ?? "Error cargando tickets");
                setItems([]);
                setTotal(0);
            }
            finally {
                if (mounted)
                    setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [ticketService, query]);

    // Paginacion
    const totalPages = React.useMemo(() => Math.max(1, Math.ceil((total || 0) / urlState.pageSize)), [total, urlState.pageSize]);
    const page = clampInt(urlState.page, 1, totalPages);
    const canPrev = page > 1;
    const canNext = page < totalPages;

    React.useEffect(() => {
        if (urlState.page !== page) {
            const next = new URLSearchParams(searchParams);
            next.set(QS.page, String(page));
            setSearchParams(next, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // URL update helpers
    const updateFilters = React.useCallback((patch: Partial<{
        status: TicketStatus | "";
        priority: TicketPriority | "";
        categoryId: number | null;
        dateFrom: Date | null;
        dateTo: Date | null;
        pageSize: number;
    }>, replace = false) => {
        const next = new URLSearchParams(searchParams);

        if (patch.status !== undefined) setOrDelete(next, QS.status, patch.status);
        if (patch.priority !== undefined) setOrDelete(next, QS.priority, patch.priority);
        if (patch.categoryId !== undefined) setOrDelete(next, QS.categoryId, patch.categoryId);
        if (patch.dateFrom !== undefined) setOrDelete(next, QS.dateFrom, patch.dateFrom ? patch.dateFrom.toISOString() : "");
        if (patch.dateTo !== undefined) setOrDelete(next, QS.dateTo, patch.dateTo ? patch.dateTo.toISOString() : "");
        if (patch.pageSize !== undefined) setOrDelete(next, QS.pageSize, patch.pageSize);

        next.set(QS.page, "1");
        setSearchParams(next, { replace });
    }, [searchParams, setSearchParams]);

    const updatePage = React.useCallback((nextPage: number) => {
        const next = new URLSearchParams(searchParams);
        next.set(QS.page, String(Math.max(1, nextPage)));
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    // Sorting (only Created/Modified/DueDate)
    const onColumnClick = React.useCallback((ev?: React.MouseEvent<HTMLElement>, col?: IColumn) => {
        const key = (col?.key || "").toLowerCase();
        const mapped = sortableOrderBy[key];
        if (!mapped) return;

        const next = new URLSearchParams(searchParams);
        const currentOb = normalizeOrderBy(next.get(QS.orderBy));
        const currentOd = normalizeOrderDir(next.get(QS.orderDir));

        if (currentOb === mapped) {
            next.set(QS.orderDir, currentOd === "asc" ? "desc" : "asc");
        } else {
            next.set(QS.orderBy, mapped);
            next.set(QS.orderDir, "asc");
        }
        next.set(QS.page, "1");
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    const columns: IColumn[] = React.useMemo(() => {
        const col = (key: string, name: string, minWidth: number, maxWidth?: number, sortable?: boolean): IColumn => ({
            key,
            name,
            minWidth,
            maxWidth,
            isResizable: true,
            isSorted: sortable ? urlState.orderBy === sortableOrderBy[key.toLowerCase()] : false,
            isSortedDescending: sortable ? (urlState.orderBy === sortableOrderBy[key.toLowerCase()] ? urlState.orderDir === "desc" : undefined) : undefined,
            onColumnClick: sortable ? onColumnClick : undefined,
        });

        return [
            col("ticketNumber", "Ticket", 90, 120, false),
            col("title", "Título", 240, 520, false),
            col("category", "Categoría", 160, 240, false),
            col("priority", "Prioridad", 110, 140, false),
            col("status", "Estado", 140, 190, false),
            col("requester", "Solicitante", 170, 260, false),
            col("dueDate", "Vence", 130, 170, true),
            col("created", "Creado", 130, 170, true),
            col("modified", "Modificado", 130, 170, true),
            col("actions", "", 44, 44, false),
        ];
    }, [urlState.orderBy, urlState.orderDir, onColumnClick]);

    const viewItems = React.useMemo(() => {
        return items.map(t => ({
            ...t,
            createdText: t.created ? new Date(t.created).toLocaleString() : "",
            modifiedText: t.modified ? new Date(t.modified).toLocaleString() : "",
            dueDateText: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
        }));
    }, [items]);

    const confirmDelete = React.useCallback(async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            await ticketService.remove(deleteTarget.id);
            setDeleteTarget(null);
            refresh();
        } catch (e: any) {
            setError(e?.message ?? "Error eliminando ticket");
        } finally {
            setDeleting(false);
        }
    }, [deleteTarget, ticketService, refresh]);

    const commandBarItems: ICommandBarItemProps[] = React.useMemo(() => ([
        {
            key: "new",
            text: "Nuevo ticket",
            iconProps: { iconName: "Add" },
            onClick: () => navigate("/tickets/new"),
        },
        {
            key: "refresh",
            text: "Refrescar",
            iconProps: { iconName: "Refresh" },
            onClick: () => refresh(),
        },
        {
            key: "clear",
            text: "Limpiar filtros",
            iconProps: { iconName: "ClearFilter" },
            onClick: () => {
                const next = new URLSearchParams();
                next.set(QS.orderBy, "Created");
                next.set(QS.orderDir, "desc");
                next.set(QS.page, "1");
                next.set(QS.pageSize, "20");
                setSearchParams(next);
            },
        },
    ]), [navigate, refresh, setSearchParams]);

    const onRenderItemColumn = React.useCallback((item: any, index?: number, column?: IColumn) => {
        const t = item as ITicket & { createdText: string; modifiedText: string; dueDateText: string };

        switch (column?.key) {
            case "ticketNumber":
                return <Text>{t.ticketNumber || `#${t.id}`}</Text>;

            case "title":
                return <Text>{t.title}</Text>;

            case "category":
                return <Text>{t.categoryTitle || "-"}</Text>;

            case "priority":
                return (
                    <span style={getPriorityBadge(t.priority)}>
                        <Icon iconName={getPriorityIcon(t.priority)} />
                        {t.priority}
                    </span>
                );

            case "status":
                return (
                    <span style={getStatusBadge(t.status)}>
                        <Icon iconName={getStatusIcon(t.status)} />
                        {t.status}
                    </span>
                );

            case "requester":
                return <Text>{t.requesterTitle || "-"}</Text>;

            case "dueDate": {
                const state = getDueState(t.dueDate);

                const style: IStyle | undefined =
                    state === "overdue"
                        ? { fontWeight: 700, color: theme.palette.redDark }
                        : state === "soon"
                            ? { fontWeight: 700, color: theme.palette.orange }
                            : undefined;

                const label = t.dueDateText || "-";
                const prefix = state === "overdue" ? "⚠ " : state === "soon" ? "⏳ " : "";

                return <Text styles={{ root: style }}>{prefix}{label}</Text>;
            }

            case "created":
                return <Text>{t.createdText || "-"}</Text>;

            case "modified":
                return <Text>{t.modifiedText || "-"}</Text>;

            case "actions": {
                const ticket = t as ITicket;

                const menuProps: IContextualMenuProps = {
                    items: [
                        {
                            key: "view",
                            text: "Ver",
                            iconProps: { iconName: "View" },
                            onClick: () => navigate(`/tickets/${ticket.id}`),
                        },
                        {
                            key: "edit",
                            text: "Editar",
                            iconProps: { iconName: "Edit" },
                            onClick: () => navigate(`/tickets/${ticket.id}/edit`),
                        },
                        {
                            key: "delete",
                            text: "Eliminar",
                            iconProps: { iconName: "Delete" },
                            onClick: () => setDeleteTarget(ticket),
                        },
                    ],
                };

                return (
                    <IconButton
                        iconProps={{ iconName: "More" }}
                        title="Acciones"
                        ariaLabel="Acciones"
                        menuProps={menuProps}
                    />
                );
            }

            default:
                return <Text />;
        }
    }, [navigate]);

    return (
        <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: 12 } }}>
            <Stack horizontal verticalAlign="center" horizontalAlign="space-between">
                <Text variant="xxLarge">Tickets</Text>
                {loading && <Spinner size={SpinnerSize.small} />}
            </Stack>

            <CommandBar items={commandBarItems} />

            {error && (
                <MessageBar messageBarType={MessageBarType.error} isMultiline={false}>
                    {error}
                </MessageBar>
            )}

            {/* Filters */}
            <Stack tokens={{ childrenGap: 10 }}>
                <Stack horizontal wrap tokens={{ childrenGap: 10 }} verticalAlign="end">
                    <SearchBox
                        styles={{ root: { width: 320 } }}
                        placeholder="Buscar..."
                        value={textInput}
                        onChange={(_, v) => setTextInput(v ?? "")}
                        onClear={() => setTextInput("")}
                    />

                    <Dropdown
                        label="Estado"
                        styles={{ root: { width: 200 } }}
                        options={statusOptions}
                        selectedKey={urlState.status}
                        onChange={(_, opt) => updateFilters({ status: (opt?.key as any) ?? "" })}
                    />

                    <Dropdown
                        label="Prioridad"
                        styles={{ root: { width: 180 } }}
                        options={priorityOptions}
                        selectedKey={urlState.priority}
                        onChange={(_, opt) => updateFilters({ priority: (opt?.key as any) ?? "" })}
                    />

                    <Dropdown
                        label="Categoría"
                        styles={{ root: { width: 260 } }}
                        options={categoryOptions}
                        disabled={catsLoading}
                        selectedKey={urlState.categoryId ?? ""}
                        onChange={(_, opt) => {
                            const k = opt?.key;
                            updateFilters({ categoryId: k === "" || k === undefined ? null : Number(k) });
                        }}
                    />

                    <DatePicker
                        label="Desde"
                        firstDayOfWeek={DayOfWeek.Monday}
                        strings={dayPickerStrings}
                        value={urlState.dateFrom ?? undefined}
                        onSelectDate={(d) => updateFilters({ dateFrom: d ?? null })}
                        placeholder="Fecha inicio"
                    />

                    <DatePicker
                        label="Hasta"
                        firstDayOfWeek={DayOfWeek.Monday}
                        strings={dayPickerStrings}
                        value={urlState.dateTo ?? undefined}
                        onSelectDate={(d) => updateFilters({ dateTo: d ?? null })}
                        placeholder="Fecha fin"
                    />
                </Stack>
            </Stack>

            <Separator />

            {/* Table */}
            <ShimmeredDetailsList
                items={viewItems}
                columns={columns}
                enableShimmer={loading}
                selectionMode={SelectionMode.none}
                layoutMode={DetailsListLayoutMode.justified}
                onRenderItemColumn={onRenderItemColumn}
                onItemInvoked={(it: any) => navigate(`/tickets/${(it as ITicket).id}`)}
                setKey="ticketsList"
            />

            {!loading && !error && items.length === 0 && (
                <Text styles={{ root: { opacity: 0.75 } }}>
                    No hay resultados con los filtros actuales.
                </Text>
            )}

            {/* Pagination */}
            <Stack horizontal verticalAlign="center" horizontalAlign="space-between">
                <Text>
                    Mostrando <b>{items.length}</b> de <b>{total}</b>
                </Text>

                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 10 }}>
                    <Text>Página</Text>

                    <IconButton
                        iconProps={{ iconName: "ChevronLeft" }}
                        disabled={!canPrev}
                        onClick={() => updatePage(page - 1)}
                        title="Anterior"
                        ariaLabel="Anterior"
                    />

                    <Text>
                        <b>{page}</b> / {totalPages}
                    </Text>

                    <IconButton
                        iconProps={{ iconName: "ChevronRight" }}
                        disabled={!canNext}
                        onClick={() => updatePage(page + 1)}
                        title="Siguiente"
                        ariaLabel="Siguiente"
                    />

                    <Dropdown
                        label="Tamaño"
                        styles={{ root: { width: 110 } }}
                        options={pageSizeOptions}
                        selectedKey={urlState.pageSize}
                        onChange={(_, opt) => updateFilters({ pageSize: Number(opt?.key ?? 20) })}
                    />
                </Stack>
            </Stack>

            {/* Delete confirmation */}
            <Dialog
                hidden={!deleteTarget}
                onDismiss={() => (deleting ? null : setDeleteTarget(null))}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: "Eliminar ticket",
                    subText: deleteTarget
                        ? `¿Seguro que deseas eliminar "${deleteTarget.title}"? Esta acción no se puede deshacer.`
                        : "",
                }}
            >
                <DialogFooter>
                    <PrimaryButton
                        text={deleting ? "Eliminando..." : "Eliminar"}
                        onClick={confirmDelete}
                        disabled={deleting}
                    />
                    <DefaultButton
                        text="Cancelar"
                        onClick={() => setDeleteTarget(null)}
                        disabled={deleting}
                    />
                </DialogFooter>
            </Dialog>
        </Stack>
    );
};


export default TicketListPage;